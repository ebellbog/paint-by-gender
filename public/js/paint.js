function midPointBtw(p1, p2) {
  return {
    x: p1.x + (p2.x - p1.x) / 2,
    y: p1.y + (p2.y - p1.y) / 2
  };
}

function getCursorPos(canvas, e) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX-rect.left,
    y: e.clientY-rect.top
  };
}

function getPercentPainted() {
  var ctx = getContext();
  var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data;
  var white = 0, painted = 0;
  var reducer = function(accumulator, currentValue){return accumulator+currentValue};
  
  for (var i = 0; i < imageData.length; i+=4) {
    var pixel = imageData.slice(i, i+3);
    var sum = pixel.reduce(reducer);
    if (sum > 0) {
      painted++;
    } else {
      white++;
    }
  }
  return painted/(painted+white);
}

function updatePercentPainted() {
  var ctx = getContext();
  var value = getPercentPainted(ctx)*100;
  var rounded = Math.round(value*100)/100;
  $('#percent-painted').html(rounded+'%');
}

function getContext($canvas) {
  if (!$canvas) $canvas = $('#game');
  var ctx = $canvas[0].getContext('2d');
  return ctx;
}

$(document).ready(function(){
  var $canvas = $('#game');
  var ctx = getContext($canvas);

  ctx.lineWidth = 15;
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.strokeStyle = '#bd354d'; //#ff9696

  var isDrawing, strokes = [];

  $canvas.on('mousedown', function(e) {
    isDrawing = true;
    if (!strokes.length) strokes.push([]);
    strokes[strokes.length-1].push(getCursorPos($canvas[0], e));
  });

  $canvas.on('mousemove', function(e) {
    if (!isDrawing) return;

    strokes[strokes.length-1].push(getCursorPos($canvas[0], e));

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
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
    //if(total%25===0) updatePercentPainted();
  });

  $(document).on('mouseup', function() {
    isDrawing = false;
    if (strokes[strokes.length-1].length > 0) strokes.push([]);
    updatePercentPainted();
  });

  $('#eraser').click(function() {
    strokes.length = 0;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    updatePercentPainted();
  });
});
