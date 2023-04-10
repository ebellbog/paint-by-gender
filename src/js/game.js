import PbgTimer from './timer';
import {getContext} from './utils';

class PbgGame {
    // Required config

    levels = [];

    // State
    
    timer = null;

    levelIdx = 0;

    toolTypeIdx = 0;
    toolOptionIdx = 0;

    strokes = [];
    isDrawing = false;

    mode = null;
    outcome = null;

    constructor(levels) {
        this.levels = levels;
        this.timer = new PbgTimer();
    }

    resetAll() {
        this.resetCurrent();
        this.resetDom();

        this.levelIdx = 0;
        this.levels.forEach((level) => level.reset());

        this.setChallengeIcon();
    }

    resetCurrent() {
        this.strokes = [];
        this.isDrawing = false;

        this.currentChallenge.reset();
        this.timer.reset();
    }

    resetDom() {
        $('#percent-painted .slider-fill').css('border-radius', '0px 0px 6px 6px');
        $('#spill-warning .slider-mark').css('background-color', 'rgba(50, 50, 50, 0.6');
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
            const roundBrushEnabled = challenge.enabledTools[0];
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

    // Getters
    get currentLevel() {
        return this.levels[this.levelIdx];
    }

    get currentChallenge() {
        return this.currentLevel.currentChallenge;
    }

    get bgColor() {
        return this.currentChallenge.shape.bgColor;
    }
}

export default PbgGame;