import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

import '../less/index.less';

import {COLORS, BRUSH_TYPES,
    GAME_MODE, GAME_OUTCOME} from './enums';

import {
    getCanvas, getContext,
    rgbToStr, rgbSum,
    midPointBtw, getDistance,
    getPolyPath, drawPolygon, joinPolys
} from './utils';


import PbgGame from './game';
import PbgTransitionManager from './transitions';
import levelData from './config';


/* Global state */

const gameState = {
    toolTypeIdx: 0,
    toolOptionIdx: 1,
};

const gameInstance = new PbgGame(levelData);
const transitionManager = new PbgTransitionManager(gameInstance);

let tooltips, canvasScale, canvasSize;
let _$reticle;


/* Initialization & event handlers */

$(document).ready(function () {
    tippy('#help-icon', {
        allowHTML: true,
        maxWidth: 425,
        offset: [0, 15],
        theme: 'purple',
    });

    const $canvas = getCanvas();
    const ctx = getContext();

    canvasSize = parseInt($canvas.attr('height'));
    canvasScale = $canvas.height() / canvasSize;

    initGame();

    $canvas.on('mousedown', function (e) {
        if (gameState.mode != GAME_MODE.playing) return;

        gameState.isDrawing = 1;
        gameState.buffer = [];

        var strokes = gameState.strokes;
        if (!strokes.length) strokes.push([]);

        var pt = getPathPoint($canvas[0], e);
        strokes[strokes.length - 1].push(pt);

        drawPoint(ctx, pt);
        updatePercentAsync();
        $('#strokes').html(strokes.length);
    });

    $canvas.on('mousemove', function (e) {
        updateReticle(e);

        if (!gameState.isDrawing) return;

        var strokes = gameState.strokes;
        var buffer = gameState.buffer;

        var curPos = getPathPoint($canvas[0], e);
        var lastPos = strokes[strokes.length - 1].slice(-1)[0];

        if (!getBrushType().isQuantized) {
            if (getDistance(curPos, lastPos) < 10) {
                buffer.push(curPos);
            } else {
                gameState.buffer = [];
            }
        }

        if (buffer.length > 3) {
            var totals = buffer.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }));
            var avgPos = { x: totals.x / buffer.length, y: totals.y / buffer.length, brushSize: buffer[0].brushSize };

            strokes[strokes.length - 1].splice(-(buffer.length - 1), buffer.length - 1, avgPos);
            gameState.buffer = [curPos];
        }

        strokes[strokes.length - 1].push(curPos);
        redrawGame(ctx);
    });

    $canvas.on('mouseout', function (e) {
        getReticle().hide();
    });

    $(document).on('mouseup', function () {
        gameState.isDrawing = false;
        if (gameState.mode != GAME_MODE.playing) return;

        const {strokes} = gameState;
        if (strokes.length && strokes[strokes.length - 1].length > 0) {
            strokes.push([]);
        }

        updatePercentPainted();
    });

    $(document).keydown((e) => {
        let pressedArrow = true;

        switch (e.which) {
            case 38: // up arrow
                gameState.toolTypeIdx -= 2;
            case 40: // down arrow
                gameState.toolTypeIdx++;
                validateToolType();
                drawToolOptions();
                break;
            case 37: // left arrow
                gameState.toolOptionIdx -= 2;
            case 39: // right arrow
                const sizes = getBrushType().sizes.length;
                gameState.toolOptionIdx = (gameState.toolOptionIdx + 1 + sizes) % sizes;
                updateRadioGroup('toolOption', gameState.toolOptionIdx);
                break;
            case 13: // return key
            case 32: // spacebar
                if (gameState.mode == GAME_MODE.newLevel) {
                    $('#start').click();
                } else if (gameState.mode == GAME_MODE.complete) {
                    $('#retry').click();
                } else if (gameState.mode == GAME_MODE.playing) { // TODO: remove this debugging hack
                    nextChallenge();
                }
                pressedArrow = false;
                break;
            case 27:
                if ([GAME_MODE.playing, GAME_MODE.paused].includes(gameState.mode)) {
                    $('#btn-pause').click();
                }
                break;
            default:
                pressedArrow = false;
                break;
        }

        if (pressedArrow) e.preventDefault();
        drawReticle();
    });

    $('#btn-undo').on('click', () => {
        const {mode, strokes} = gameState;
        const {undosRemaining} = gameInstance.currentChallenge;

        if (mode !== GAME_MODE.playing || !undosRemaining || strokes.length < 2) return;

        strokes.splice(strokes.length - 2, 1);
        gameInstance.currentChallenge.undo();

        redrawGame(ctx);
        updatePercentPainted();
    });

    $('#retry').on('click', () => {
        if (gameState.mode === GAME_MODE.complete) {
            resetGame();
        } else {
            resetGame(true);
        }
        setGameMode(GAME_MODE.starting);
    });

    $('#start').on('click', () => {
        setGameMode(GAME_MODE.starting);
    });

    $('#quit').on('click', () => {
        // TODO: Return to splash screen
        initGame();
    });

    $('.tool')
        .on('mousedown', ({currentTarget}) => {
            const $input = $(currentTarget);
            const inputIdx = $input.index();

            const $group = $input.closest('.tool-group');
            if (!$group.length) return;

            const isRadio = $group.hasClass('radio-group');
            if (isRadio) {
                const groupType = $group.data('group');
                if (groupType === 'toolType') {
                    if (!isToolEnabled(inputIdx)) return;
                    gameState.toolTypeIdx = inputIdx;
                } else {
                    gameState.toolOptionIdx = inputIdx;
                }
                $group.find('.active').removeClass('active');
            }

            $input.addClass('active');

            drawReticle();
            drawToolOptions();
        })
        .on('mouseup mouseout', ({currentTarget}) => {
            const $input = $(currentTarget);
            const $group = $input.closest('.tool-group');

            const isRadio = $group.hasClass('radio-group');
            if (!isRadio) {
                $input.removeClass('active');
            }
        });

    $('#btn-pause').on('click', () => {
        if (gameState.mode === GAME_MODE.playing) {
            setGameMode(GAME_MODE.paused);
        } else if (gameState.mode === GAME_MODE.paused) {
            setGameMode(GAME_MODE.resuming);
        }
    });
    $('#resume').on('click', () => {
        setGameMode(GAME_MODE.resuming);
    });

    gameInstance.timer.on('clocked', () => {
        gameInstance.outcome = GAME_OUTCOME.clocked;
        setGameMode(GAME_MODE.complete);
    })
});


/* Helper functions */

function getBrushType() {
    return BRUSH_TYPES[gameState.toolTypeIdx];
}

function getBrushSize(asDiameter) {
    const brushType = getBrushType();
    const {sizes, sides, isQuantized} = brushType;
    let size = sizes[gameState.toolOptionIdx];

    if (isQuantized && !asDiameter) size = size / (Math.cos(Math.PI / sides) * 2);
    return size;
}

function getBrushSides() {
    return getBrushType().sides;
}

function getBrushColor() {
    return getBrushType().color;
}

function isStarred() {
    return getBrushType().starred;
}

function randomAffirmation() {
    var affirmations = ['Nice job!', 'Awesome!', '100%', 'Nailed it!'];
    return affirmations[Math.floor(Math.random() * affirmations.length)];
}

function getPathPoint(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    let x = (e.clientX - rect.left) / canvasScale;
    let y =(e.clientY - rect.top) / canvasScale;
    let brushSize = getBrushSize();

    if (getBrushType().isQuantized) {
        const diameter = getBrushSize(true);
        x = (Math.floor(x / diameter) + .5) * diameter;
        y = (Math.floor(y / diameter) + .5) * diameter;
        // brushSize *= 1.01; // Prevent thin blank borders between quantized strokes
    }

    return {
        x, y,
        brushSize,
        brushSides: getBrushSides(),
        starred: isStarred()
    };
}


/* Logic functions */

function analyzeCanvas() {
    // TODO: only 1/4 canvas at a time? either by region or modulus?
    var ctx = getContext();
    var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data; // R, G, B, A, R, G, B, etc.

    var totals = {
        unpainted: 0,
        painted: 0,
        spill: 0,
        canvas: 0
    }

    const unpaintedSum = rgbSum(COLORS.white);
    const paintedSum = rgbSum(getBrushColor());
    const spillSum = rgbSum(COLORS.spill);
    const bgSum = rgbSum(gameInstance.bgColor);

    for (var i = 0; i < imageData.length; i += 4) {
        switch (rgbSum(imageData, i)) {
            case unpaintedSum:
                totals.unpainted++;
                break;
            case paintedSum:
                totals.painted++;
                break;
            case spillSum:
                totals.spill++;
                break;
            case bgSum:
                totals.canvas++;
                break;
        }
    }

    return totals;
}

function updatePercentPainted() {
    const canvasData = analyzeCanvas();
    const maxSpill = gameInstance.currentChallenge.maxSpill;

    let percent, spill;
    if (COLORS.spill) {
        percent = canvasData.painted / (canvasData.painted + canvasData.unpainted);
        spill = canvasData.spill;
    } else {
        percent = (gameState.maxShape - canvasData.unpainted) / gameState.maxShape;
        spill = gameState.maxCanvas - canvasData.canvas;
    }

    const $fill = $('#percent-painted .slider-fill');
    $fill.css('height', `${percent * 98.6}%`);

    let bottom;
    if (spill >= maxSpill) {
        bottom = 'calc(100% - 17px)';
    } else {
        bottom =  `calc(${95.5 * spill / maxSpill}% + 2px)`;
    }

    const $spillSlider = $('#spill-warning .slider-mark');
    $spillSlider.css({bottom});

    if (gameState.mode != GAME_MODE.playing) return;
    else if (spill >= maxSpill) {
        $spillSlider.css('background-color', 'red');
        gameInstance.outcome = GAME_OUTCOME.transgressed;
        setGameMode(GAME_MODE.complete);
    }
    else if (percent >= 1 && gameState.mode == GAME_MODE.playing) {
        $fill.css('background-color', '#0f0');
        $fill.css('border-radius', '6px');
        nextChallenge();
    }
}

function resetPercentPainted() {
    $('#spill-warning .slider-mark').css('bottom', '2px');
    $('#percent-painted .slider-fill').css('height', '0%');
    gameInstance.resetDom();
}

function nextChallenge() {
    gameInstance.nextChallenge();

    if (gameInstance.currentLevel.challengeIdx == gameInstance.currentLevel.challenges.length) {
        gameInstance.outcome = GAME_OUTCOME.passed;
        setGameMode(GAME_MODE.complete);
    } else {
        setGameMode(GAME_MODE.transitioning);
    }
}

function updatePercentAsync() {
    setTimeout(updatePercentPainted, 0);
}


/* Setup functions */

function initGame() {
    setGameMode(GAME_MODE.newLevel);
}

function resetGame(onlyChallenge) {
    resetState();

    if (onlyChallenge) {
        gameInstance.resetDom();
        gameInstance.drawChallenge();
    } else {
        // Facilitate testing specific challenges via query param
        const searchParams = new URLSearchParams(location.search);
        const startingChallenge = parseInt(searchParams.get('c') || 0);

        gameInstance.resetAll();
        gameState.challengeIndex = startingChallenge;

        initChallenge();
    }

    updatePercentPainted();

    gameInstance.currentChallenge.updateUndoStatus();
    updateBlurLayer();

    gameInstance.timer.reset();
}

function resetState() {
    gameState.strokes = [];
    gameState.isDrawing = 0;
    gameInstance.resetCurrent();
}

function initChallenge() {
    gameInstance.timer.timeLimit = gameInstance.currentChallenge.timeLimit;
    gameState.enabledTools = gameInstance.currentChallenge.enabledTools;

    validateToolType();

    $('#game-wrapper').css('background-color', rgbToStr(gameInstance.bgColor));
    $('#percent-painted .slider-fill').css('background-color', rgbToStr(getBrushColor()));

    drawReticle();
    drawToolOptions();
    // setTooltips(gameInstance.levelIdx);

    gameInstance.drawChallenge();

    const canvasData = analyzeCanvas();
    gameState.maxShape = canvasData.unpainted;
    gameState.maxCanvas = canvasData.canvas;
}

// TODO: update for Kidpix UI
function setTooltips(level) {
    tooltips?.forEach((tooltip) => tooltip.destroy());

    $('.tool-wrapper').each(function (toolIndex) {
        $(this).find('.tool-option').each(function (optionIndex) {
            var enabled = gameState.enabledOptions[toolIndex][optionIndex];
            $(this).toggleClass('disabled', !enabled);
            if (enabled) {
                $(this).removeAttr('data-tippy-content');
            } else {
                // $(this).attr('data-tippy-content', LEVEL_DATA[gameState.level].tooltips[toolIndex][optionIndex]);
            }
        });
    });

    tooltips = tippy('.tool-option[data-tippy-content]', {
        placement: 'bottom',
        maxWidth: '150px',
        theme: 'gray',
    });
}

function setupContext(ctx, type) {
    switch (type) {
        case 'painting':
            ctx.lineJoin = ctx.lineCap = 'round';
            ctx.strokeStyle = ctx.fillStyle = rgbToStr(getBrushColor());
            ctx.globalCompositeOperation = 'darken';
            break;
        case 'transition':
            ctx.lineJoin = ctx.lineCap = 'round';
            ctx.lineWidth = 90; // should divide canvasSize evenly
            ctx.strokeStyle = ctx.fillStyle = rgbToStr(COLORS.purple);
            ctx.globalCompositeOperation = 'source-over';
        default:
            break;
    }
}

function setGameMode(mode) {
    const $body = $('body');
    switch (mode) {
        case GAME_MODE.newLevel:
            gameInstance.setLevelTitle()
            gameInstance.setStartText();

            $('#start').html(`START LEVEL ${gameInstance.levelIdx + 1}`);
            updateModeClass(mode);

            $body.addClass('show-overlay show-blur');
            resetGame();
            break;
        case GAME_MODE.starting:
            $body.removeClass('show-overlay');
            showCountdown(0, { // TODO: change back to 3
                callback: () => {
                    flashStationary('Paint!', 1000, 400);
                    transitionManager.fadeIn({
                        delay: .75,
                        callback: () => {
                            updateModeClass();
                            gameInstance.timer.restart();
                            setGameMode(GAME_MODE.playing);
                        }
                    });
                },
                delay: 900,
            });
            break;
        case GAME_MODE.playing:
            getReticle().hide(); // hide until mouse move reveals
            $('#retry').html('RETRY DRAWING')
            updateModeClass(mode);
            break;
        case GAME_MODE.transitioning:
            pauseGame();
            updateModeClass(mode);

            setTimeout(() => transitionManager.wipeOut(() => {
                resetPercentPainted();

                initChallenge();
                resetState();
                gameInstance.currentChallenge.updateUndoStatus();

                transitionManager.wipeIn(() => {
                    gameInstance.timer.restart();
                    setGameMode(GAME_MODE.playing);
                });
            }), 1000);

            flashExpanding(randomAffirmation(), 800, { hold: 400, styling: 'small', expand: 200 });
            break;
        case GAME_MODE.paused:
            pauseGame(true);

            $('#overlay-title').html('PAUSED');

            updateModeClass(mode);
            $body.addClass('show-overlay show-blur');
            break;
        case GAME_MODE.resuming:
            $body.removeClass('show-overlay show-blur');
            fadeIn({
                callback: () => {
                    updateModeClass();
                    gameInstance.timer.restart(false);
                    setGameMode(GAME_MODE.playing);
                },
            });
            break;
        case GAME_MODE.complete:
            pauseGame(true);

            gameInstance.setEndText();

            const passed = (gameInstance.outcome === GAME_OUTCOME.passed);
            $('#retry').html(passed ? 'PLAY AGAIN' : `RETRY LEVEL ${gameInstance.levelIdx + 1}`);

            updateModeClass(mode);
            $body.addClass('show-blur show-overlay');
        default:
            break;
    }

    gameState.mode = mode;
}

function updateModeClass(mode) {
    const $body = $('body');
    $body.removeClass((_idx, allClasses) => allClasses.split(' ').filter((className) => className.includes('mode-')).join(' '));
    if (mode !== undefined) $body.addClass(`mode-${mode}`);
}


/* Timer and time-based animations */

function pauseGame(withBlur) {
    gameState.isDrawing = false;
    gameInstance.timer.pause();

    if (withBlur) {
        updateBlurLayer();
    }
}

function updateBlurLayer() {
    const $blurredGame = $('#blurred-game');
    const blurredCtx = getContext($blurredGame);
    blurredCtx.drawImage(getCanvas()[0], 0, 0);
}

function flashExpanding(message, duration, options) {
    var options = options || {};
    var hold = options.hold || 200;
    var className = 'flash ' + options.styling;
    var expand = options.expand || 350;

    var $gameCell = $('td#main');
    var $number = $('<div></div>').addClass(className).html(message);
    $gameCell.append($number);
    setTimeout(() => $number.animate({ 'font-size': `+=${expand}`, opacity: 0 }, duration - hold, () => $number.remove()), hold);
}

function flashStationary(message, duration, fade) {
    var fade = fade || 1000;
    var $gameCell = $('td#main');
    var $number = $('<div></div>').addClass('flash').html(message);
    $gameCell.append($number);
    setTimeout(() => $number.animate({ opacity: 0 }, fade, () => $number.remove()), duration - fade);
}

function showCountdown(count, options) {
    let {delay, callback} = options;

    if (delay) options.delay = 0;
    else delay = 0;

    setTimeout(() => {
        if (count > 0) {
            flashExpanding(count, 1200);
            setTimeout(() => showCountdown(count - 1, options), 1000);
        } else if (callback) callback();
    }, delay);
}


/* Tool options & selectors */

function drawToolOptions() {
    var enabledColor = rgbToStr(COLORS.enabledOption);
    var disabledColor = rgbToStr(COLORS.disabledOption);

    // draw brush size

    var sides = getBrushSides();
    var size = sides ? 5 : 4;
    var starred = isStarred();

    $('#footer canvas').each(function (index) {
        var $canvas = $(this);
        var ctx = getContext($canvas);
        ctx.clearRect(0, 0, $canvas.width(), $canvas.height());

        var centerX = $canvas.width() / 2;
        var centerY = centerX;

        if (!sides) {
            ctx.fillStyle = enabledColor;
            ctx.beginPath();
            ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
            ctx.fill();
            size += 6;
        } else {
            var centerX = $canvas.width() / 2;
            var centerY = centerX;
            if (sides == 5) centerY += 1;
            drawPolygon(ctx, centerX, centerY, sides, size, { style: 'fill', color: enabledColor, starred: starred });
            size += 7;
        }
    });

    // draw brush shape

    var sideValues = BRUSH_TYPES.map(v => v.sides);

    $('#brush-shape canvas').each(function (index) {
        var optionColor = gameState.enabledOptions[1][index] ? enabledColor : disabledColor;
        var $canvas = $(this);
        var ctx = getContext($canvas);
        ctx.clearRect(0, 0, $canvas.width(), $canvas.height());

        var centerX = $canvas.width() / 2;
        var centerY = centerX;
        size = 13;

        sides = sideValues[index];
        starred = BRUSH_TYPES[index].starred;

        if (!sides) {
            ctx.fillStyle = optionColor;
            ctx.beginPath();
            ctx.arc(centerX, centerY, size - 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            var centerX = $canvas.width() / 2;
            var centerY = centerX;
            if (sides == 5) centerY += 1;
            drawPolygon(ctx, centerX, centerY, sides, size, { style: 'fill', color: optionColor, starred: starred });
        }
    });

    // set tool type color

    $('[data-group="toolType"] .tool').each((idx, el) => {
        const {enabledTools} = gameState;
        $(el).toggleClass('disabled', !enabledTools[idx]);
    });
}

function validateToolType() {
    let {toolTypeIdx: idx, enabledTools} = gameState;
    idx = (idx + enabledTools.length) % enabledTools.length;

    while (!isToolEnabled(idx)) {
        idx = (idx + 1) % enabledTools.length;
    }

    gameState.toolTypeIdx = idx;
    updateRadioGroup('toolType', idx);
}

function isToolEnabled(index) {
    return gameState.enabledTools[index] === 1;
}

function updateRadioGroup(radioGroup, optionIndex) {
    const $tool = $(`.radio-group[data-group=${radioGroup}]`);
    $tool.find('.active').removeClass('active');
    $tool.find(`.tool:eq(${optionIndex})`).addClass('active');
}

function drawReticle() {
    const $reticle = getReticle();
    const ctx = getContext($reticle);

    const rWidth = parseInt($reticle.attr('width'));
    const rHeight = parseInt($reticle.attr('height'));

    ctx.clearRect(0, 0, rWidth, rHeight);
    ctx.lineWidth = 1;

    const centerX = rWidth / 2;
    const centerY = rHeight / 2;

    const brushSize = getBrushSize() * canvasScale;

    const innerColor = rgbToStr(COLORS.innerReticle);
    const outerColor = rgbToStr(COLORS.outerReticle);

    if (!getBrushSides()) {
        ctx.strokeStyle = innerColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, brushSize, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.strokeStyle = outerColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, brushSize + 1, 0, 2 * Math.PI);
        ctx.stroke();
    } else {
        drawPolygon(ctx, centerX, centerY, getBrushSides(), brushSize,
            { style: 'stroke', color: innerColor, starred: isStarred() });
        drawPolygon(ctx, centerX, centerY, getBrushSides(), brushSize + 1,
            { style: 'stroke', color: outerColor, starred: isStarred() });
    }
}

function updateReticle(e) {
    const $reticle = getReticle();
    const reticleSize = $reticle.height();

    if (gameState.mode === GAME_MODE.playing) $reticle.css('display', 'unset');

    const {x, y} = globalToGameCoords(e);
    let top, left;

    if (getBrushType().isQuantized) {
        const brushSize = getBrushSize(true) * canvasScale;
        const reticleBorder = (reticleSize - brushSize) / 2;

        top = Math.floor(y / brushSize) * brushSize - reticleBorder;
        left = Math.floor(x / brushSize) * brushSize - reticleBorder;
    } else {
        top = y - reticleSize / 2;
        left = x - reticleSize / 2;
    }

    $reticle.css({top, left});
}

function globalToGameCoords(e) {
    const gameCanvas = getCanvas()[0];
    const gameRect = gameCanvas.getBoundingClientRect();
    return {
        x: e.clientX - gameRect.left,
        y: e.clientY - gameRect.top + gameCanvas.offsetTop,
    };
}

function getReticle() {
    if (!_$reticle) _$reticle = $('#reticle');
    return _$reticle;
}


/* Basic drawing */

function drawPoint(ctx, pt) {
    setupContext(ctx, 'painting');
    if (!pt.brushSides) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.brushSize, 0, Math.PI * 2);
        ctx.fill();
    } else {
        drawPolygon(ctx, pt.x, pt.y, pt.brushSides, pt.brushSize, { style: 'fill', starred: pt.starred });
    }
}

function drawPath(ctx, pts) {
    var sides = pts[0].brushSides;
    var size = pts[0].brushSize;
    var starred = pts[0].starred;

    if (!sides) {
        var p1 = pts[0];
        var p2 = pts[1];

        ctx.lineWidth = size * 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);

        for (var i = 1; i < pts.length; i++) {
            var midPoint = midPointBtw(p1, p2);
            ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
            p1 = pts[i];
            p2 = pts[i + 1];
        }
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
    } else {
        drawPoint(ctx, pts[0]); // start cap
        for (var i = 0; i < pts.length - 1; i++) {
            var p1 = getPolyPath(pts[i].x, pts[i].y, sides, size, 0, starred);
            var p2 = getPolyPath(pts[i + 1].x, pts[i + 1].y, sides, size, 0, starred);
            joinPolys(ctx, p1, p2);
        }
        drawPoint(ctx, pts[pts.length - 1]); // end cap
    }
}

function redrawGame(ctx) {
    gameInstance.drawChallenge();
    setupContext(ctx, 'painting');

    var total = 0;
    for (var j = 0; j < gameState.strokes.length; j++) {
        var points = gameState.strokes[j];
        total += points.length;

        if (!points.length) continue;
        if (points.length === 1) drawPoint(ctx, points[0]);
        else drawPath(ctx, points);
    }
    if (total % 10 === 0) updatePercentAsync();
}