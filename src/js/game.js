import PbgTimer from './timer';
import {getContext} from './utils';

class PbgGame {
    // Required config

    levels = [];

    // State
    
    timer = null;
    mode = null;

    levelIdx = 0;

    toolTypeIdx = 0;
    toolOptionIdx = 0;

    strokes = [];
    isDrawing = false;

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
    }

    resetCurrent() {
        this.strokes = [];
        this.isDrawing = false;
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
        this.currentLevel.challengeIdx++;
    }

    get currentLevel() {
        return this.levels[this.levelIdx];
    }

    get currentChallenge() {
        return this.currentLevel.currentChallenge;
    }
}

export default PbgGame;