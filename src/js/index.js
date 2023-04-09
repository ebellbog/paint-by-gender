import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

import '../less/index.less';

import {COLORS, BRUSH_TYPES,
    LEVEL_DATA, CHALLENGE_DATA,
    GAME_MODE, GAME_OUTCOME} from './enums';

import {
    getCanvas, getContext,
    rgbToStr, rgbSum,
    midPointBtw, getDistance,
    getPolyPath, drawPolygon, joinPolys
} from './utils';

import ALL_LEVELS from './config'; // Just for smoke testing right now
import PbgTimer from './timer';


/* Global state */

const gameState = {
    level: 1,
    challengeIndex: 0,
    toolTypeIdx: 0,
    toolOptionIdx: 1,
    timer: new PbgTimer(),
};

let tooltips, canvasScale, canvasSize;
let _$reticle;


/* Initialization & event handlers */

$(document).ready(function () {
    console.log(ALL_LEVELS[0].levelName);

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

        var strokes = gameState.strokes;
        if (strokes.length && strokes[strokes.length - 1].length > 0) {
            strokes.push([]);
            updateUndoStatus();
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
            default:
                pressedArrow = false;
                break;
        }

        if (pressedArrow) e.preventDefault();
        drawReticle();
    });

    $('#btn-undo').on('click', () => {
        const {mode, strokes, undosRemaining} = gameState;
        if (mode !== GAME_MODE.playing || !undosRemaining || strokes.length < 2) return;

        strokes.splice(strokes.length - 2, 1);

        gameState.undosRemaining--;
        updateUndoStatus();

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

    gameState.timer.on('clocked', () => {
        gameState.outcome = GAME_OUTCOME.clocked;
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

function isStarred() {
    return getBrushType().starred;
}

function getChallengeData(level, challengeIndex) {
    return CHALLENGE_DATA[LEVEL_DATA[level].challenges[challengeIndex]];
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

function updateUndoStatus() {
    const {undosRemaining} = gameState;
    $('#btn-undo').toggleClass('disabled', undosRemaining < 1);

    const $undoStatus = $('#undo-status');
    $undoStatus.empty();
    for (let i = 0; i < 3; i++) { // TOOD: maxUndos
        $undoStatus.append(
            $('<div></div>').addClass(`status-icon status-${i < undosRemaining ? 'filled' : 'empty'}`)
        );
    }
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

    for (var i = 0; i < imageData.length; i += 4) {
        switch (rgbSum(imageData, i)) {
            case rgbSum(COLORS.white):
                totals.unpainted++;
                break;
            case rgbSum(COLORS.paint):
                totals.painted++;
                break;
            case rgbSum(COLORS.spill):
                totals.spill++;
                break;
            case rgbSum(COLORS.canvas):
                totals.canvas++;
                break;
        }
    }

    return totals;
}

function updatePercentPainted() {
    var canvasData = analyzeCanvas();

    var percent, spill, maxSpill;
    if (COLORS.spill) {
        percent = canvasData.painted / (canvasData.painted + canvasData.unpainted);
        spill = canvasData.spill;
        maxSpill = 12000;
    } else {
        percent = (gameState.maxShape - canvasData.unpainted) / gameState.maxShape;
        spill = gameState.maxCanvas - canvasData.canvas;
        maxSpill = 7000; // TODO: this number should be level- AND challenge-dependent
    }

    var $slider = $('#percent-painted .slider-outline');
    var height = $slider.height();
    var $fill = $('#percent-painted .slider-fill');
    $fill.css('height', height * percent);

    var bottom;
    if (spill >= maxSpill) {
        bottom = height - 10;
    } else {
        bottom = (height - 10) * spill / maxSpill + 2;
    }

    var $spillSlider = $('#spill-warning .slider-mark');
    $spillSlider.css({bottom});

    if (gameState.mode != GAME_MODE.playing) return;
    else if (spill >= maxSpill) {
        $spillSlider.css('background-color', 'red');
        gameState.outcome = GAME_OUTCOME.transgressed;
        setGameMode(GAME_MODE.complete);
    }
    else if (percent >= 1 && gameState.mode == GAME_MODE.playing) {
        $fill.css('background-color', '#0f0');
        $fill.css('border-radius', '6px');
        nextChallenge();
    }
}

function nextChallenge() {
    gameState.challengeIndex += 1;
    if (gameState.challengeIndex == LEVEL_DATA[gameState.level].challenges.length) {
        gameState.outcome = GAME_OUTCOME.passed;
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
    // TODO: handle more of this with CSS classes
    $('#percent-painted .slider-fill').css('border-radius', '0px 0px 6px 6px');
    $('#spill-warning .slider-mark').css('background-color', 'rgba(50, 50, 50, 0.6');

    resetState();

    if (onlyChallenge) {
        drawChallenge(gameState.level, gameState.challengeIndex);
    } else {
        // Facilitate testing specific challenges via query param
        const searchParams = new URLSearchParams(location.search);
        const startingChallenge = parseInt(searchParams.get('c') || 0);

        gameState.challengeIndex = startingChallenge;
        initChallenge(gameState.level, startingChallenge);
    }

    updatePercentPainted();

    updateUndoStatus();
    updateBlurLayer();

    gameState.timer.reset();
}

function updateLevelIcon(level, challengeIndex) {
    var $iconWrapper = $('#level-icon-wrapper');
    var faClasses = 'fa-xs fa-fw fa-circle';

    var $circle = $(document.createElement('i')).addClass(faClasses);
    var $openCircle = $circle.clone().addClass('far');
    var $closedCircle = $circle.clone().addClass('fas');

    $iconWrapper.empty();
    for (var i = 0; i < LEVEL_DATA[level].challenges.length; i++) {
        $iconWrapper.append(i <= challengeIndex ? $closedCircle.clone() : $openCircle.clone());
    }
}

function resetState() {
    gameState.strokes = [];
    gameState.isDrawing = 0;
    gameState.undosRemaining = 3;
    gameState.timer.reset();
}

function initChallenge(level, challengeIndex) {
    var CHALLENGE_DATA = getChallengeData(level, challengeIndex);
    COLORS.paint = CHALLENGE_DATA.paintColor;
    COLORS.canvas = CHALLENGE_DATA.canvasColor;
    COLORS.spill = CHALLENGE_DATA.spillColor;

    $('#game-wrapper').css('background-color', rgbToStr(COLORS.canvas));
    $('#percent-painted .slider-fill').css('background-color', rgbToStr(COLORS.paint));

    gameState.timer.timeLimit = CHALLENGE_DATA.maxTime;
    gameState.enabledTools = CHALLENGE_DATA.enabledTools;

    validateToolType();
    drawReticle();
    drawToolOptions();
    setTooltips(level);

    updateLevelIcon(level, challengeIndex);
    drawChallenge(level, challengeIndex);

    var canvasData = analyzeCanvas();
    gameState.maxShape = canvasData.unpainted;
    gameState.maxCanvas = canvasData.canvas;
}

function drawChallenge(level, challengeIndex) {
    var challenge = LEVEL_DATA[level].challenges[challengeIndex];

    var ctx = getContext();
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = rgbToStr(COLORS.canvas);
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = rgbToStr(COLORS.white);

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 3.5;

    let xoff, yoff;

    switch (challenge) {
        case 1: // Design: Body/toy curves
            xoff = -100;
            yoff = -20;

            ctx.scale(1.35, 1.22);
            ctx.beginPath();

            ctx.moveTo(304 + xoff, 57 + yoff);
            ctx.bezierCurveTo(326 + xoff, 57 + yoff, 335 + xoff, 77 + yoff, 338 + xoff, 91 + yoff);
            ctx.bezierCurveTo(342 + xoff, 113 + yoff, 325 + xoff, 118 + yoff, 328 + xoff, 133 + yoff);
            ctx.bezierCurveTo(331 + xoff, 149 + yoff, 362 + xoff, 160 + yoff, 364 + xoff, 193 + yoff);
            ctx.bezierCurveTo(366 + xoff, 229 + yoff, 341 + xoff, 236 + yoff, 350 + xoff, 259 + yoff);
            ctx.bezierCurveTo(358 + xoff, 279 + yoff, 383 + xoff, 278 + yoff, 385 + xoff, 331 + yoff);
            ctx.bezierCurveTo(386 + xoff, 353 + yoff, 362 + xoff, 417 + yoff, 297 + xoff, 417 + yoff);
            ctx.bezierCurveTo(238 + xoff, 417 + yoff, 207 + xoff, 364 + yoff, 212 + xoff, 324 + yoff);
            ctx.bezierCurveTo(219 + xoff, 272 + yoff, 247 + xoff, 271 + yoff, 250 + xoff, 251 + yoff);
            ctx.bezierCurveTo(253 + xoff, 234 + yoff, 235 + xoff, 223 + yoff, 238 + xoff, 196 + yoff);
            ctx.bezierCurveTo(242 + xoff, 158 + yoff, 279 + xoff, 149 + yoff, 278 + xoff, 131 + yoff);
            ctx.bezierCurveTo(277 + xoff, 119 + yoff, 264 + xoff, 109 + yoff, 267 + xoff, 90 + yoff);
            ctx.bezierCurveTo(269 + xoff, 75 + yoff, 279 + xoff, 58 + yoff, 302 + xoff, 57 + yoff);

            ctx.closePath();
            break;
        case 2: // Design: Heart
            xoff = -15;
            yoff = 5;

            ctx.beginPath();

            // generated at http://www.victoriakirst.com/beziertool/
            ctx.moveTo(289 + xoff, 446 + yoff);
            ctx.bezierCurveTo(197 + xoff, 355 + yoff, 150 + xoff, 316 + yoff, 89 + xoff, 236 + yoff);
            ctx.bezierCurveTo(67 + xoff, 207 + yoff, 77 + xoff, 124 + yoff, 144 + xoff, 100 + yoff);
            ctx.bezierCurveTo(225 + xoff, 71 + yoff, 273 + xoff, 145 + yoff, 291 + xoff, 184 + yoff);
            ctx.bezierCurveTo(296 + xoff, 171 + yoff, 347 + xoff, 60 + yoff, 440 + xoff, 101 + yoff);
            ctx.bezierCurveTo(516 + xoff, 135 + yoff, 500 + xoff, 219 + yoff, 469 + xoff, 248 + yoff);

            ctx.closePath();
            break;
        case 3:
        case 4: // Design: "QR code" squares
            const ss = BRUSH_TYPES[1].sizes[0];
            const ms = BRUSH_TYPES[1].sizes[1];
            const ls = BRUSH_TYPES[1].sizes[2];

            ctx.beginPath();

            ctx.rect(0, 0, ls, ls);
            ctx.rect(ls, canvasSize - 2 * ls, ls, ls);
            ctx.rect(canvasSize - ls * 2, ls, ls, ls);
            ctx.rect(canvasSize - ls, canvasSize - ls, ls, ls);

            ctx.rect(2 * ls - ss, 2 * ls - ss, ls + 2 * ss, ls + 2 * ss);

            ctx.rect(ms, ms, canvasSize - ms * 2, ms);
            ctx.rect(ms, canvasSize - ms * 2, canvasSize - ms * 2, ms);
            ctx.rect(ms, ms * 2, ms, canvasSize - ms * 4);
            ctx.rect(canvasSize - ms * 2, ms * 2, ms, canvasSize - ms * 4);

            break;
        default:
            break;
    }

    ctx.stroke();
    ctx.fill();

    ctx.restore();
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
                $(this).attr('data-tippy-content', LEVEL_DATA[gameState.level].tooltips[toolIndex][optionIndex]);
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
            ctx.strokeStyle = ctx.fillStyle = rgbToStr(COLORS.paint);
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

function setLevelTitle(level) {
    $('#level-number').html(`Level ${level}`);
    $('#level-name').html(LEVEL_DATA[level].name);
}

function setStartText(level) {
    $('#overlay-title').html(`${LEVEL_DATA[level].name}`);
    $('#overlay-body').html(LEVEL_DATA[level].description);
}

function setEndText(outcome, level) {
    const endMessages = LEVEL_DATA[level].endMessages[outcome];
    $('#overlay-title').html(endMessages[0]);
    $('#overlay-body').html(endMessages[1]);
}

function setGameMode(mode) {
    const $body = $('body');
    switch (mode) {
        case GAME_MODE.newLevel:
            setLevelTitle(gameState.level)
            setStartText(gameState.level);

            $('#start').html(`START LEVEL ${gameState.level}`);
            updateModeClass(mode);

            $body.addClass('show-overlay show-blur');
            resetGame();
            break;
        case GAME_MODE.starting:
            $body.removeClass('show-overlay');
            showCountdown(0, { // TODO: change back to 3
                callback: () => {
                    flashStationary('Paint!', 1000, 400);
                    fadeIn({
                        delay: .75,
                        callback: () => {
                            updateModeClass();
                            gameState.timer.restart();
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

            setTimeout(() => wipeOut(() => {
                // TODO: handle more of this with CSS classes
                $('#percent-painted .slider-fill').animate({ height: 0 });
                $('#spill-warning .slider-mark').animate({ bottom: 2 });
                $('#percent-painted .slider-fill').css('border-radius', '0px 0px 6px 6px');

                initChallenge(gameState.level, gameState.challengeIndex);
                resetState();
                updateUndoStatus();

                wipeIn(() => {
                    gameState.timer.restart();
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
                    gameState.timer.restart(false);
                    setGameMode(GAME_MODE.playing);
                },
            });
            break;
        case GAME_MODE.complete:
            pauseGame(true);

            setEndText(gameState.outcome, gameState.level);

            const passed = (gameState.outcome == GAME_OUTCOME.passed);
            $('#retry').html(passed ? 'PLAY AGAIN' : `RETRY LEVEL ${gameState.level}`);

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
    gameState.timer.pause();

    if (withBlur) {
        updateBlurLayer();
    }
}

function updateBlurLayer() {
    const $blurredGame = $('#blurred-game');
    const blurredCtx = getContext($blurredGame);
    blurredCtx.drawImage(getCanvas()[0], 0, 0);
}

function fadeIn(options) {
    const duration = options.duration * 1000 || 750;
    const delay = options.delay * 1000 || 0;
    const {callback} = options;

    setTimeout(function () {
        $('body').removeClass('show-blur');
        if (callback) setTimeout(callback, duration);
    }, delay);
}

function wipeOut(cb, x, y, dir, time, ctx) {
    const BRUSH_SIZE = 90; // should evenly divide canvasSize

    if (y > canvasSize) { if (cb) cb(); return; }

    if (!(x || y || dir || time)) {
        x = - BRUSH_SIZE / 2;
        y = BRUSH_SIZE / 2;
        dir = 1;
        time = Date.now();
    }
    if (!ctx) {
        ctx = getContext();
    }

    var newX = x, newY = y;
    if (x >= canvasSize + BRUSH_SIZE / 2 && dir == 1) {
        dir = -1;
        newY += BRUSH_SIZE;
    } else if (x <= -BRUSH_SIZE / 2 && dir == -1) {
        dir = 1;
        newY += BRUSH_SIZE;
    }

    // using a time coefficient removes duration variability
    // arising from browser speed, hardware, etc.
    var newTime = Date.now();
    var timeCoefficient = Math.max((newTime - time) / 10, 0.1);
    const SPEED_COEFFICIENT = 12;
    newX += dir * timeCoefficient * SPEED_COEFFICIENT;

    setupContext(ctx, 'transition');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(newX, newY);
    ctx.stroke();

    setTimeout(() => wipeOut(cb, newX, newY, dir, newTime, ctx), 0);
}

function wipeIn(cb, y, time, ctx) {
    if (y > canvasSize) { if (cb) cb(); return; }
    if (!(y || time)) {
        y = 0;
        time = Date.now();
    }
    if (!ctx) {
        ctx = getContext();
    }

    // using a time coefficient removes duration variability
    // arising from browser speed, hardware, etc.
    var newTime = Date.now();
    var timeCoefficient = Math.max((newTime - time) / 10, 0.1);
    var speedCoefficient = 3;
    var newY = y + timeCoefficient * speedCoefficient;

    ctx.clearRect(0, 0, canvasSize, canvasSize);
    drawChallenge(gameState.level, gameState.challengeIndex);
    setupContext(ctx, 'transition');
    ctx.fillRect(0, 0, canvasSize, canvasSize - newY);
    setTimeout(() => wipeIn(cb, newY, newTime, ctx), 0);
}

function flashExpanding(message, duration, options) {
    var options = options || {};
    var hold = options.hold || 200;
    var className = 'flash ' + options.styling;
    var expand = options.expand || 350;

    var $gameCell = $('td#main');
    var $number = $(document.createElement('div')).addClass(className).html(message);
    $gameCell.append($number);
    setTimeout(() => $number.animate({ 'font-size': `+=${expand}`, opacity: 0 }, duration - hold, () => $number.remove()), hold);
}

function flashStationary(message, duration, fade) {
    var fade = fade || 1000;
    var $gameCell = $('td#main');
    var $number = $(document.createElement('div')).addClass('flash').html(message);
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
    drawChallenge(gameState.level, gameState.challengeIndex);
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