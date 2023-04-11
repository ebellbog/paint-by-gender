import {getContext, getCanvasSize, rgbToStr} from './utils';
import {COLORS} from './enums';

class PbgTransitionManager {
    game = null;

    constructor(game, ctx) {
        this.game = game;
        this.ctx = ctx || getContext();
    }

    _setupContext() {
        this.ctx.lineJoin = this.ctx.lineCap = 'round';
        this.ctx.lineWidth = 90; // should divide canvasSize evenly
        this.ctx.strokeStyle = this.ctx.fillStyle = rgbToStr(COLORS.purple);
        this.ctx.globalCompositeOperation = 'source-over';
    }

    wipeIn(cb, y, time) {
        this.game.drawChallenge();

        const canvasSize = getCanvasSize();

        if (y > canvasSize) { if (cb) cb(); return; }
        if (!(y || time)) {
            y = 0;
            time = Date.now();
        }

        const newTime = Date.now();
        const timeCoefficient = Math.max((newTime - time) / 10, 0.1);
        const SPEED_COEFFICIENT = 3;
        const newY = y + timeCoefficient * SPEED_COEFFICIENT;

        this._setupContext();
        this.ctx.fillRect(0, 0, canvasSize, canvasSize - newY);

        setTimeout(() => this.wipeIn(cb, newY, newTime), 0);
    }

    wipeOut(cb, x, y, dir, time) {
        const BRUSH_SIZE = 90; // should evenly divide canvasSize
        const canvasSize = getCanvasSize();

        if (y > canvasSize) { if (cb) cb(); return; }

        if (!(x || y || dir || time)) {
            x = - BRUSH_SIZE / 2;
            y = BRUSH_SIZE / 2;
            dir = 1;
            time = Date.now();
        }

        let newX = x, newY = y;
        if (x >= canvasSize + BRUSH_SIZE / 2 && dir == 1) {
            dir = -1;
            newY += BRUSH_SIZE;
        } else if (x <= -BRUSH_SIZE / 2 && dir == -1) {
            dir = 1;
            newY += BRUSH_SIZE;
        }

        const newTime = Date.now();
        const timeCoefficient = Math.max((newTime - time) / 10, 0.1);
        const SPEED_COEFFICIENT = 12;
        newX += dir * timeCoefficient * SPEED_COEFFICIENT;

        this._setupContext();

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(newX, newY);
        this.ctx.stroke();

        setTimeout(() => this.wipeOut(cb, newX, newY, dir, newTime), 0);
    }

    boxOut(cb, r, time) {
        const canvasSize = getCanvasSize();

        if (r > canvasSize / 2) { if (cb) cb(); return; }
        if (!(r || time)) {
            r = 0;
            time = Date.now();
        }

        const newTime = Date.now();
        const timeCoefficient = Math.max((newTime - time) / 10, 0.1);
        const SPEED_COEFFICIENT = 2.5;
        const newR = r + timeCoefficient * SPEED_COEFFICIENT;

        this._setupContext();

        this.ctx.beginPath();
        this.ctx.rect(canvasSize, canvasSize, -canvasSize, -canvasSize);
        this.ctx.rect(r, r, canvasSize - 2 * r, canvasSize - 2 * r);
        this.ctx.fill('evenodd');

        setTimeout(() => this.boxOut(cb, newR, newTime), 0);

    }

    fadeIn(options) {
        const duration = options.duration * 1000 || 750;
        const delay = options.delay * 1000 || 0;
        const {callback} = options;

        setTimeout(function () {
            $('body').removeClass('show-blur');
            if (callback) setTimeout(callback, duration);
        }, delay);
    }
}

export default PbgTransitionManager;