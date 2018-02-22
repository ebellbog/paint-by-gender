colors = {
  paint: [255, 150, 150],//'#bd354d'
  canvas: [132, 189, 250],
  shape: [255, 255, 255],
  spill: [132, 150, 150]
};

strokes = [];
isDrawing = 0;

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

function getCursorPos(canvas, e) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX-rect.left,
    y: e.clientY-rect.top
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
    bottom = height-7;
  } else {
    bottom = (height-7)*canvasData.spill/maxSpill+2;
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
    ctx.lineWidth = 30;
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.strokeStyle = ctx.fillStyle = rgbToStr(colors.paint);
    ctx.globalCompositeOperation = 'darken';
  }
}

function drawReticle() {
  var $reticle = $('#reticle');
  var ctx = getContext($reticle);
  ctx.lineWidth = 1;

  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.arc(30, 30, 15, 0, 2*Math.PI);
  ctx.stroke();

  ctx.strokeStyle = '#ddd';
  ctx.beginPath();
  ctx.arc(30, 30, 16, 0, 2*Math.PI);
  ctx.stroke();
}

function updateReticle(e) {
  var $reticle = $('#reticle');
  var size = $reticle.height();
  $reticle.css('top', e.clientY-size/2+2);
  $reticle.css('left', e.clientX-size/2+2);
}

function drawPoint(ctx, pt) {
  setupContext(ctx,'painting');
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, 15, 0, Math.PI*2);
  ctx.fill();
}

function redrawGame(ctx) {
  setupLevel(1);
  setupContext(ctx,'painting');

  var total = 0;
  for (var j = 0; j < strokes.length; j++) {
    var points = strokes[j];

    if (!points.length) continue;
    if (points.length===1) drawPoint(ctx, points[0]);

    var p1 = points[0];
    var p2 = points[1];

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
  setupLevel(1);

  $canvas.on('mousedown', function(e) {
    isDrawing = true;
    if (!strokes.length) strokes.push([]);

    var pt = getCursorPos($canvas[0], e);
    strokes[strokes.length-1].push(pt);

    drawPoint(ctx, pt);
  });

  $canvas.on('mousemove', function(e) {
    updateReticle(e);
    if (!isDrawing) return;

    var curPos = getCursorPos($canvas[0], e);
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

  $('#eraser').click(function() {
    strokes.length = 0;
    setupLevel(1);
    updatePercentPainted();
  });
});
