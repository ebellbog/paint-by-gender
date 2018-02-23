colors = {
  paint: [255, 150, 150],//'#bd354d'
  canvas: [132, 189, 250],
  shape: [255, 255, 255],
  spill: [132, 150, 150],
  innerReticle: [153, 153, 153],
  outerReticle: [221, 221, 221]
};

brushTypes = {
  circle: {index: 0, sizes:[8, 20, 28]},
  square: {index: 1, sizes:[8, 20, 28]},
  triangle: {index: 2, sizes:[12, 24, 36]}
};

currentBrushType = brushTypes.triangle;
currentSizeIndex = 1;

strokes = [];
isDrawing = 0;
currentLevel = 1;

function getBrushSize() {
  return currentBrushType.sizes[currentSizeIndex];
}

function rgbToStr(rgbList) {
 return 'rgb('+rgbList.join(', ')+')';
}

// significantly faster than reduce
function rgbSum(pixelData, start) {
  if (!start) start = 0;
  return pixelData[start]+pixelData[start+1]+pixelData[start+2];
}

function midPointBtw(p1, p2) {
  return {
    x: p1.x + (p2.x - p1.x) / 2,
    y: p1.y + (p2.y - p1.y) / 2
  };
}

function getDistance(p1, p2) {
  return Math.pow(Math.pow(p1.x-p2.x,2)+Math.pow(p1.y-p2.y,2), 0.5);
}

function getPathPoint(canvas, e) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX-rect.left,
    y: e.clientY-rect.top,
    brushSize: getBrushSize()
  };
}

function getContext($canvas) {
  if (!$canvas) $canvas = $('#game');
  var ctx = $canvas[0].getContext('2d');
  return ctx;
}

function analyzeCanvas() {
  var ctx = getContext();
  var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data;
  
  var totals = {
    unpainted: 0,
    painted: 0,
    spill: 0
  }

  for (var i = 0; i < imageData.length; i+=4) {
    switch(rgbSum(imageData, i)) {
      case rgbSum(colors.shape):
        totals.unpainted++;
        break;
      case rgbSum(colors.paint):
        totals.painted++;
        break;
      case rgbSum(colors.spill):
        totals.spill++;
        break;
    }
  }

  return totals;
}

function updatePercentPainted() {
  var ctx = getContext();
  var canvasData = analyzeCanvas();
  var percent = canvasData.painted/(canvasData.painted+canvasData.unpainted);

  var $slider = $('#percent-painted .slider-outline');
  var height = $slider.height();
  var $fill = $('#percent-painted .slider-fill');
  $fill.animate({height: height*percent}, 60, 'linear');
  $fill.css('background-color', percent>=1?'#0f0':rgbToStr(colors.paint));

  var bottom, maxSpill = 12000;

  if(canvasData.spill >= maxSpill) {
    bottom = height-10;
  } else {
    bottom = (height-10)*canvasData.spill/maxSpill+2;
  }

  var $spillSlider = $('#spill-warning .slider-mark');
  $spillSlider.animate({bottom:bottom}, 80, 'linear');
}

function updatePercentAsync() {
  setTimeout(updatePercentPainted, 0);
}

function setupLevel(level) {
  var ctx = getContext();
  ctx.save();
  ctx.globalCompositeOperation = 'normal';
  switch(level) {
    case 1:
      ctx.fillStyle = rgbToStr(colors.canvas);
      ctx.fillRect(0, 0, 500, 500);
      ctx.fillStyle = rgbToStr(colors.shape);
      ctx.beginPath();
      ctx.arc(250, 200, 225, 0, Math.PI);
      ctx.fill();
      break;
    default:
      break;
  }
  ctx.restore();
}

function setupContext(ctx, type) {
  if (type=='painting') {
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.strokeStyle = ctx.fillStyle = rgbToStr(colors.paint);
    ctx.globalCompositeOperation = 'darken';
  }
}

function drawPolygon(ctx, x, y, sides, size, options) {
  options = options || {};
  ctx.beginPath();
  for (var i = 0; i < sides; i++) {
    var angle = (Math.PI*2/sides)*i;
    angle = options.rotation ? angle+options.rotation : angle;
    var ptX = x+size*Math.cos(angle);
    var ptY = y+size*Math.sin(angle);
    if (i) {
      ctx.lineTo(ptX, ptY);
    } else {
      ctx.moveTo(ptX, ptY);
    }
  }
  ctx.closePath();
  if (options.style=='fill') {
    if(options.color) ctx.fillStyle=options.color;
    ctx.fill();
  } else {
    if(options.color) ctx.strokeStyle=options.color;
    ctx.stroke();
  }
}

function drawReticle() {
  var $reticle = $('#reticle');
  var ctx = getContext($reticle);
  ctx.clearRect(0, 0, $reticle.width(), $reticle.height());
  ctx.lineWidth = 1;

  var centerX = $reticle.width()/2;
  var centerY = $reticle.height()/2;

  var innerColor = rgbToStr(colors.innerReticle);
  var outerColor = rgbToStr(colors.outerReticle);

  if(currentBrushType == brushTypes.circle) {
    ctx.strokeStyle = innerColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, getBrushSize(), 0, 2*Math.PI);
    ctx.stroke();

    ctx.strokeStyle = outerColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, getBrushSize()+1, 0, 2*Math.PI);
    ctx.stroke();
  } else if (currentBrushType == brushTypes.triangle) {
    drawPolygon(ctx, centerX, centerY, 3, getBrushSize(),
                {style:'stroke', rotation:Math.PI/6, color: innerColor});
    drawPolygon(ctx, centerX, centerY, 3, getBrushSize()+1,
                {style:'stroke', rotation:Math.PI/6, color: outerColor});
  } else if (currentBrushType == brushTypes.square) {
    drawPolygon(ctx, centerX, centerY, 4, getBrushSize(),
                {style:'stroke', rotation:Math.PI/4, color: innerColor});
    drawPolygon(ctx, centerX, centerY, 4, getBrushSize()+1,
                {style:'stroke', rotation:Math.PI/4, color: outerColor});
  }
}

function updateReticle(e) {
  var $reticle = $('#reticle');
  var size = $reticle.height();
  $reticle.css('top', e.pageY-size/2);
  $reticle.css('left', e.pageX-size/2);
}

function drawPoint(ctx, pt) {
  setupContext(ctx,'painting');
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, getBrushSize(), 0, Math.PI*2);
  ctx.fill();
}

function redrawGame(ctx) {
  setupLevel(currentLevel);
  setupContext(ctx,'painting');

  var total = 0;
  for (var j = 0; j < strokes.length; j++) {
    var points = strokes[j];

    if (!points.length) continue;
    if (points.length===1) drawPoint(ctx, points[0]);

    var p1 = points[0];
    var p2 = points[1];

    ctx.lineWidth = p1.brushSize*2;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);

    for (var i=1; i< points.length; i++) {
      var midPoint = midPointBtw(p1, p2);
      ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      p1 = points[i];
      p2 = points[i+1];
      total++;
    }
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
  if(total%10===0) updatePercentAsync();
}

$(document).ready(function(){
  $('#percent-painted .slider-fill').css('background-color', rgbToStr(colors.paint));
  
  var $canvas = $('#game');
  var ctx = getContext($canvas);

  drawReticle();
  setupLevel(currentLevel);

  $canvas.on('mousedown', function(e) {
    isDrawing = true;
    if (!strokes.length) strokes.push([]);

    var pt = getPathPoint($canvas[0], e);
    strokes[strokes.length-1].push(pt);

    drawPoint(ctx, pt);
  });

  $canvas.on('mousemove', function(e) {
    updateReticle(e);
    if (!isDrawing) return;

    var curPos = getPathPoint($canvas[0], e);
    var lastPos = strokes[strokes.length-1].slice(-1)[0];
    if (getDistance(lastPos, curPos) < 2) return;

    strokes[strokes.length-1].push(curPos);
    redrawGame(ctx);
  });

  $canvas.on('mouseover', function(e) {
    $('#reticle').show();
  });

  $canvas.on('mouseout', function(e) {
    $('#reticle').hide();
  });

  $(document).on('mouseup', function() {
    isDrawing = false;
    if (strokes.length && strokes[strokes.length-1].length > 0) strokes.push([]);
    updatePercentPainted();
  });

  $(document).keydown(function(e) {
    switch(e.which) {
      case 38: // up arrow
        e.preventDefault();
        currentSizeIndex = Math.min(currentBrushType.sizes.length-1, currentSizeIndex+1);
        break;
      case 40: // down arrow
        e.preventDefault();
        currentSizeIndex = Math.max(0, currentSizeIndex-1);
        break;
      case 37: // left arrow
        var typeIndex = currentBrushType.index;
        if(typeIndex>0) {
          typeIndex--;
          currentBrushType = Object.values(brushTypes).find(value => value.index === typeIndex);
          drawReticle();
        }
        break;
      case 39: // right arrow
        var typeIndex = currentBrushType.index;
        var brushValues = Object.values(brushTypes);
        if(typeIndex<brushValues.length-1) {
          typeIndex++;
          currentBrushType = brushValues.find(value => value.index === typeIndex);
          drawReticle();
        }
        break;
      default:
        break;
    }
    drawReticle();
  });

  $('#eraser').click(function() {
    strokes.length = 0;
    setupLevel(currentLevel);
    updatePercentPainted();
  });
});
