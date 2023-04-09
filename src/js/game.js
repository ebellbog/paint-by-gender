import PbgTimer from './timer';

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

    constructor(levels) {
        this.levels = levels;
        this.timer = new PbgTimer();
    }

    reset() {
        this.levelIdx = 0;
        this.strokes = [];
        this.isDrawing = false;

        this.timer.reset();
        this.levels.forEach((level) => level.reset());
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

    get currentLevel() {
        return this.levels[this.levelIdx];
    }

    get currentChallenge() {
        return this.currentLevel.currentChallenge;
    }
}
export default PbgGame;