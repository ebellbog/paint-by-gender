import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

import '../less/index.less';

import '../../img/lipstick.svg';
import '../../img/lipstick_gray.svg';

import {COLORS, BRUSH_TYPES,
    LEVEL_DATA, CHALLENGE_DATA,
    GAME_MODE, GAME_OUTCOME} from './enums';

/* Global state */

const gameState = {
    level: 1,
    challengeIndex: 0,
    timerRunning: 0,
    toolOptions: [1, 0, 0],
};

let tooltips, canvasScale, canvasSize;
let _$reticle, _$gameCanvas;

/* Helper functions */

function getBrushType() {
    return BRUSH_TYPES[gameState.toolOptions[1]];
}

function getBrushSize(asDiameter) {
    const brushType = getBrushType();
    const {sizes, sides, isQuantized} = brushType;
    let size = sizes[gameState.toolOptions[0]];

    if (isQuantized && !asDiameter) size = size / (Math.cos(Math.PI / sides) * 2);
    return size;
}

function getBrushSides() {
    return getBrushType().sides;
}

function isStarred() {
    return getBrushType().starred;
}

function getOptionCount() {
    var $tool = $(`#tools .tool-wrapper:eq(${gameState.toolFocus})`);
    return $tool.find('.tool-option').length;
}

function getChallengeData(level, challengeIndex) {
    return CHALLENGE_DATA[LEVEL_DATA[level].challenges[challengeIndex]];
}

function randomAffirmation() {
    var affirmations = ['Nice job!', 'Awesome!', '100%', 'Nailed it!'];
    return affirmations[Math.floor(Math.random() * affirmations.length)];
}

function rgbToStr(rgbList) {
    return 'rgb(' + rgbList.join(', ') + ')';
}

// significantly faster than reduce
// format: R, G, B, A
function rgbSum(pixelData, start) {
    if (!pixelData) return;
    if (!start) start = 0;
    return pixelData[start] + pixelData[start + 1] + pixelData[start + 2];
}

function midPointBtw(p1, p2) {
    return {
        x: p1.x + (p2.x - p1.x) / 2,
        y: p1.y + (p2.y - p1.y) / 2
    };
}

function getDistance(p1, p2) {
    return Math.pow(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2), 0.5);
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

function getContext($canvas) {
    var ctx = ($canvas || getCanvas())[0].getContext('2d');
    return ctx;
}

function isToolEnabled(index) {
    return LEVEL_DATA[gameState.level].enabledTools[index];
}

/* Logic functions */

function getCanvas() {
    if (!_$gameCanvas) _$gameCanvas = $('#game');
    return _$gameCanvas;
}

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
            case rgbSum(COLORS.shape):
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
        maxSpill = 8000; // TODO: this number should be level- AND challenge-dependent
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

function setupButtons() {
    switch (gameState.mode) {
        case GAME_MODE.newLevel:
            $('#start').html(`START LEVEL ${gameState.level}`).css('display', 'inline-block');
            $('#retry, #undo').css('display', 'none');
            break;
        case GAME_MODE.ready:
            break;
        case GAME_MODE.transitioning:
        case GAME_MODE.starting:
            $('.bottom-btn').addClass('inactive');
            break;
        case GAME_MODE.playing:
            $('#start').css('display', 'none');
            $('#retry')
                .html('RESTART')
                .css({ width: $('#undo').css('width') })
                .removeClass('inactive');
            $('#retry, #undo').css('display', 'inline-block')
            break;
        case GAME_MODE.complete:
            var passed = gameState.outcome == GAME_OUTCOME.passed;
            $('#retry').html(passed ? 'PLAY AGAIN' : `RETRY LEVEL ${gameState.level}`).css({ width: passed ? '150px' : '180px' });
            $('#undo').css('display', 'none');
        default:
            break;
    }
}

function initLevel(level) {
    var enabled = LEVEL_DATA[level].enabledTools;
    $('.option-selector').each(function (index) {
        $(this).toggleClass('disabled', !enabled[index]);
    });

    setLevelTitle(level)
}

function resetLevel(level) {
    // Facilitate testing specific challenges via query param
    const searchParams = new URLSearchParams(location.search);
    const startingChallenge = parseInt(searchParams.get('c') || 0);

    gameState.challengeIndex = startingChallenge;
    initChallenge(level, startingChallenge);
}

function initChallenge(level, challengeIndex) {
    var CHALLENGE_DATA = getChallengeData(level, challengeIndex);
    COLORS.paint = CHALLENGE_DATA.paintColor;
    COLORS.canvas = CHALLENGE_DATA.canvasColor;
    COLORS.spill = CHALLENGE_DATA.spillColor;
    COLORS.shape = CHALLENGE_DATA.shapeColor;

    $('#game-background').css('background-color', rgbToStr(COLORS.canvas));
    $('#percent-painted .slider-fill').css('background-color', rgbToStr(COLORS.paint));

    gameState.maxTime = CHALLENGE_DATA.maxTime;
    gameState.enabledOptions = CHALLENGE_DATA.enabledOptions;

    updateSelectors(0);
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
    ctx.fillStyle = rgbToStr(COLORS.shape);

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
        case 'timer':
            ctx.lineWidth = 8;
            ctx.lineCap = 'butt';
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'gray';
            break;
        case 'transition':
            ctx.lineJoin = ctx.lineCap = 'round';
            ctx.lineWidth = 100;
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
    var $title = $('#overlay-title');
    var $body = $('#overlay-body');

    $title.addClass('start-title').removeClass('end-title');
    $body.addClass('start-text').removeClass('end-text');

    $title.html(`${LEVEL_DATA[level].name}`);
    $body.html(LEVEL_DATA[level].description);
}

function setEndText(outcome, level) {
    var $title = $('#overlay-title');
    var $body = $('#overlay-body');

    $title.addClass('end-title').removeClass('start-title');
    $body.addClass('end-text').removeClass('start-text');

    var endMessages = LEVEL_DATA[level].endMessages[outcome];
    $title.html(endMessages[0]);
    $body.html(endMessages[1]);
}

function setGameMode(mode) {
    switch (mode) {
        case GAME_MODE.newLevel:
            initLevel(gameState.level);
            setStartText(gameState.level);
            $('#overlay-text').show();
        case GAME_MODE.ready:
            $('#percent-painted .slider-fill').css('border-radius', '0px 0px 6px 6px');
            $('#spill-warning .slider-mark').css('background-color', 'rgba(50, 50, 50, 0.6');
            $('#game').css('cursor', 'default');

            resetGameState();
            resetLevel(gameState.level);
            updatePercentPainted();
            addBlurLayer();
            setTimer(0, gameState.maxTime);
            break;
        case GAME_MODE.starting:
            $('#overlay-text').hide();
            showCountdown(3, function () {
                flashStationary('Paint!', 1000, 400);
                fadeIn({ duration: 1, delay: 0.5 });
                setTimeout(restartTimer, 1000);
                setGameMode(GAME_MODE.playing);
            });
            break;
        case GAME_MODE.playing:
            $('#game').css('cursor', 'crosshair');
            break;
        case GAME_MODE.transitioning:
            gameState.isDrawing = 0;
            gameState.timerRunning = 0;

            $('#game').css('cursor', 'default');
            $('#reticle').hide();

            setTimeout(() => wipeOut(() => {
                resetGameState();
                $('#percent-painted .slider-fill').animate({ height: 0 });
                $('#spill-warning .slider-mark').animate({ bottom: 2 });
                $('#percent-painted .slider-fill').css('border-radius', '0px 0px 6px 6px');
                initChallenge(gameState.level, gameState.challengeIndex);
                setTimer(0, gameState.maxTime);

                wipeIn(() => {
                    restartTimer();
                    setGameMode(GAME_MODE.playing);
                });
            }), 1000);

            flashExpanding(randomAffirmation(), 800, { hold: 400, styling: 'small', expand: 200 });
            break;
        case GAME_MODE.complete:
            gameState.isDrawing = 0;
            gameState.timerRunning = 0;

            $('#game').css('cursor', 'default');
            $('#reticle').hide();

            addBlurLayer(1);
            fadeOut({ duration: 0.5 });

            setEndText(gameState.outcome, gameState.level);
            $('#overlay-title').addClass('smaller-title');
            $('#overlay-body').show();
            $('#overlay-text').css({ opacity: 0 }).show().animate({ opacity: 1 }, 1000);
        default:
            break;
    }
    gameState.mode = mode;
    setupButtons();
}

/* Poly draw functions */

function getPolyPath(x, y, sides, size, rotation, starred) {
    var rotation = rotation || (Math.PI - (Math.PI * 2 / sides)) / 2;
    var path = [];

    if (starred) sides = sides * 2;
    for (var i = 0; i < sides; i++) {
        var dist = starred ? (i % 2 ? size / 2 : size) : size;
        var angle = (Math.PI * 2 / sides) * i + rotation;
        var ptX = x + dist * Math.cos(angle);
        var ptY = y + dist * Math.sin(angle);
        path.push({ x: ptX, y: ptY });
    }
    return path;
}

function drawPolygon(ctx, x, y, sides, size, options) {
    options = options || {};

    var path = getPolyPath(x, y, sides, size, options.rotation, options.starred);
    var start = path.shift();

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    path.map(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();

    if (options.style == 'fill') {
        if (options.color) ctx.fillStyle = options.color;
        ctx.fill();
    } else {
        if (options.color) ctx.strokeStyle = options.color;
        ctx.stroke();
    }
}

function joinPolys(ctx, p1, p2) {
    if (p1.length != p2.length) return;
    for (var i = 0; i < p1.length; i++) {
        var j = (i + 1) % p1.length;
        ctx.beginPath();
        ctx.moveTo(p1[i].x, p1[i].y);
        ctx.lineTo(p1[j].x, p1[j].y);
        ctx.lineTo(p2[j].x, p2[j].y);
        ctx.lineTo(p2[i].x, p2[i].y);
        ctx.fill();
    }
}

/* Timer and time-based animations */

function setTimer(elapsed, max) {
    var $ring = $('#time-ring');
    var ringSize = $ring.height();
    var ctx = getContext($ring);
    ctx.clearRect(0, 0, ringSize, ringSize);
    setupContext(ctx, 'timer');

    var radius = 75;
    var center = ringSize / 2;

    ctx.strokeStyle = 'rgba(90, 90, 90, 0.25)';
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.stroke();

    var remaining = max - elapsed;

    var angle, min, sec;
    if (elapsed > max) {
        angle = min = sec = 0;
    } else {
        angle = (2 * Math.PI) * (1 - elapsed / max);
        min = Math.floor(remaining / 60);
        sec = Math.round(remaining) - 60 * min;
    }

    $('#time').html(min.toString() + ':' + (sec < 10 ? '0' : '') + sec.toString());

    if (remaining > 5) {
        ctx.strokeStyle = 'white';
    } else {
        var greenblue = Math.abs(Math.round(255 * Math.cos((remaining - 5) * Math.PI)));
        ctx.strokeStyle = rgbToStr([255, greenblue, greenblue]);
    }

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, angle);
    ctx.stroke();
}

function updateTimeRing() {
    if (!gameState.timerRunning) return;

    var elapsed = (Date.now() - gameState.startTime) / 1000;
    setTimer(elapsed, gameState.maxTime);

    if (elapsed < gameState.maxTime) {
        setTimeout(updateTimeRing, 10);
    } else {
        gameState.timerRunning = 0;
        gameState.outcome = GAME_OUTCOME.clocked;
        setGameMode(GAME_MODE.complete);
    }
}

function restartTimer() {
    gameState.startTime = Date.now();
    if (!gameState.timerRunning) {
        gameState.timerRunning = 1;
        updateTimeRing();
    }
}

function addBlurLayer(hidden) {
    $('#blurred-game').remove();

    var $game = $('#game');
    var $newGame = $(document.createElement('canvas'));
    $newGame.prop({ width: canvasSize, height: canvasSize });
    $newGame.css({ filter: 'blur(20px) saturate(60%) brightness(97%)' });

    var newCtx = getContext($newGame);
    newCtx.drawImage($game[0], 0, 0);

    var $wrapper = $('<div>')
        .prop({ id: 'blurred-game' })
        .css({
            top: $game[0].offsetTop,
            opacity: hidden ? 0 : 1,
        });

    $wrapper.append($newGame);
    $('#main').append($wrapper);

    if (!hidden) {
        $game.css({ opacity: 0 });
        $('#canvas-texture').css({ opacity: 0 });
    }
}

function fadeIn(options) {
    var duration = options.duration * 1000 || 1000;
    var delay = options.delay * 1000 || 0;

    function cb() {
        $('#blurred-game').remove();
        if (options.callback) callback();
    }

    setTimeout(function () {
        $('#blurred-game').animate({ opacity: 0 }, duration, cb);
        $('#game').animate({ opacity: 1 }, duration * .5);
        $('#canvas-texture').animate({ opacity: 0.6 }, duration * .5);
    }, delay);
}

function fadeOut(options) {
    var duration = options.duration * 1000 || 1000;
    var delay = options.delay * 1000 || 0;

    setTimeout(function () {
        $('#blurred-game').animate({ opacity: 1 }, duration, options.callback);
    }, delay);
    setTimeout(function () {
        $('#game, #canvas-texture').animate({ opacity: 0 }, duration * .5);
    }, delay + duration * .5);
}

function wipeOut(cb, x, y, dir, time, ctx) {
    if (y > 450) { if (cb) cb(); return; }
    if (!(x || y || dir || time)) {
        x = 0;
        y = 50;
        dir = 1;
        time = Date.now();
    }
    if (!ctx) {
        ctx = getContext();
    }

    var newX = x, newY = y;
    if (x >= 550 && dir == 1) {
        dir = -1;
        newY += 100;
    } else if (x <= -50 && dir == -1) {
        dir = 1;
        newY += 100;
    }

    // using a time coefficient removes duration variability
    // arising from browser speed, hardware, etc.
    var newTime = Date.now();
    var timeCoefficient = Math.max((newTime - time) / 10, 0.1);
    var speedCoefficient = 12;
    newX += dir * timeCoefficient * speedCoefficient;

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

function showCountdown(count, cb) {
    if (count > 0) {
        flashExpanding(count, 1200);
        setTimeout(() => showCountdown(count - 1, cb), 1000);
    } else if (cb) cb();
}

/* Tool options & selectors */

function drawToolOptions() {
    var enabledColor = rgbToStr(COLORS.enabledOption);
    var disabledColor = rgbToStr(COLORS.disabledOption);

    // draw brush size

    var sides = getBrushSides();
    var size = sides ? 5 : 4;
    var starred = isStarred();

    $('#brush-size canvas').each(function (index) {
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

    $('#tool-type .tool-option').each(function (index) {
        var enabled = gameState.enabledOptions[2][index];
        if (index == 1) {
            var $img = $(this).find('img');
            $img.prop('src', enabled ? './dist/lipstick.svg' : './dist/lipstick_gray.svg');
        } else {
            $(this).css('color', enabled ? enabledColor : disabledColor);
        }
    });
}

function updateSelectors(animated) {
    var enabled = gameState.enabledOptions;
    gameState.toolOptions.map((v, i) => {
        while (enabled && !enabled[i][v]) {
            v = (v + 1) % enabled[i].length;
        }
        gameState.toolOptions[i] = v;
        setSelector(i, v, animated);
    });
}

function setSelector(toolIndex, optionIndex, animated) {
    var $tool = $(`#tools .tool-wrapper:eq(${toolIndex})`);
    var $selector = $tool.find('.option-selector');
    var $option = $tool.find(`.tool-option:eq(${optionIndex})`);

    $selector.toggleClass('focus', toolIndex == gameState.toolFocus);

    var position = $option.position();
    if (animated) {
        $selector.animate({ 'left': position.left }, 300);
    } else {
        $selector.css('left', position.left);
    }
}

function drawReticle() {
    const $reticle = $('#reticle');
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

function alignGameLayers() {
    var offsetTop = $('#game')[0].offsetTop;
    $('#canvas-texture, #game-background, #blurred-game').css('top', offsetTop);
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

/* Initialization & event handlers */

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

function resetGameState() {
    gameState.strokes = [];
    gameState.isDrawing = 0;
    gameState.toolFocus = gameState.toolOptions.length;
    gameState.timerRunning = 0;
}

function initGame() {
    setTimeout(alignGameLayers, 100);
    setGameMode(GAME_MODE.newLevel);
}

$(document).ready(function () {
    tippy('#help-icon', {
        allowHTML: true,
        maxWidth: 425,
        offset: [0, 15],
        theme: 'purple',
    });

    var $canvas = $('#game');
    var ctx = getContext($canvas);

    canvasSize = parseInt($canvas.attr('height'));
    canvasScale = $canvas.height() / canvasSize;

    initGame();

    $(document).on('mousedown', function (e) {
        //only respond to clicks outside the game space
        if ($(e.target).closest('#game').length) return;

        gameState.toolFocus = gameState.toolOptions.length;
        updateSelectors(0);
    });

    $('.tool-option').click(function (e) {
        var optionIndex = $(e.target).index();
        var toolIndex = $(e.target).parents('.tool-wrapper').first().index();
        if (!isToolEnabled(toolIndex)) return;

        gameState.toolOptions[toolIndex] = optionIndex;
        setSelector(toolIndex, optionIndex, false);
        drawReticle();
        drawToolOptions();
    });

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
        if (gameState.mode == GAME_MODE.playing) $('#reticle').show();
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
        $('#reticle').hide();
    });

    $(document).on('mouseup', function () {
        gameState.isDrawing = false;
        if (gameState.mode != GAME_MODE.playing) return;

        var strokes = gameState.strokes;
        if (strokes.length && strokes[strokes.length - 1].length > 0) {
            strokes.push([]);
            $('#undo').removeClass('inactive');
        }

        updatePercentPainted();
    });

    $(document).keydown(function (e) {
        var pressedArrow = true;
        switch (e.which) {
            case 38: // up arrow
                var n = gameState.toolOptions.length + 1;
                var newFocus = (gameState.toolFocus - 1 + n) % n; // fix mod for negatives
                while (newFocus < n - 1 && !isToolEnabled(newFocus)) newFocus = (newFocus - 1 + n) % n;
                gameState.toolFocus = newFocus;
                break;
            case 40: // down arrow
                var newFocus = (gameState.toolFocus + 1) % (gameState.toolOptions.length + 1);
                while (newFocus < gameState.toolOptions.length && !isToolEnabled(newFocus)) newFocus += 1;
                gameState.toolFocus = newFocus;
                break;
            case 37: // left arrow
                if (gameState.toolFocus === gameState.toolOptions.length) gameState.toolFocus = 0;
                gameState.toolOptions[gameState.toolFocus] = Math.max(0, gameState.toolOptions[gameState.toolFocus] - 1);
                break;
            case 39: // right arrow
                if (gameState.toolFocus === gameState.toolOptions.length) gameState.toolFocus = 0;
                gameState.toolOptions[gameState.toolFocus] = Math.min(
                    getOptionCount() - 1,
                    gameState.toolOptions[gameState.toolFocus] + 1);
                break;
            case 13: // return key
            case 32: // spacebar
                if (gameState.mode == GAME_MODE.newLevel) {
                    $('#start').click();
                } else if (gameState.mode == GAME_MODE.complete) {
                    $('#retry').click();
                } else if (gameState.mode == GAME_MODE.playing) {
                    nextChallenge();
                }
                pressedArrow = false;
                break;
            default:
                pressedArrow = false;
                break;
        }
        if (pressedArrow) e.preventDefault();
        updateSelectors(1);
        setTimeout(drawReticle, 200);
        setTimeout(drawToolOptions, 200);
    });

    $('#undo').click(function () {
        const $this = $(this);
        if ($this.hasClass('inactive')) return;

        const {strokes} = gameState;
        strokes.splice(strokes.length - 2, 1);

        if (strokes.length <= 1) $this.addClass('inactive');

        redrawGame(ctx);
        updatePercentPainted();
    });

    $('#retry').click(function () {
        if ($(this).hasClass('inactive')) return;
        setGameMode(GAME_MODE.ready);
        setGameMode(GAME_MODE.starting);
    });

    $('#start').click(function () {
        if ($(this).hasClass('inactive')) return;
        setGameMode(GAME_MODE.starting);
    });

    // TODO: pause or quit button?

    $(window).resize(function () {
        alignGameLayers();
        updateSelectors(0);
    });
});
