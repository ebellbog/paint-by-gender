colors = {
  paint: [255, 150, 150],//'#bd354d'
  canvas: [132, 189, 250],
  shape: [255, 255, 255],
  spill: [132, 150, 150],
  innerReticle: [153, 153, 153],
  outerReticle: [221, 221, 221]
};

brushTypes = [
  {sides: 0, sizes:[8, 20, 28]},
  {sides: 4, sizes:[8, 20, 28]},
  {sides: 3, sizes:[12, 24, 36]}
];

gameState = {
  level: 1,
  levelComplete: 0,
  startTime: 0,
  maxTime: 30,
  strokes: [],
  buffer: [],
  isDrawing: 0,
  toolOptions: [0, 0, 0]
}

/* Helper functions */

function getBrushType() {
  return brushTypes[gameState.toolOptions[1]];
}

function getBrushSize() {
  return getBrushType().sizes[gameState.toolOptions[0]];
}

function getBrushSides() {
  return getBrushType().sides;
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

/* Logic functions */

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

  var bottom, maxSpill = 12000;

  if (canvasData.spill >= maxSpill) {
    bottom = height-10;
  } else {
    bottom = (height-10)*canvasData.spill/maxSpill+2;
  }

  var $spillSlider = $('#spill-warning .slider-mark');
  $spillSlider.animate({bottom:bottom}, 80, 'linear');

  if (gameState.levelComplete) return;
  else if (canvasData.spill >= maxSpill) {
    $spillSlider.css('background-color', 'red');
    gameState.isDrawing = false;
    gameState.levelComplete = true;
    setTimeout(()=>alert('Oops, you\'ve transgressed too far! Polite society won\'t stand for it \:\('), 100);
  }
  else if(percent >= 1 && !gameState.levelComplete) {
    $fill.css('background-color', '#0f0');
    $fill.css('border-radius', '5px');
    gameState.isDrawing = false;
    gameState.levelComplete = true;
    setTimeout(()=>alert(`Congrats, you passed Level ${gameState.level}!`), 100);
  }

}

function updatePercentAsync() {
  setTimeout(updatePercentPainted, 0);
}

/* Setup & draw functions */

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

      // generated at http://www.victoriakirst.com/beziertool/
      var xoff = -35, yoff = -10;
      ctx.moveTo(289 + xoff, 446 + yoff);
      ctx.bezierCurveTo(197 + xoff, 355 + yoff, 150 + xoff, 316 + yoff, 89 + xoff, 236 + yoff);
      ctx.bezierCurveTo(67 + xoff, 207 + yoff, 77 + xoff, 124 + yoff, 144 + xoff, 100 + yoff);
      ctx.bezierCurveTo(225 + xoff, 71 + yoff, 273 + xoff, 145 + yoff, 291 + xoff, 184 + yoff);
      ctx.bezierCurveTo(296 + xoff, 171 + yoff, 347 + xoff, 60 + yoff, 440 + xoff, 101 + yoff);
      ctx.bezierCurveTo(516 + xoff, 135 + yoff, 500 + xoff, 219 + yoff, 469 + xoff, 248 + yoff);

      ctx.fill();
      break;
    default:
      break;
  }
  ctx.restore();
  updateLevelIcon(level);
}

function setupContext(ctx, type) {
  if (type=='painting') {
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.strokeStyle = ctx.fillStyle = rgbToStr(colors.paint);
    ctx.globalCompositeOperation = 'darken';
  } else if (type=='timer') {
    ctx.lineWidth = 8;
    ctx.lineCap = 'butt';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY= 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'gray';
  }
}

function getPolyPath(x, y, sides, size, rotation) {
  var path = [];
  var rotation = rotation || (Math.PI-(Math.PI*2/sides))/2;
  for (var i = 0; i < sides; i++) {
    var angle = (Math.PI*2/sides)*i + rotation;
    var ptX = x+size*Math.cos(angle);
    var ptY = y+size*Math.sin(angle);
    path.push({x: ptX, y:ptY});
  }
  return path;
}

function drawPolygon(ctx, x, y, sides, size, options) {
  options = options || {};

  var path = getPolyPath(x, y, sides, size, options.rotation);
  var start = path.shift();

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  path.map(p => ctx.lineTo(p.x, p.y));
  ctx.closePath();

  if (options.style=='fill') {
    if(options.color) ctx.fillStyle=options.color;
    ctx.fill();
  } else {
    if(options.color) ctx.strokeStyle=options.color;
    ctx.stroke();
  }
}

function joinPolys(ctx, p1, p2) {
  if (p1.length != p2.length) return;
  for (var i = 0; i < p1.length; i++) {
    var j = (i+1)%p1.length;
    ctx.beginPath();
    ctx.moveTo(p1[i].x, p1[i].y);
    ctx.lineTo(p1[j].x, p1[j].y);
    ctx.lineTo(p2[j].x, p2[j].y);
    ctx.lineTo(p2[i].x, p2[i].y);
    ctx.fill();
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

  if (!getBrushSides()) {
    ctx.strokeStyle = innerColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, getBrushSize(), 0, 2*Math.PI);
    ctx.stroke();

    ctx.strokeStyle = outerColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, getBrushSize()+1, 0, 2*Math.PI);
    ctx.stroke();
  } else {
    drawPolygon(ctx, centerX, centerY, getBrushSides(), getBrushSize(),
                {style:'stroke', color: innerColor});
    drawPolygon(ctx, centerX, centerY, getBrushSides(), getBrushSize()+1,
                {style:'stroke', color: outerColor});
  }
}

function updateReticle(e) {
  var canvas = $('#canvas-texture')[0];
  var rect = canvas.getBoundingClientRect();

  var $reticle = $('#reticle');
  var size = $reticle.height();

  $reticle.css('top', e.clientY-rect.top+canvas.offsetTop-size/2);
  $reticle.css('left',e.clientX-rect.left-size/2);
}

function updateSelectors(animated) {
  gameState.toolOptions.map((v,i)=>setSelector(i,v,animated));
}

function setSelector(toolIndex, optionIndex, animated) {
  var $tool = $(`#tools .tool-wrapper:eq(${toolIndex})`);
  var $selector = $tool.find('.option-selector');
  var $option = $tool.find(`.tool-option:eq(${optionIndex})`);

  var position = $option.position();
  if (animated) {
    $selector.animate({'left':position.left+2}, 500);
  } else {
    $selector.css('left', position.left+2);
  }
}

function updateTexture() {
  $('#canvas-texture').css('top', $('#game')[0].offsetTop);
}

function drawPoint(ctx, pt) {
  setupContext(ctx,'painting');
  if (!getBrushSides()) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.brushSize, 0, Math.PI*2);
    ctx.fill();
  } else {
    drawPolygon(ctx, pt.x, pt.y, getBrushSides(), pt.brushSize, {style:'fill'});
  }
}

function drawPath(ctx, pts) {
  if (!getBrushSides()) {
    var p1 = pts[0];
    var p2 = pts[1];

    ctx.lineWidth = p1.brushSize*2;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);

    for (var i = 1; i < pts.length; i++) {
      var midPoint = midPointBtw(p1, p2);
      ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      p1 = pts[i];
      p2 = pts[i+1];
    }
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  } else {
    drawPoint(ctx, pts[0]); // start cap
    for (var i = 0; i < pts.length-1; i++) {
      var p1 = getPolyPath(pts[i].x, pts[i].y, getBrushSides(), pts[i].brushSize);
      var p2 = getPolyPath(pts[i+1].x, pts[i+1].y, getBrushSides(), pts[i+1].brushSize);
      joinPolys(ctx, p1, p2);
    }
    drawPoint(ctx, pts[pts.length-1]); // end cap
  }
}

function redrawGame(ctx) {
  setupLevel(gameState.level);
  setupContext(ctx,'painting');

  var total = 0;
  for (var j = 0; j < gameState.strokes.length; j++) {
    var points = gameState.strokes[j];
    total += points.length;

    if (!points.length) continue;
    if (points.length===1) drawPoint(ctx, points[0]);
    else drawPath(ctx, points);
  }
  if(total%10===0) updatePercentAsync();
}

/* Initialization & event handlers */

function updateLevelIcon(level) {
  var $levelIcon = $('#level-icon');
  var iconList = [];
  var openCircle = '&#9675';
  var closedCircle = '&#9679';
  for (var i = 0; i < 6; i++) {
    iconList.push(i< level ? closedCircle : openCircle);
  }
  $levelIcon.html(iconList.join('&nbsp;'));
}

function updateTimeRing() {
  var $ring = $('#time-ring');
  var ringSize = $ring.height();
  var ctx = getContext($ring);
  ctx.clearRect(0, 0, ringSize, ringSize);
  setupContext(ctx, 'timer');

  var radius = 75;
  var center = ringSize/2;

  ctx.strokeStyle = 'rgba(90, 90, 90, 0.25)';
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, 2*Math.PI);
  ctx.stroke();

  var elapsed = (Date.now()-gameState.startTime)/1000;
  var remaining = gameState.maxTime-elapsed;

  var angle, min, sec;
  if (elapsed > gameState.maxTime) {
    angle = min = sec = 0;
  } else {
    angle = (2*Math.PI)*(1-elapsed/gameState.maxTime);
    min = Math.floor(remaining/60);
    sec = Math.round(remaining)-60*min;
  }

  $('#time').html(min.toString()+':'+(sec<10?'0':'')+sec.toString());

  if (remaining > 5) {
    ctx.strokeStyle = 'white';
  } else {
    var greenblue = Math.abs(Math.round(255*Math.cos((remaining-5)*Math.PI)));
    ctx.strokeStyle = rgbToStr([255, greenblue, greenblue]);
  }

  ctx.beginPath();
  ctx.arc(center, center, radius, 0, angle);
  ctx.stroke();

  if (angle > 0) {
    setTimeout(updateTimeRing, 10);
  } else {
    gameState.isDrawing = 0;
    gameState.levelComplete = 1;
    //setTimeout(()=>alert('Oh no, you\'re out of time! You got clocked :('), 100);
  }
}

function startGame() {
  $('#percent-painted .slider-fill').css('background-color', rgbToStr(colors.paint));
  $('#percent-painted .slider-fill').css('border-radius', '0px 0px 5px 5px');
  $('#spill-warning .slider-mark').css('background-color', 'rgba(50, 50, 50, 0.6');

  $('#strokes').html(0);

  gameState.strokes = [];
  gameState.isDrawing = 0;
  gameState.startTime = Date.now();
  gameState.toolOptions = [0,0,0];

  if (gameState.levelComplete) {
    updateTimeRing();
    gameState.levelComplete = 0;
  }

  drawReticle();
  setupLevel(gameState.level);
  updatePercentPainted();
}

$(document).ready(function(){
  startGame();
  setTimeout(updateTexture, 100);
  updateTimeRing();
  updateSelectors(0);

  var $canvas = $('#game');
  var ctx = getContext($canvas);

  $canvas.on('mousedown', function(e) {
    gameState.isDrawing = 1;
    gameState.buffer = [];

    var strokes = gameState.strokes;
    if (!strokes.length) strokes.push([]);

    var pt = getPathPoint($canvas[0], e);
    strokes[strokes.length-1].push(pt);

    drawPoint(ctx, pt);
    updatePercentAsync();
    $('#strokes').html(strokes.length);
  });

  $canvas.on('mousemove', function(e) {
    updateReticle(e);
    if (!gameState.isDrawing) return;

    var strokes = gameState.strokes;
    var buffer = gameState.buffer;

    var curPos = getPathPoint($canvas[0], e);
    buffer.push(curPos);

    if (buffer.length > 3) {
      var totals = buffer.reduce((a,b) => ({x:a.x+b.x, y:a.y+b.y}));
      var avgPos = {x: totals.x/buffer.length, y: totals.y/buffer.length, brushSize: buffer[0].brushSize};

      strokes[strokes.length-1].splice(-(buffer.length-1), buffer.length-1, avgPos);
      gameState.buffer = [];
    } else {
      strokes[strokes.length-1].push(curPos);
    }
    redrawGame(ctx);
  });

  $canvas.on('mouseover', function(e) {
    $('#reticle').show();
  });

  $canvas.on('mouseout', function(e) {
    $('#reticle').hide();
  });

  $(document).on('mouseup', function() {
    gameState.isDrawing = false;
    var strokes = gameState.strokes;
    if (strokes.length && strokes[strokes.length-1].length > 0) strokes.push([]);
    updatePercentPainted();
  });

  $(document).keydown(function(e) {
    e.preventDefault();
    switch(e.which) {
      case 38: // up arrow
        gameState.toolOptions[0] = Math.min(getBrushType().sizes.length-1, gameState.toolOptions[0]+1);
        break;
      case 40: // down arrow
        gameState.toolOptions[0] = Math.max(0, gameState.toolOptions[0]-1);
        break;
      case 37: // left arrow
        gameState.toolOptions[1] = Math.max(0, gameState.toolOptions[1]-1);
        break;
      case 39: // right arrow
        gameState.toolOptions[1] = Math.min(brushTypes.length-1, gameState.toolOptions[1]+1);
        break;
      default:
        break;
    }
    drawReticle();
  });

  $('#eraser').click(function() {
    startGame();
  });

  $(window).resize(function() {
    updateTexture();
    updateSelectors(0);
  });
});
