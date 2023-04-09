/* Getters (for drawing) */

let _$gameCanvas;
function getCanvas() {
    if (!_$gameCanvas) _$gameCanvas = $('#game');
    return _$gameCanvas;
}

let _canvasSize = null;
const getCanvasSize = () => {
    if (!_canvasSize) _canvasSize = parseInt(getCanvas().attr('height'));
    return _canvasSize;
}

function getContext($canvas) {
    var ctx = ($canvas || getCanvas())[0].getContext('2d');
    return ctx;
}

/* Colors */

function rgbToStr(rgbList) {
    return 'rgb(' + rgbList.join(', ') + ')';
}

// significantly faster than reduce
// format: R, G, B, A
function rgbSum(pixelData, start) {
    if (!pixelData) return;
    if (!start) start = 0;
    return pixelData[start] + pixelData[start + 1] + pixelData[start + 2];
}

/* Geometry */

function midPointBtw(p1, p2) {
    return {
        x: p1.x + (p2.x - p1.x) / 2,
        y: p1.y + (p2.y - p1.y) / 2
    };
}

function getDistance(p1, p2) {
    return Math.pow(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2), 0.5);
}


function getPolyPath(x, y, sides, size, rotation, starred) {
    var rotation = rotation || (Math.PI - (Math.PI * 2 / sides)) / 2;
    var path = [];

    if (starred) sides = sides * 2;
    for (var i = 0; i < sides; i++) {
        var dist = starred ? (i % 2 ? size / 2 : size) : size;
        var angle = (Math.PI * 2 / sides) * i + rotation;
        var ptX = x + dist * Math.cos(angle);
        var ptY = y + dist * Math.sin(angle);
        path.push({ x: ptX, y: ptY });
    }
    return path;
}

function drawPolygon(ctx, x, y, sides, size, options) {
    options = options || {};

    var path = getPolyPath(x, y, sides, size, options.rotation, options.starred);
    var start = path.shift();

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    path.map(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();

    if (options.style == 'fill') {
        if (options.color) ctx.fillStyle = options.color;
        ctx.fill();
    } else {
        if (options.color) ctx.strokeStyle = options.color;
        ctx.stroke();
    }
}

function joinPolys(ctx, p1, p2) {
    if (p1.length != p2.length) return;
    for (var i = 0; i < p1.length; i++) {
        var j = (i + 1) % p1.length;
        ctx.beginPath();
        ctx.moveTo(p1[i].x, p1[i].y);
        ctx.lineTo(p1[j].x, p1[j].y);
        ctx.lineTo(p2[j].x, p2[j].y);
        ctx.lineTo(p2[i].x, p2[i].y);
        ctx.fill();
    }
}


export {
    getCanvas,
    getCanvasSize,
    getContext,
    rgbToStr, rgbSum,
    midPointBtw, getDistance,
    getPolyPath, drawPolygon, joinPolys,
};