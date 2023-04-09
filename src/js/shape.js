import {BRUSH_TYPES, COLORS} from './enums';
import {getCanvasSize, getContext, rgbToStr} from './utils';

class PbgShape {
    // Required config

    bgColor = null; // Shapes have a fixed background color, regardless of challenge/level
    drawFunc = () => {};

    constructor(bgColor, drawFunc) {
        this.bgColor = bgColor;
        this.drawFunc = drawFunc;
    }

    draw() {
        const ctx = getContext();
        ctx.save();

        ctx.globalCompositeOperation = 'source-over';
        this.clearCanvas(ctx);

        // Setup context for drawing
        ctx.fillStyle = rgbToStr(COLORS.white);
        ctx.strokeStyle = rgbToStr(COLORS.outline);
        ctx.lineWidth = 3.5;

        // Draw path, then fill in
        this.drawFunc(ctx);
        ctx.stroke();
        ctx.fill();

        ctx.restore();
    }

    clearCanvas(ctx) {
        const canvasSize = getCanvasSize();
        ctx.fillStyle = rgbToStr(this.bgColor);
        ctx.fillRect(0, 0, canvasSize, canvasSize);
    }
}

/* Instances */

const curvyToy = new PbgShape(
    COLORS.pink,
    (ctx) => {
        const xoff = -100;
        const yoff = -20;

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
    }
);

const qrCode = new PbgShape(
    COLORS.blue,
    (ctx) => {
        const canvasSize = getCanvasSize();

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
    },
);

const heart = new PbgShape(
    COLORS.pink,
    (ctx) => {
        const xoff = -15;
        const yoff = 5;

        ctx.beginPath();

        // generated at http://www.victoriakirst.com/beziertool/
        ctx.moveTo(289 + xoff, 446 + yoff);
        ctx.bezierCurveTo(197 + xoff, 355 + yoff, 150 + xoff, 316 + yoff, 89 + xoff, 236 + yoff);
        ctx.bezierCurveTo(67 + xoff, 207 + yoff, 77 + xoff, 124 + yoff, 144 + xoff, 100 + yoff);
        ctx.bezierCurveTo(225 + xoff, 71 + yoff, 273 + xoff, 145 + yoff, 291 + xoff, 184 + yoff);
        ctx.bezierCurveTo(296 + xoff, 171 + yoff, 347 + xoff, 60 + yoff, 440 + xoff, 101 + yoff);
        ctx.bezierCurveTo(516 + xoff, 135 + yoff, 500 + xoff, 219 + yoff, 469 + xoff, 248 + yoff);

        ctx.closePath();
    }
);

const SHAPES = {curvyToy, qrCode, heart};

export {SHAPES};
export default PbgShape;