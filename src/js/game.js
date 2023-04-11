import PbgTimer from './timer';
import {getContext} from './utils';
import {BRUSH_TYPES} from './enums';

class PbgGame {
    // Required config

    levels = [];

    // State
    
    timer = null;

    levelIdx = 0;

    toolTypeIdx = 0;
    toolOptionIdx = 1;

    mode = null;
    outcome = null;

    constructor(levels) {
        this.levels = levels;
        this.timer = new PbgTimer();
    }

    _reset(resetAll) {
        if (resetAll) {
            this.levelIdx = 0;
            this.levels.forEach((level) => level.reset());
            this.setChallengeIcon();
        } else {
            this.currentChallenge.reset();
        }

        this.timer.reset();
    }

    resetAll() {
        this._reset(true);
    }

    resetCurrent() {
        this._reset();
    }

    pause(withBlur) {
        this.isDrawing = false;
        this.timer.pause();

        if (withBlur) {
            // updateBlurLayer();
        }
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

    nextChallenge() {
        this.currentChallenge.completionTime = this.timer.timeElapsed;
        this.currentChallenge.attempts++;

        this.currentLevel.challengeIdx++;
        this.setChallengeIcon();
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
        let size = this.brushDiameter;

        if (this.brushType.isQuantized) {
            size = size / (Math.cos(Math.PI / this.brushSides) * 2);
        }
        return size;
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