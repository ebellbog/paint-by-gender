import chroma from 'chroma-js';
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
import PbgCanvas from './canvas';
import PbgTransitionManager from './transitions';
import levelData from './config';


/* Global state */

const pbgGame = new PbgGame(levelData);
const pbgCanvas = new PbgCanvas(pbgGame);
const transitionManager = new PbgTransitionManager(pbgGame);

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
        if (pbgGame.mode != GAME_MODE.playing) return;

        pbgCanvas.startDrawing();

        const strokes = pbgCanvas.strokes;
        if (!strokes.length) strokes.push([]);

        const pt = getPathPoint($canvas[0], e);
        strokes[strokes.length - 1].push(pt);

        drawPoint(ctx, pt);
        updatePercentAsync();
    });

    $canvas.on('mousemove', function (e) {
        updateReticle(e);

        if (!pbgCanvas.isDrawing) return;

        var strokes = pbgCanvas.strokes;
        var buffer = pbgCanvas.buffer;

        var curPos = getPathPoint($canvas[0], e);
        var lastPos = strokes[strokes.length - 1].slice(-1)[0];

        if (!pbgGame.isQuantized) {
            if (getDistance(curPos, lastPos) < 10) {
                buffer.push(curPos);
            } else {
                pbgCanvas.buffer = [];
            }
        }

        if (buffer.length > 3) {
            var totals = buffer.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }));
            var avgPos = { x: totals.x / buffer.length, y: totals.y / buffer.length, brushSize: buffer[0].brushSize };

            strokes[strokes.length - 1].splice(-(buffer.length - 1), buffer.length - 1, avgPos);
            pbgCanvas.buffer = [curPos];
        }

        strokes[strokes.length - 1].push(curPos);
        redrawGame(ctx);
    });

    $canvas.on('mouseout', function (e) {
        getReticle().hide();
    });

    $(document).on('mouseup', function () {
        pbgCanvas.stopDrawing();
        updatePercentPainted();
    });

    $(document).keydown((e) => {
        let pressedArrow = true;

        switch (e.which) {
            case 38: // up arrow
                pbgGame.toolTypeIdx -= 2;
            case 40: // down arrow
                pbgGame.toolTypeIdx++;
                validateToolType();
                drawToolOptions();
                break;
            case 37: // left arrow
                pbgGame.toolOptionIdx -= 2;
            case 39: // right arrow
                const sizes = pbgGame.brushType.sizes.length;
                pbgGame.toolOptionIdx = (pbgGame.toolOptionIdx + 1 + sizes) % sizes;
                updateRadioGroup('toolOption', pbgGame.toolOptionIdx);
                break;
            case 13: // return key
            case 32: // spacebar
                if (pbgGame.mode == GAME_MODE.newLevel) {
                    $('#start').click();
                } else if (pbgGame.mode == GAME_MODE.complete) {
                    $('#retry').click();
                } else if (pbgGame.mode == GAME_MODE.playing) { // TODO: remove this debugging hack
                    nextChallenge();
                }
                pressedArrow = false;
                break;
            case 27:
                if ([GAME_MODE.playing, GAME_MODE.paused].includes(pbgGame.mode)) {
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
        const {strokes} = pbgCanvas;
        const {undosRemaining} = pbgGame.currentChallenge;

        if (pbgGame.mode !== GAME_MODE.playing || !undosRemaining || strokes.length < 2) return;

        strokes.splice(strokes.length - 2, 1);
        pbgGame.currentChallenge.undo();

        redrawGame(ctx);
        updatePercentPainted();
    });

    $('#retry').on('click', () => {
        if (pbgGame.mode === GAME_MODE.complete) {
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
                    if (!pbgGame.isToolEnabled(inputIdx)) return;
                    pbgGame.toolTypeIdx = inputIdx;
                } else {
                    pbgGame.toolOptionIdx = inputIdx;
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
        if (pbgGame.mode === GAME_MODE.playing) {
            setGameMode(GAME_MODE.paused);
        } else if (pbgGame.mode === GAME_MODE.paused) {
            setGameMode(GAME_MODE.resuming);
        }
    });
    $('#resume').on('click', () => {
        setGameMode(GAME_MODE.resuming);
    });

    pbgGame.timer.on('clocked', () => {
        pbgGame.outcome = GAME_OUTCOME.clocked;
        setGameMode(GAME_MODE.complete);
    })
});


/* Helper functions */

function randomAffirmation() {
    const affirmations = ['Nice job!', 'Awesome!', '100%', 'Nailed it!'];
    return affirmations[Math.floor(Math.random() * affirmations.length)];
}

function getPathPoint(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    let x = (e.clientX - rect.left) / canvasScale;
    let y =(e.clientY - rect.top) / canvasScale;
    let brushSize = pbgGame.brushSize;

    if (pbgGame.isQuantized) {
        const diameter = pbgGame.brushDiameter;
        x = (Math.floor(x / diameter) + .5) * diameter;
        y = (Math.floor(y / diameter) + .5) * diameter;
        // brushSize *= 1.01; // Prevent thin blank borders between quantized strokes
    }

    return {
        x, y,
        brushSize,
        brushSides: pbgGame.brushSides,
        starred: pbgGame.isStarred
    };
}


/* Logic functions */

function updatePercentPainted() {
    if (!pbgGame.currentChallenge || pbgGame.mode !== GAME_MODE.playing) return;

    const canvasData = pbgCanvas.analyze();
    const maxSpill = pbgGame.currentChallenge.maxSpill;

    let percent, spill;
    if (COLORS.spill) {
        percent = canvasData.painted / (canvasData.painted + canvasData.unpainted);
        spill = canvasData.spill;
    } else {
        percent = (pbgCanvas.maxShape - canvasData.unpainted) / pbgCanvas.maxShape;
        spill = pbgCanvas.maxBg - canvasData.canvas;
    }

    const $fill = $('#percent-painted .slider-fill');
    $fill.css('height', `${percent * 100}%`);

    const spillPercent = Math.min(spill / maxSpill, 1);

    const $spillWarning = $('#spill-warning .slider-wrapper');
    const $spillSlider = $('#spill-warning .slider-mark');
    const totalSpillHeight = $spillWarning.height() - $spillSlider.height();

    $spillSlider.css('bottom', `${spillPercent * totalSpillHeight}px`);

    const chromaScale = chroma.scale(['red', 'yellow', 'limegreen']);
    const color = chromaScale(1 - spillPercent).toString();
    $spillSlider.find('.mark-color').css({backgroundColor: color});

    $spillWarning.toggleClass('danger', spillPercent > .75 && spillPercent !== 1 && percent < 1);
    if (spillPercent === 1) {
        $spillWarning.addClass('transgressed');
        pbgGame.outcome = GAME_OUTCOME.transgressed;
        setGameMode(GAME_MODE.complete);
    }
    else if (percent >= 1 && pbgGame.mode === GAME_MODE.playing) {
        $fill.css('background-color', '#0f0');
        nextChallenge();
    }
}

function updatePercentAsync() {
    setTimeout(updatePercentPainted, 0);
}

function resetPercentPainted() {
    $('#spill-warning .slider-wrapper')
        .removeClass('danger transgressed')
        .find('.slider-mark')
        .css('bottom', '0%')
        .find('.mark-color')
        .css('background-color', 'limegreen');
    $('#percent-painted .slider-fill').css('height', '0%');
}

function nextChallenge() {
    pbgGame.nextChallenge();

    if (pbgGame.currentLevel.challengeIdx == pbgGame.currentLevel.challenges.length) {
        pbgGame.outcome = GAME_OUTCOME.passed;
        setGameMode(GAME_MODE.complete);
    } else {
        setGameMode(GAME_MODE.transitioning);
    }
}


/* Setup functions */

function initGame() {
    setGameMode(GAME_MODE.newLevel);
}

function resetGame(onlyChallenge) {
    pbgCanvas.reset();
    resetPercentPainted();

    if (onlyChallenge) {
        pbgGame.resetCurrent();
        pbgGame.drawChallenge();
    } else {
        pbgGame.resetAll();

        // Facilitate testing specific challenges via query param
        const searchParams = new URLSearchParams(location.search);
        const startingChallenge = parseInt(searchParams.get('c'));
        if (startingChallenge) {
            pbgGame.currentLevel.challengeIdx = startingChallenge;
        }

        initChallenge();
    }

    updateBlurLayer();
    pbgGame.timer.reset();
}

function initChallenge() {
    pbgGame.timer.timeLimit = pbgGame.currentChallenge.timeLimit;

    validateToolType();

    $('#game-wrapper').css('background-color', rgbToStr(pbgGame.bgColor));
    $('#percent-painted .slider-fill').css('background-color', rgbToStr(pbgGame.brushColor));

    drawReticle();
    drawToolOptions();
    // setTooltips(gameInstance.levelIdx);

    pbgGame.drawChallenge();
    pbgCanvas.updateMaxCounts();
}

// TODO: update for Kidpix UI
function setTooltips(level) {
    tooltips?.forEach((tooltip) => tooltip.destroy());

    $('.tool-wrapper').each(function (toolIndex) {
        $(this).find('.tool-option').each(function (optionIndex) {
            // var enabled = gameState.enabledOptions[toolIndex][optionIndex];
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

function setGameMode(mode) {
    const $body = $('body');
    switch (mode) {
        case GAME_MODE.newLevel:
            pbgGame.setLevelTitle()
            pbgGame.setStartText();

            $('#start').html(`START LEVEL ${pbgGame.levelIdx + 1}`);
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
                            pbgGame.timer.restart();
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

                pbgCanvas.reset();
                pbgGame.resetCurrent();

                initChallenge();

                transitionManager.wipeIn(() => {
                    pbgGame.timer.restart();
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
            transitionManager.fadeIn({
                callback: () => {
                    updateModeClass();
                    pbgGame.timer.restart(false);
                    setGameMode(GAME_MODE.playing);
                },
            });
            break;
        case GAME_MODE.complete:
            pauseGame(true);

            pbgGame.setEndText();

            const passed = (pbgGame.outcome === GAME_OUTCOME.passed);
            $('#retry').html(passed ? 'PLAY AGAIN' : `RETRY LEVEL ${pbgGame.levelIdx + 1}`);

            updateModeClass(mode);
            $body.addClass('show-blur show-overlay');
        default:
            break;
    }

    pbgGame.mode = mode;
}

function updateModeClass(mode) {
    const $body = $('body');
    $body.removeClass((_idx, allClasses) => allClasses.split(' ').filter((className) => className.includes('mode-')).join(' '));
    if (mode !== undefined) $body.addClass(`mode-${mode}`);
}


/* Timer and time-based animations */

function pauseGame(withBlur) {
    pbgCanvas.isDrawing = false;
    pbgGame.timer.pause();

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
    options = options || {};

    const hold = options.hold || 200;
    const className = 'flash ' + options.styling;
    const expand = options.expand || 350;

    const $number = $('<div></div>')
        .addClass(className)
        .html(message)
        .appendTo('td#main');

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
    const starred = pbgGame.isStarred;
    const sides = pbgGame.brushSides;
    let size = sides ? 5 : 4;

    $('#footer canvas').each((_idx, canvas) => {
        const $canvas = $(canvas);
        const ctx = getContext($canvas);
        ctx.clearRect(0, 0, $canvas.width(), $canvas.height());

        let centerX = $canvas.width() / 2;
        let centerY = centerX;

        if (!sides) {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
            ctx.fill();
            size += 6;
        } else {
            centerX = $canvas.width() / 2;
            centerY = centerX;
            if (sides == 5) centerY += 1;
            drawPolygon(ctx, centerX, centerY, sides, size, {style: 'fill', color: 'white', starred: starred});
            size += 7;
        }
    });

    $('[data-group="toolType"] .tool').each((idx, el) => {
        $(el).toggleClass('disabled', !pbgGame.isToolEnabled(idx));
    });
}

function validateToolType() {
    const numTools = BRUSH_TYPES.length;

    let {toolTypeIdx: idx} = pbgGame;
    idx = (idx + numTools) % numTools;

    while (!pbgGame.isToolEnabled(idx)) {
        idx = (idx + 1) % numTools;
    }

    pbgGame.toolTypeIdx = idx;
    updateRadioGroup('toolType', idx);
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

    const brushSize = pbgGame.brushSize * canvasScale;

    const innerColor = rgbToStr(COLORS.innerReticle);
    const outerColor = rgbToStr(COLORS.outerReticle);

    const brushSides = pbgGame.brushSides;
    if (!brushSides) {
        ctx.strokeStyle = innerColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, brushSize, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.strokeStyle = outerColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, brushSize + 1, 0, 2 * Math.PI);
        ctx.stroke();
    } else {
        const isStarred = pbgGame.isStarred;
        drawPolygon(ctx, centerX, centerY, brushSides, brushSize,
            { style: 'stroke', color: innerColor, starred: isStarred });
        drawPolygon(ctx, centerX, centerY, brushSides, brushSize + 1,
            { style: 'stroke', color: outerColor, starred: isStarred });
    }
}

function updateReticle(e) {
    const $reticle = getReticle();
    const reticleSize = $reticle.height();

    if (pbgGame.mode === GAME_MODE.playing) $reticle.css('display', 'unset');

    const {x, y} = globalToGameCoords(e);
    let top, left;

    if (pbgGame.isQuantized) {
        const brushSize = pbgGame.brushDiameter * canvasScale;
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
    pbgCanvas.setupContext(pbgGame.brushColor);
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
    pbgGame.drawChallenge();
    pbgCanvas.setupContext(pbgGame.brushColor);

    var total = 0;
    for (var j = 0; j < pbgCanvas.strokes.length; j++) {
        var points = pbgCanvas.strokes[j];
        total += points.length;

        if (!points.length) continue;
        if (points.length === 1) drawPoint(ctx, points[0]);
        else drawPath(ctx, points);
    }
    if (total % 10 === 0) updatePercentAsync();
}