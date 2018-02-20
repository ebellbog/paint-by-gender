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

function getPercentPainted() {
  var ctx = getContext();
  var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data;
  var white = 0, painted = 0;
  
  for (var i = 0; i < imageData.length; i+=4) {
    if (imageData[i] == 255) {
      white++;
    } else if (imageData[i] == 132) {
      continue;
    } else {
      painted++;
    }
  }
  return painted/(painted+white);
}

function updatePercentPainted() {
  var ctx = getContext();
  var percent = getPercentPainted(ctx);

  var $slider = $('.slider-outline').first();
  var height = $slider.height();
  var $fill = $('.slider-fill');
  $fill.animate({height: height*percent}, 100, 'linear');
}

function updatePercentAsync() {
  setTimeout(updatePercentPainted, 0);
}

function setupLevel(level) {
  var ctx = getContext();
  switch(level) {
    case 1:
      ctx.fillStyle = 'rgb(132, 189, 250)';
      ctx.fillRect(0, 0, 500, 500);
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(250, 200, 225, 0, Math.PI);
      ctx.fill();
      break;
    default:
      break;
  }
}

$(document).ready(function(){
  var paintColor = '#bd354d'; //#ff9696
  $('.slider-fill').css('background-color', paintColor);

  var $canvas = $('#game');
  var ctx = getContext($canvas);

  ctx.lineWidth = 15;
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.strokeStyle = paintColor;

  var isDrawing, strokes = [];
  setupLevel(1);

  $canvas.on('mousedown', function(e) {
    isDrawing = true;
    if (!strokes.length) strokes.push([]);
    strokes[strokes.length-1].push(getCursorPos($canvas[0], e));
  });

  $canvas.on('mousemove', function(e) {
    if (!isDrawing) return;

    var lastPos = strokes[strokes.length-1].slice(-1)[0];
    var curPos = getCursorPos($canvas[0], e);

    if (getDistance(lastPos, curPos) < 2) return;

    strokes[strokes.length-1].push(curPos);

    setupLevel(1);
    //ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    var total = 0;
    for (var j = 0; j < strokes.length; j++) {
      var points = strokes[j];

      var p1 = points[0];
      var p2 = points[1];

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);

      for (var i = 1, len = points.length; i < len; i++) {
        var midPoint = midPointBtw(p1, p2);
        ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
        p1 = points[i];
        p2 = points[i+1];
        total++;
      }
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    if(total%25===0) updatePercentAsync();
  });

  $(document).on('mouseup', function() {
    isDrawing = false;
    if (strokes.length && strokes[strokes.length-1].length > 0) strokes.push([]);
    updatePercentPainted();
  });

  $('#eraser').click(function() {
    strokes.length = 0;
    setupLevel(1);
    //ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    updatePercentPainted();
  });
});
