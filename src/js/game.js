import PbgTimer from './timer';
import {getContext} from './utils';
import {BRUSH_TYPES, GAME_MODE} from './enums';

import rangeSlider from 'range-slider-input';
import 'range-slider-input/dist/style.css';

const MIN_BRUSH_SIZE = 8;
const MAX_BRUSH_SIZE = 50;

class PbgGame {
    // Required config

    levels = [];

    // State
    
    timer = null;

    levelIdx = 0;

    toolTypeIdx = 0;
    toolOptionIdx = 1;
    rangeSlider = null;

    mode = null;
    outcome = null;

    constructor(levels) {
        this.levels = levels;
        this.timer = new PbgTimer();

        this.rangeSlider = rangeSlider($('#range-slider')[0], {
            onInput: () => $('body').trigger('brush-size-change'),
            value: [0, MAX_BRUSH_SIZE - MIN_BRUSH_SIZE],
            thumbsDisabled: [true, false],
            rangeSlideDisabled: true
        });
    }

    retryChallenge() {
        this.currentChallenge.retry();
        this.timer.reset();
    }
    resetChallenge() {
        this.currentChallenge.reset();
        this.currentChallenge.draw();
        this.timer.reset();
    }
    resetLevel() {
        this.currentLevel.reset();
        this.setChallengeIcon();
        this.timer.reset();
    }
    resetAll() {
        this.levelIdx = 0;
        this.resetLevel();
        this.levels.slice(1).forEach((level) => level.reset());
    }

    redraw() {
        const ctx = getContext();

        ctx.lineJoin = ctx.lineCap = 'round';
        ctx.strokeStyle = ctx.fillStyle = rgbToStr(COLORS.paint);
        ctx.globalCompositeOperation = 'darken';

        // TODO: complete
    }

    drawChallenge() {
        this.currentChallenge.draw();
    }

    advanceGame() {
        this.currentChallenge.completionTime = this.timer.timeElapsed;
        this.currentChallenge.attempts++;
        this.currentChallenge.destroyTooltips();

        this.currentLevel.challengeIdx++;
        this.setChallengeIcon();

        let nextMode;
        if (this.currentLevel.challengeIdx === this.currentLevel.challenges.length) {
            if (this.levelIdx === this.levels.length - 1) {
                nextMode = GAME_MODE.complete;
            } else {
                this.levelIdx++;
                nextMode = GAME_MODE.nextLevel;
            }
        } else {
            nextMode = GAME_MODE.nextChallenge;
        }

        return nextMode;
    }

    setLevelTitle() {
        $('#level-number').html(`Level ${this.levelIdx + 1}`);
        $('#level-name').html(this.currentLevel.levelName);
    }

    setChallengeIcon() {
        const $iconWrapper = $('#level-icon-wrapper').empty();

        const FA_CLASSES = 'fa-xs fa-fw';
        const CIRCLE_CLASS = 'fa-circle', SQUARE_CLASS = 'fa-square';
        const EMPTY_CLASS = 'far', FILLED_CLASS = 'fas';

        this.currentLevel.challenges.forEach((challenge) => {
            const roundBrushEnabled = this.isToolEnabled(0, challenge);
            const challengeCompleted = challenge.completionTime;

            const iconClasses = [
                FA_CLASSES,
                roundBrushEnabled ? CIRCLE_CLASS : SQUARE_CLASS,
                challengeCompleted ? FILLED_CLASS : EMPTY_CLASS
            ].join(' ');
            $('<i></i>').addClass(iconClasses).appendTo($iconWrapper);
        });
    }

    setStartText() {
        $('#overlay-title').html(this.currentLevel.levelName);
        $('#overlay-body').html(this.currentLevel.levelDescription);
    }

    setEndText() {
        const endMessages = this.currentLevel.endMessages[this.outcome];
        $('#overlay-title').html(endMessages[0]);
        $('#overlay-body').html(endMessages[1]);
    }

    isToolEnabled(idx, challenge) {
        return (challenge || this.currentChallenge).enabledTools[idx];
    }

    // Getters

    get currentLevel() {
        return this.levels[this.levelIdx];
    }

    get currentChallenge() {
        return this.currentLevel?.currentChallenge;
    }

    get bgColor() {
        return this.currentChallenge?.shape.bgColor;
    }

    get brushType() {
        return BRUSH_TYPES[this.toolTypeIdx];
    }

    get brushSize() {
        if (this.brushType.isQuantized) {
            return this.brushDiameter / (Math.cos(Math.PI / this.brushSides) * 2);
        } else {
            return this.rangeSlider.value()[1] + MIN_BRUSH_SIZE;
        }
    }

    set brushSize(size) {
        if (!this.brushSize.isQuantized) {
            this.rangeSlider.value([0, size - MIN_BRUSH_SIZE]);
        }
    }

    get brushDiameter() {
        return this.brushType.sizes[this.toolOptionIdx];
    }

    get brushSides() {
        return this.brushType.sides;
    }

    get brushColor() {
        return this.brushType.color;
    }

    get isStarred() {
        return this.brushType.starred;
    }

    get isQuantized() {
        return this.brushType.isQuantized;
    }
}

export default PbgGame;