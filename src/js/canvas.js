import {getCanvas, getContext, rgbSum, rgbToStr} from './utils';
import {COLORS} from './enums';

class PbgCanvas {
    isDrawing = false;

    strokes = [];
    buffer = [];

    maxShape = 0;
    maxCanvas = 0;

    $canvas = getCanvas();
    ctx = getContext();

    game = null;

    constructor(game) {
        this.game = game;
        this.hookEvents();
    }

    setupContext(brushColor) {
        this.ctx.lineJoin = this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = this.ctx.fillStyle = rgbToStr(brushColor);
        this.ctx.globalCompositeOperation = 'darken';
    }

    hookEvents() {
        // TODO: implement
    }

    startDrawing() {
        this.buffer = [];
        this.isDrawing = true;
    }

    stopDrawing() {
        this.flushBuffer();
        this.isDrawing = false;

        if (this.strokes.length && this.strokes.slice(-1)[0].length > 0) {
            this.strokes.push([]);
        }
    }

    flushBuffer() {
        const bufferLength = this.buffer.length;
        if (bufferLength <= 1) {
            // splice causes bugs if we flush at length 1
            return;
        }

        const totals = this.buffer.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }));
        const avgPos = {
            x: totals.x / bufferLength,
            y: totals.y / bufferLength,
            brushSize: this.buffer[0].brushSize
        };

        this.strokes[this.strokes.length - 1].splice(-(bufferLength - 1), bufferLength - 1, avgPos);
        this.buffer = [];
    }

    analyze() {
        // TODO: only 1/4 canvas at a time? either by region or modulus?
        const imageData = this.ctx.getImageData(0, 0, this.ctx.canvas.width, this.ctx.canvas.height).data; // R, G, B, A, R, G, B, etc.

        const totals = {
            unpainted: 0,
            painted: 0,
            spill: 0,
            canvas: 0
        }

        const unpaintedSum = rgbSum(COLORS.white);
        const paintedSum = rgbSum(this.game.brushColor);
        const spillSum = rgbSum(COLORS.spill);
        const bgSum = rgbSum(this.game.bgColor);

        for (var i = 0; i < imageData.length; i += 4) {
            switch (rgbSum(imageData, i)) {
                case unpaintedSum:
                    totals.unpainted++;
                    break;
                case paintedSum:
                    totals.painted++;
                    break;
                case spillSum:
                    totals.spill++;
                    break;
                case bgSum:
                    totals.canvas++;
                    break;
            }
        }

        return totals;
    }

    updateMaxCounts() {
        const canvasData = this.analyze();
        this.maxShape = canvasData.unpainted;
        this.maxBg = canvasData.canvas;
    }

    reset() {
        this.strokes = [];
        this.buffer = [];
        this.isDrawing = false;
        this.resetPercentPainted();
    }

    resetPercentPainted() {
        $('#spill-warning .slider-wrapper')
            .removeClass('danger transgressed')
            .find('.slider-mark')
            .css('bottom', '0%')
            .find('.mark-color')
            .css('background-color', 'limegreen');
        $('#percent-painted .slider-fill').css('height', '0%');
    }
}

export default PbgCanvas;