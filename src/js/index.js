import chroma from 'chroma-js';

import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

import '../less/index.less';

import {COLORS, BRUSH_TYPES,
    GAME_MODE, GAME_OUTCOME} from './enums';

import {
    rgbToStr,
    getCanvas, getContext,
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

let canvasScale, canvasSize;
let _$reticle;

let startingChallenge;
let undoGroups = [], currentUndoSize = 1, doIncreaseUndoSize = false;


/* Initialization & event handlers */

$(document).ready(function () {
    $('body').removeClass('preload');

    tippy('#help-icon', {
        allowHTML: true,
        maxWidth: 425,
        offset: [0, 15],
        theme: 'purple',
    });

    const $canvas = getCanvas();
    canvasSize = parseInt($canvas.attr('height'));
    canvasScale = $canvas.height() / canvasSize;

    initGame();
    hookEvents();
});

function startDrawing(e) {
    pbgCanvas.startDrawing();

    const strokes = pbgCanvas.strokes;
    if (!strokes.length) strokes.push([]);

    const pt = getPathPoint(getCanvas()[0], e);
    strokes[strokes.length - 1].push(pt);

    if (doIncreaseUndoSize) {
        currentUndoSize++;
        doIncreaseUndoSize = false;
    }

    drawPoint(getContext(), pt);
    updatePercentAsync();
}

function hookEvents() {
    const ctx = getContext();

    getCanvas()
        .on('mousedown', function (e) {
            if (pbgGame.mode != GAME_MODE.playing) return;
            currentUndoSize = 1;
            startDrawing(e);
        })
        .on('mousemove', function (e) {
            updateReticle(e);

            if (!pbgCanvas.isDrawing) return;

            const strokes = pbgCanvas.strokes;

            const lastPos = strokes[strokes.length - 1].slice(-1)[0];
            if (!lastPos) {
                return startDrawing(e);
            }

            const curPos = getPathPoint(getCanvas()[0], e);
            const distance = getDistance(curPos, lastPos);

            if (pbgGame.isQuantized) {
                if (distance < pbgGame.brushDiameter) {
                    return;
                } else if (distance > pbgGame.brushDiameter) {
                    // Prevent diagonal paths for quantized brushes by breaking into separate paths
                    pbgCanvas.stopDrawing();
                    pbgCanvas.startDrawing();
                }
            } else {
                if (distance < 10) {
                    pbgCanvas.buffer.push(curPos);
                } else {
                    pbgCanvas.buffer = [];
                }
            }

            if (pbgCanvas.buffer.length > 3) {
                pbgCanvas.flushBuffer();
                pbgCanvas.buffer.push(curPos);
            }

            strokes[strokes.length - 1].push(curPos);
            redrawGame();
        })
        .on('mouseout', function (e) {
            getReticle().hide();
        });

    $(document).on('mouseup', function () {
        if (pbgCanvas.isDrawing) {
            pbgCanvas.stopDrawing();

            doIncreaseUndoSize = false;
            undoGroups.push(currentUndoSize);

            updatePercentPainted();
        }
    });

    $(document).keydown((e) => {
        let pressedArrow = true;

        switch (e.which) {
            case 38: // up arrow
                pbgGame.toolTypeIdx -= 2;
            case 40: // down arrow
                pbgGame.toolTypeIdx++;
                validateToolType(1000);
                updateToolOptions();
                break;
            case 37: // left arrow
                if (pbgGame.isQuantized) {
                    pbgGame.toolOptionIdx -= 2;
                } else {
                    pbgGame.brushSize = pbgGame.brushSize - 4;
                }
            case 39: // right arrow
                if (pbgGame.isQuantized) {
                    const sizes = pbgGame.brushType.sizes.length;
                    pbgGame.toolOptionIdx = (pbgGame.toolOptionIdx + 1 + sizes) % sizes;
                    updateRadioGroup('toolOption', pbgGame.toolOptionIdx);
                } else {
                    pbgGame.brushSize = pbgGame.brushSize + 2;
                    if (pbgCanvas.isDrawing) {
                        pbgCanvas.stopDrawing();
                        pbgCanvas.startDrawing();
                        doIncreaseUndoSize = true;
                    }
                }
                break;
            case 13: // return key
            case 32: // spacebar
                if (pbgGame.mode == GAME_MODE.newLevel) {
                    $('#start').click();
                } else if (pbgGame.mode == GAME_MODE.complete) {
                    $('#retry').click();
                } else if (pbgGame.mode == GAME_MODE.playing) { // TODO: remove this debugging hack
                    pbgGame.outcome = GAME_OUTCOME.passed;
                    flashAffirmation();
                    setGameMode(pbgGame.advanceGame());
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

        const lastUndoSize = undoGroups.splice(-1)[0];
        strokes.splice(strokes.length - lastUndoSize - 1, lastUndoSize);
        pbgGame.currentChallenge.undo();

        redrawGame();
        updatePercentPainted();
    });

    $('#retry').on('click', (e) => {
        if (pbgGame.mode === GAME_MODE.complete) {
            resetGame();
            return $('#next-level').click();
        } else if (pbgGame.mode === GAME_MODE.failed) {
            if (pbgGame.currentChallenge.attempts < 2) resetChallenge();
            else resetLevel();
        } else {
            resetChallenge();
        }
        setGameMode(GAME_MODE.starting);
    });

    $('#start').on('click', () => {
        setGameMode(GAME_MODE.starting);
    });

    $('#next-level').on('click', () => {
        const $body = $('body');
        $body.removeClass('show-overlay');
        setTimeout(() => {
            setGameMode(GAME_MODE.newLevel);
            $('body').removeClass('show-curtain');
        }, 500);
    });

    $('#quit').on('click', () => {
        resetGame();
        return $('#next-level').click();
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
                    updateToolOptions();
                } else {
                    pbgGame.toolOptionIdx = inputIdx;
                }
                drawReticle();
                $group.find('.active').removeClass('active');
            }

            $input.addClass('active');
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
        $('#spill-warning .slider-wrapper').removeClass('danger');
        setGameMode(GAME_MODE.failed);
    });
    $('body').on('brush-size-change', () => {
        drawReticle();
    });
}


/* Helper functions */

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
        setGameMode(GAME_MODE.failed);
    }
    else if (percent >= 1 && pbgGame.mode === GAME_MODE.playing) {
        $fill.css('background-color', '#0f0');
        pbgGame.outcome = GAME_OUTCOME.passed;
        flashAffirmation();
        setGameMode(pbgGame.advanceGame());
    }
}

function updatePercentAsync() {
    setTimeout(updatePercentPainted, 0);
}


/* Setup functions */

function initGame() {
    // Facilitate testing specific challenges via query param
    const searchParams = new URLSearchParams(location.search);

    const startingLevel = parseInt(searchParams.get('l'));
    if (startingLevel) pbgGame.levelIdx = startingLevel;

    startingChallenge = parseInt(searchParams.get('c'));

    setGameMode(GAME_MODE.newLevel);
}

function resetChallenge() {
    _reset('challenge');
}
function resetLevel() {
    _reset('level');
}
function resetGame() {
    _reset('game');
}

function _reset(resetType) {
    pbgCanvas.reset();
    undoGroups = [];
    doIncreaseUndoSize = false;

    switch(resetType) {
        case 'challenge':
            pbgGame.retryChallenge();
            break;
        case 'level':
            pbgGame.resetLevel();

            if (startingChallenge) {
                pbgGame.currentLevel.challengeIdx = startingChallenge;
                startingChallenge = null;
            }

            initChallenge();
            break;
        case 'game':
            pbgGame.resetAll();
            initChallenge();
            break;
    }

    updateBlurLayer();
}

function initChallenge() {
    $('#game-wrapper').css('background-color', rgbToStr(pbgGame.bgColor));
    $('#percent-painted .slider-fill').css('background-color', rgbToStr(pbgGame.brushColor));

    pbgGame.timer.timeLimit = pbgGame.currentChallenge.timeLimit;
    pbgGame.resetChallenge();
    pbgCanvas.updateMaxCounts();

    pbgGame.currentChallenge.setTooltips();
    validateToolType((pbgGame.currentLevel.challengeIdx > 0) ? 2600 : null);

    drawReticle();
    updateToolOptions();
}

function setGameMode(mode) {
    const $body = $('body');
    switch (mode) {
        case GAME_MODE.newLevel:
            resetLevel();

            pbgGame.setLevelTitle()
            pbgGame.setStartText();

            $('#start').html(`START LEVEL ${pbgGame.levelIdx + 1}`);
            updateModeClass(mode);

            $body.addClass('show-overlay show-blur');
            break;
        case GAME_MODE.starting:
            $body.removeClass('show-overlay show-curtain');
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
                delay: 800,
            });
            break;
        case GAME_MODE.playing:
            getReticle().hide(); // hide until mouse move reveals
            $('#retry').html("Start over, it's trash")
            updateModeClass(mode);
            break;
        case GAME_MODE.nextChallenge:
            pauseGame();
            updateModeClass(mode);

            $('#spill-warning .slider-wrapper')
                .removeClass('danger transgressed')

            setTimeout(() => transitionManager.wipeOut(() => {
                pbgCanvas.reset();

                pbgGame.timer.reset();
                initChallenge();

                transitionManager.wipeIn(() => {
                    pbgGame.timer.restart();
                    setGameMode(GAME_MODE.playing);
                });
            }), 1000);

            break;
        case GAME_MODE.complete:
            $('#retry').html('PLAY AGAIN');
        case GAME_MODE.nextLevel:
            pauseGame();
            updateModeClass(mode);

            pbgGame.setEndText();

            setTimeout(() => transitionManager.boxOut(() => {
                setTimeout(
                    () => $body.addClass('show-overlay show-curtain'),
                    150
                );
            }), 900);
            break;
        case GAME_MODE.failed:
            const {attempts} = pbgGame.currentChallenge;
            const suffix = ['nd', 'rd'][attempts];
            const label = (suffix) ? `Give it a ${attempts + 2}${suffix} try?` : 'Just restart the<br>whole darn level';
            $('#retry').html(label);
            pbgGame.setEndText();
        case GAME_MODE.paused:
            pauseGame(true);

            if (mode === GAME_MODE.paused) $('#overlay-title').html('PAUSED');

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

function flashAffirmation() {
    flashExpanding(pbgGame.currentLevel.randomAffirmation, 800, { hold: 400, styling: 'small', expand: 200 });
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

function updateToolOptions() {
    const isQuantized = !!pbgGame.isQuantized;
    $('#guybrush-options').toggle(isQuantized);
    $('#galbrush-options').toggle(!isQuantized);

    $('[data-group="toolType"] .tool').each((idx, el) => {
        $(el).toggleClass('disabled', !pbgGame.isToolEnabled(idx));
    });
}

function validateToolType(showTooltip) {
    const numTools = BRUSH_TYPES.length;

    let {toolTypeIdx: idx} = pbgGame;
    idx = (idx + numTools) % numTools;

    while (!pbgGame.isToolEnabled(idx)) {
        idx = (idx + 1) % numTools;
    }

    pbgGame.toolTypeIdx = idx;
    updateRadioGroup('toolType', idx, showTooltip);
}

function updateRadioGroup(radioGroup, optionIndex, showTooltip) {
    const $toolGroup = $(`.radio-group[data-group=${radioGroup}]`);
    $toolGroup.find('.active').removeClass('active');
    const $newTool = $toolGroup.find(`.tool:eq(${optionIndex})`).addClass('active')

    if (!showTooltip) return;

    const tippyInstance = $newTool[0]._tippy;
    if (tippyInstance) {
        pbgGame.currentChallenge.hideTooltips();
        setTimeout(() => {
            tippyInstance.show();
            setTimeout(() => tippyInstance.hide(), showTooltip);
        }, 100);
    }
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

    if (pbgGame.mode === GAME_MODE.playing) $reticle.css('display', '');

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

function redrawGame() {
    const ctx = getContext();
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
    if (pbgGame.isQuantized ||total % 10 === 0) updatePercentAsync();
}