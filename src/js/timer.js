import {getContext, rgbToStr} from './utils';

class PbgTimer {
    startTime = 0;
    timeElapsed = 0;
    timeLimit = 0;
    prevTimeElapsed = 0;

    isTimerRunning = false;

    $time = $('#time');
    $timeRing = $('#time-ring');
    _ringSize = 0;

    constructor() {
        this.$timeRing = $('#time-ring');

        const ctx = getContext(this.$timeRing);
        ctx.fillStyle = 'rgba(100, 0, 100, .25)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'butt';
    }

    // For listening to time running out
    on(eventName, handlerFunc) {
        this.$time.on(eventName, function() {
            handlerFunc(...arguments);
        });
    }

    update() {
        if (!this.isTimerRunning) return;

        this.timeElapsed = (Date.now() - this.startTime) / 1000 + this.prevTimeElapsed;
        this.redraw();

        if (this.timeElapsed < this.timeLimit) {
            setTimeout(this.update.bind(this), 10);
        } else {
            this.isTimerRunning = 0;
            this.$time.trigger('clocked');
        }
    }

    redraw() {
        if (!this._ringSize) this._ringSize = this.$timeRing.height();

        const ctx = getContext(this.$timeRing);
        ctx.clearRect(0, 0, this._ringSize, this._ringSize);

        const radius = 75;
        const center = this._ringSize / 2;

        // Draw background
        ctx.beginPath();
        ctx.arc(center, center, radius - ctx.lineWidth / 2, 0, 2 * Math.PI);
        ctx.fill();

        const remaining = this.timeLimit - this.timeElapsed;

        let angle, min, sec;
        if (this.timeElapsed > this.timeLimit) {
            angle = min = sec = 0;
        } else {
            angle = (2 * Math.PI) * (1 - this.timeElapsed / this.timeLimit);
            min = Math.floor(remaining / 60);
            sec = Math.round(remaining) - 60 * min;
        }

        this.$time.html(min.toString() + ':' + (sec < 10 ? '0' : '') + sec.toString());

        if (remaining > 5) {
            ctx.strokeStyle = 'white';
        } else {
            // Pulse between white & red, by fading green & blue
            const greenblue = Math.abs(Math.round(255 * Math.cos((remaining - 5) * Math.PI)));
            ctx.strokeStyle = rgbToStr([255, greenblue, greenblue]);
        }

        ctx.save();

        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#3f163f80';

        // Draw time elapsed (progress bar)
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, angle);
        ctx.stroke();

        ctx.restore();
    }

    restart(resetTime = true) {
         // When resuming from a pause, resetTime should be false
        if (resetTime) {
            this.prevTimeElapsed = 0;
        }

        this.startTime = Date.now();
        if (!this.isTimerRunning) {
            this.isTimerRunning = true;
            this.update();
        }
    }

    reset() {
        this.isTimerRunning = false;
        this.timeElapsed = 0;
        this.prevTimeElapsed = 0;
        this.redraw();
    }

    pause() {
        this.isTimerRunning = false;
        this.prevTimeElapsed = this.timeElapsed;
    }
}

export default PbgTimer;