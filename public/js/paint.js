colors = {
  paint: [255, 150, 150],//'#bd354d'
  canvas: [132, 189, 250],
  shape: [255, 255, 255],
  spill: [132, 150, 150],
  innerReticle: [153, 153, 153],
  outerReticle: [221, 221, 221],
  toolOption: [255, 255, 255]
};

brushTypes = [
  {sides: 0, sizes:[8, 20, 28]},
  {sides: 4, sizes:[8, 20, 28]},
  {sides: 3, sizes:[12, 24, 36]}
];

gameMode = {
  ready: 0,
  starting: 1,
  playing: 2,
  complete: {success: 3, failure: 4},
}

gameState = {
  level: 1,
  mode: gameMode.ready,
  startTime: 0,
  maxTime: 30,
  strokes: [],
  buffer: [],
  isDrawing: 0,
  toolOptions: [1, 0, 0],
  toolFocus: 3
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

function getOptionCount() {
  var $tool = $(`#tools .tool-wrapper:eq(${gameState.toolFocus})`);
  return $tool.find('.tool-option').length;
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

  if (gameState.mode != gameMode.playing) return;
  else if (canvasData.spill >= maxSpill) {
    $spillSlider.css('background-color', 'red');
    gameState.isDrawing = false;
    gameState.mode = gameMode.complete.failure;
    setTimeout(()=>alert('Oops, you\'ve transgressed too far! Polite society won\'t stand for it \:\('), 100);
  }
  else if(percent >= 1 && gameState.mode == gameMode.playing) {
    $fill.css('background-color', '#0f0');
    $fill.css('border-radius', '5px');
    gameState.isDrawing = false;
    gameState.mode = gameMode.complete.failure;
    setTimeout(()=>alert(`Congrats, you passed Level ${gameState.level}!`), 100);
  }

}

function updatePercentAsync() {
  setTimeout(updatePercentPainted, 0);
}

/* Setup & draw functions */

function setupButtons() {
  switch(gameState.mode) {
    case gameMode.ready:
      $('#start').removeClass('inactive');
      $('#start').css('display','inline-block');
      $('#restart, #eraser').css('display','none');
      break;
    case gameMode.starting:
      $('#start').addClass('inactive');
      break;
    case gameMode.playing:
      $('#start').css('display','none');
      $('#restart, #eraser').css('display', 'inline-block');
      break;
    default:
      break;
  }
}

function setupLevel(level) {
  // configure level-specific colors
  $('#percent-painted .slider-fill').css('background-color', rgbToStr(colors.paint));
  $('#game-background').css('background-color', rgbToStr(colors.canvas));

  var ctx = getContext();
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
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

function setGameFade(amount) {
  var blur = 40*amount;
  var saturate = 100-(50*amount);

  var filter = amount > 0.001 ? `blur(${blur}px) saturate(${saturate}%)` : 'none';
  $('#game, #canvas-texture').css('filter', filter);
}

function fadeIn(options) {
  var amount = options.amount || options.start || 1;
  setGameFade(amount);

  var duration = options.duration || 2;
  var delta = options.delta || 0.005;
  var timeDelta = 1000*duration*delta;

  var newOptions = {duration:duration,
                    amount:amount-delta,
                    delta:delta,
                    callback:options.callback};
  if (amount>0) {
    setTimeout(()=>fadeIn(newOptions), timeDelta)
  } else  {
    options.callback();
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

function drawToolOptions() {
  var toolColor = rgbToStr(colors.toolOption);

  // draw brush size

  var sides = getBrushSides();
  var size = sides ? 5 : 4;

  $('#brush-size canvas').each(function() {
    var $canvas = $(this);
    var ctx = getContext($canvas);
    ctx.clearRect(0, 0, $canvas.width(), $canvas.height());

    var centerX = $canvas.width()/2;
    var centerY = centerX;

    if (!sides) {
      ctx.fillStyle = toolColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size, 0, Math.PI*2);
      ctx.fill();
      size += 6;
    } else {
      var centerX = $canvas.width()/2;
      var centerY = centerX;
      if (sides == 3) centerY += 4;
      drawPolygon(ctx, centerX, centerY, sides, size, {style:'fill', color: toolColor});
      size += 7;
    }
  });

  // draw brush shape

  var sideValues = brushTypes.map(v => v.sides);

  $('#brush-shape canvas').each(function(index) {
    var $canvas = $(this);
    var ctx = getContext($canvas);
    ctx.clearRect(0, 0, $canvas.width(), $canvas.height());

    var centerX = $canvas.width()/2;
    var centerY = centerX;
    size = 12;

    sides = sideValues[index];
    if (!sides) {
      ctx.fillStyle = toolColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size-1, 0, Math.PI*2);
      ctx.fill();
    } else {
      var centerX = $canvas.width()/2;
      var centerY = centerX;
      if (sides == 3) centerY += 4;
      drawPolygon(ctx, centerX, centerY, sides, size, {style:'fill', color: toolColor});
    }
  });
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

  $selector.toggleClass('focus', toolIndex == gameState.toolFocus);

  var position = $option.position();
  if (animated) {
    $selector.animate({'left':position.left}, 300);
  } else {
    $selector.css('left', position.left);
  }
}

function alignGameLayers() {
  var offsetTop = $('#game')[0].offsetTop;
  $('#canvas-texture').css('top', offsetTop);
  $('#game-background').css('top', offsetTop);
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

function setTimer(elapsed, max) {
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

  var remaining = max-elapsed;

  var angle, min, sec;
  if (elapsed > max) {
    angle = min = sec = 0;
  } else {
    angle = (2*Math.PI)*(1-elapsed/max);
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
}

function updateTimeRing() {
  var elapsed = (Date.now()-gameState.startTime)/1000;
  setTimer(elapsed, gameState.maxTime);

  if (elapsed < gameState.maxTime) {
    var gm = gameState.mode;
    if (gm==gameMode.playing||gm==gameMode.starting) {
      setTimeout(updateTimeRing, 10);
    }
  } else {
    gameState.mode = gameMode.complete.failure;
    gameState.isDrawing = 0;
    //setTimeout(()=>alert('Oh no, you\'re out of time! You got clocked :('), 100);
  }
}

function restartTimer() {
  gameState.startTime = Date.now();
  if (gameState.mode != gameMode.playing) {
    updateTimeRing();
  }
}

function startGame() {
  $('#percent-painted .slider-fill').css('border-radius', '0px 0px 5px 5px');
  $('#spill-warning .slider-mark').css('background-color', 'rgba(50, 50, 50, 0.6');

  gameState.strokes = [];
  gameState.isDrawing = 0;
  gameState.toolOptions = [1,0,0];
  gameState.toolFocus = gameState.toolOptions.length;

  gameState.mode = gameMode.ready;

  // use timeout to ensure any existing
  // timer loop has stopped executing
  setTimeout(()=>setTimer(0,gameState.maxTime), 50);

  drawReticle();
  drawToolOptions();
  setupLevel(gameState.level);
  updatePercentPainted();
  updateSelectors(0);
  setGameFade(1);
  setupButtons();
}

$(document).ready(function(){
  startGame();
  setTimeout(alignGameLayers, 100);

  var $canvas = $('#game');
  var ctx = getContext($canvas);

  $(document).on('mousedown', function(e) {
    //only respond to clicks outside the game space
    if ($(e.target).closest('#game').length) return;

    gameState.toolFocus = gameState.toolOptions.length;
    updateSelectors(0);
  });

  $('.tool-option').click(function(e) {
    var optionIndex = $(e.target).index();
    var toolIndex = $(e.target).parents('.tool-wrapper').first().index();
    gameState.toolOptions[toolIndex] = optionIndex;
    setSelector(toolIndex, optionIndex, false);
    drawReticle();
    drawToolOptions();
  });

  $canvas.on('mousedown', function(e) {
    if (gameState.mode != gameMode.playing) return;

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
    var pressedArrow = true;
    switch(e.which) {
      case 38: // up arrow
        var n = gameState.toolOptions.length+1; // fix mod for negatives
        gameState.toolFocus = (gameState.toolFocus-1+n)%n;
        break;
      case 40: // down arrow
        gameState.toolFocus = (gameState.toolFocus+1)%(gameState.toolOptions.length+1);
        break;
      case 37: // left arrow
        if (gameState.toolFocus === gameState.toolOptions.length) gameState.toolFocus = 0;
        gameState.toolOptions[gameState.toolFocus] = Math.max(0, gameState.toolOptions[gameState.toolFocus]-1);
        break;
      case 39: // right arrow
        if (gameState.toolFocus === gameState.toolOptions.length) gameState.toolFocus = 0;
        gameState.toolOptions[gameState.toolFocus] = Math.min(
          getOptionCount()-1,
          gameState.toolOptions[gameState.toolFocus]+1);
        break;
      default:
        pressedArrow = false;
        break;
    }
    if (pressedArrow) e.preventDefault();
    updateSelectors(1);
    setTimeout(drawReticle, 200);
    setTimeout(drawToolOptions, 200);
  });

  $('#eraser').click(function() {
    gameState.strokes = [];
    gameState.isDrawing = 0;
    setupLevel(gameState.level);
    updatePercentPainted();
  });

  $('#restart').click(function() {
    startGame();
  });

  $('#start').click(function() {
    if (gameState.mode != gameMode.ready) return;

    gameState.mode = gameMode.starting;
    setupButtons();

    fadeIn({duration:1, callback:function(){
      restartTimer();
      gameState.mode = gameMode.playing;
      setupButtons();
    }});
  });

  $(window).resize(function() {
    alignGameLayers();
    updateSelectors(0);
  });
});
