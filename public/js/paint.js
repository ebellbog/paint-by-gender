/* Models & data */

levelData = {
  1: {
    name: 'The Cistem',
    description: 'Welcome to life on easy mode. The Cistem was built for you!',
    enabledTools: [1,0,0]
  },
  2: {
    name: 'Cistem Error',
    enabledTools: [1,0,0]
  },
  3: {
    name: 'Red Pill',
    enabledTools: [1,0,1]
  },
  4: {
    name: 'Antisocial Media',
    enabledTools: [1,0,1]
  },
  5: {
    name: 'Darker Times',
    enabledTools: [1,0,1]
  },
  6: {
    name: 'Trans-cendence',
    enabledTools: [1,1,1]
  }
}

colors = {
  paint: [255, 150, 150],
  canvas: [132, 189, 250],
  shape: [255, 255, 255],
  spill: [132, 150, 150],
  innerReticle: [153, 153, 153],
  outerReticle: [221, 221, 221],
  enabledOption: [255, 255, 255],
  disabledOption: [128, 0, 128]
};

brushTypes = [
  {sides: 0, sizes:[8, 20, 28]},
  {sides: 4, sizes:[8, 20, 28]},
  {sides: 3, sizes:[12, 24, 36]}
];

gameMode = {
  newLevel: 0,
  ready: 1,
  starting: 2,
  playing: 3,
  complete: 4,
}

gameOutcome = {
  passed: 0,
  transgressed: 1,
  clocked: 2
}

gameState = {
  level: 1,
  maxTime: 40,
  timerRunning: 0,
  toolOptions: [1,0,0],
  enabledOptions: [[1,1,1],[1,0,0],[1,0,0]]
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
    brushSize: getBrushSize(),
    brushSides: getBrushSides()
  };
}

function getContext($canvas) {
  if (!$canvas) $canvas = $('#game');
  var ctx = $canvas[0].getContext('2d');
  return ctx;
}

function isToolEnabled(index) {
  return levelData[gameState.level].enabledTools[index];
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
    gameState.outcome = gameOutcome.transgressed;
    setGameMode(gameMode.complete);
  }
  else if(percent >= 1 && gameState.mode == gameMode.playing) {
    $fill.css('background-color', '#0f0');
    $fill.css('border-radius', '5px');
    gameState.outcome = gameOutcome.passed;
    setGameMode(gameMode.complete);
  }
}

function updatePercentAsync() {
  setTimeout(updatePercentPainted, 0);
}

/* Setup functions */

function setupButtons() {
  switch(gameState.mode) {
    case gameMode.newLevel:
      $('#start').html(`START LEVEL ${gameState.level}`).css('display','inline-block');
      $('#retry, #eraser').css('display','none');
      break;
    case gameMode.ready:
      break;
    case gameMode.starting:
      $('.bottom-btn').addClass('inactive');
      break;
    case gameMode.playing:
      $('#start').css('display','none');
      $('#retry').html('RESTART').css({width: $('#eraser').css('width')});
      $('#retry, #eraser').css('display','inline-block');
      $('.bottom-btn').removeClass('inactive');
      break;
    case gameMode.complete:
      var passed = gameState.outcome == gameOutcome.passed;
      $('#retry').html(passed?'PLAY AGAIN':`RETRY LEVEL ${gameState.level}`).css({width: passed?'150px':'180px'});
      $('#eraser').css('display','none');
    default:
      break;
  }
}

function initLevel(level) {
  var enabled = levelData[level].enabledTools;
  $('.option-selector').each(function(index) {
    $(this).toggleClass('disabled',!enabled[index]);
  });
  $('#game-background').css('background-color', rgbToStr(colors.canvas));

  setTooltips(level);
  setLevelTitle(level)
  updateLevelIcon(level);
}

function resetLevel(level) {
  $('#percent-painted .slider-fill').css('background-color', rgbToStr(colors.paint));
  drawLevel(level)
}

function drawLevel(level) {
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
}

function setTooltips(level) {
  switch(level) {
    case 1:
      var notReady = "You're not ready for this yet";
      $('#lipstick, #pill-wrapper').parents('.tool-option').prop('title', notReady);
      break;
    default:
      break;
  }

  tippy('.tool-option[title]', {
    placement: 'bottom',
    maxWidth: '150px',
    theme: 'purple',
    arrow: true,
    dynamicTitle: true
  });
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

function setLevelTitle(level) {
  $('#level-number').html(`Level ${level}`);
  $('#level-name').html(levelData[level].name);
}

function setStartText(level) {
  var $title = $('#overlay-title');
  var $body = $('#overlay-body');

  $title.addClass('start-title').removeClass('end-title');
  $body.addClass('start-text').removeClass('end-text');

  $title.html(`${levelData[level].name}`);
  $body.html(levelData[level].description);
}

function setEndText(outcome, level) {
  var $title = $('#overlay-title');
  var $body = $('#overlay-body');

  $title.addClass('end-title').removeClass('start-title');
  $body.addClass('end-text').removeClass('start-text');

  switch(outcome) {
    case gameOutcome.passed:
      $title.html("Congrats!");
      $body.html("You played the game. You painted inside the lines and feel strangely validated.");
      break;
    case gameOutcome.transgressed:
      $title.html("Oops...");
      $body.html("You transgressed too far. People noticed, and they care way more than they should.");
      break;
    case gameOutcome.clocked:
      $title.html("You got clocked");
      $body.html("Time's up. Not everyone gets a chance to fulfill their purpose.");
      break;
    default:
      break;
  }
}

function setGameMode(mode) {
  switch(mode){
    case gameMode.newLevel:
        initLevel(gameState.level);
        setStartText(gameState.level);
        $('#overlay-text').show();
    case gameMode.ready:
      $('#percent-painted .slider-fill').css('border-radius', '0px 0px 5px 5px');
      $('#spill-warning .slider-mark').css('background-color', 'rgba(50, 50, 50, 0.6');
      $('#game').css('cursor','default');

      resetGameState();
      resetLevel(gameState.level);
      updatePercentPainted();
      addBlurLayer();
      setTimer(0,gameState.maxTime);
      break;
    case gameMode.starting:
      $('#overlay-text').hide();
      showCountdown(3, function() {
        flashStationary('Paint!', 1000, 400);
        fadeIn({duration:1, delay:0.5});
        setTimeout(restartTimer, 1000);
        setGameMode(gameMode.playing);
      });
      break;
    case gameMode.playing:
      $('#game').css('cursor','none');
      break;
    case gameMode.complete:
      gameState.isDrawing = 0;
      gameState.timerRunning = 0;

      $('#game').css('cursor','default');
      $('#reticle').hide();

      addBlurLayer(1);
      fadeOut({duration:0.5});

      setEndText(gameState.outcome, gameState.level);
      $('#overlay-title').addClass('smaller-title');
      $('#overlay-body').show();
      $('#overlay-text').css({opacity:0}).show().animate({opacity:1},1000);
    default:
      break;
  }
  gameState.mode = mode;
  setupButtons();
}

/* Poly draw functions */

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

/* Timer and time-based animations */

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
  if (!gameState.timerRunning) return;

  var elapsed = (Date.now()-gameState.startTime)/1000;
  setTimer(elapsed, gameState.maxTime);

  if (elapsed < gameState.maxTime) {
    setTimeout(updateTimeRing, 10);
  } else {
    gameState.timerRunning = 0;
    gameState.outcome = gameOutcome.clocked;
    setGameMode(gameMode.complete);
  }
}

function restartTimer() {
  gameState.startTime = Date.now();
  if (!gameState.timerRunning) {
    gameState.timerRunning = 1;
    updateTimeRing();
  }
}

function addBlurLayer(hidden) {
  $('#blurred-game').remove();

  var $game = $('#game');
  var $newGame = $(document.createElement('canvas'));
  $newGame.prop({width:500, height:500});
  $newGame.css({filter: 'blur(20px) saturate(60%) brightness(97%)'});

  var newCtx = getContext($newGame);
  newCtx.drawImage($game[0], 0, 0);

  var $wrapper = $(document.createElement('div'));
  $wrapper.prop({id:'blurred-game'});
  $wrapper.css({position: 'absolute',
                top: $game[0].offsetTop,
                left: 0,
                width: '500px',
                height: '500px',
                'z-index':3,
                opacity: hidden ? 0 : 1,
                overflow: 'hidden'});

  $wrapper.append($newGame);
  $('#main').append($wrapper);

  if(!hidden) {
    $game.css({opacity:0});
    $('#canvas-texture').css({opacity:0});
  }
}

function fadeIn(options) {
  var duration = options.duration*1000 || 1000;
  var delay = options.delay*1000 || 0;

  function cb() {
    $('#blurred-game').remove();
    if (options.callback) callback();
  }

  setTimeout(function(){
    $('#blurred-game').animate({opacity:0}, duration, cb);
    $('#game').animate({opacity:1}, duration*.5);
    $('#canvas-texture').animate({opacity:0.6}, duration*.5);
  }, delay);
}

function fadeOut(options) {
  var duration = options.duration*1000 || 1000;
  var delay = options.delay*1000 || 0;

  setTimeout(function(){
    $('#blurred-game').animate({opacity:1}, duration, options.callback);
  }, delay);
  setTimeout(function(){
    $('#game, #canvas-texture').animate({opacity:0}, duration*.5);
  }, delay+duration*.5);
}

function flashExpanding(message, duration, hold) {
  var hold = hold || 200;
  var $gameCell = $('td#main');
  var $number = $(document.createElement('div')).addClass('flash').html(message);
  $gameCell.append($number);
  setTimeout(()=>$number.animate({'font-size':'+=350', opacity:0}, duration-hold, ()=>$number.remove()), hold);
}

function flashStationary(message, duration, fade) {
  var fade = fade || 1000;
  var $gameCell = $('td#main');
  var $number = $(document.createElement('div')).addClass('flash').html(message);
  $gameCell.append($number);
  setTimeout(()=>$number.animate({opacity:0}, fade, ()=>$number.remove()), duration-fade);
}

function showCountdown(count, cb) {
  if (count > 0) {
    flashExpanding(count, 1200);
    setTimeout(()=>showCountdown(count-1, cb),1000);
  } else if (cb) cb();
}

/* Tool options & selectors */

function drawToolOptions() {
  var enabledColor = rgbToStr(colors.enabledOption);
  var disabledColor = rgbToStr(colors.disabledOption);

  // draw brush size

  var sides = getBrushSides();
  var size = sides ? 5 : 4;

  $('#brush-size canvas').each(function(index) {
    var $canvas = $(this);
    var ctx = getContext($canvas);
    ctx.clearRect(0, 0, $canvas.width(), $canvas.height());

    var centerX = $canvas.width()/2;
    var centerY = centerX;

    if (!sides) {
      ctx.fillStyle = enabledColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size, 0, Math.PI*2);
      ctx.fill();
      size += 6;
    } else {
      var centerX = $canvas.width()/2;
      var centerY = centerX;
      if (sides == 3) centerY += 4;
      drawPolygon(ctx, centerX, centerY, sides, size, {style:'fill', color: enabledColor});
      size += 7;
    }
  });

  // draw brush shape

  var sideValues = brushTypes.map(v => v.sides);

  $('#brush-shape canvas').each(function(index) {
    var optionColor = gameState.enabledOptions[1][index] ? enabledColor : disabledColor;
    var $canvas = $(this);
    var ctx = getContext($canvas);
    ctx.clearRect(0, 0, $canvas.width(), $canvas.height());

    var centerX = $canvas.width()/2;
    var centerY = centerX;
    size = 12;

    sides = sideValues[index];
    if (!sides) {
      ctx.fillStyle = optionColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size-1, 0, Math.PI*2);
      ctx.fill();
    } else {
      var centerX = $canvas.width()/2;
      var centerY = centerX;
      if (sides == 3) centerY += 4;
      drawPolygon(ctx, centerX, centerY, sides, size, {style:'fill', color: optionColor});
    }
  });

  // set tool type color

  $('#tool-type .tool-option').each(function(index) {
    var enabled = gameState.enabledOptions[2][index];
    if (index == 1) {
      var $img = $(this).find('img');
      $img.prop('src', enabled ? './img/lipstick.svg' : './img/lipstick_purple.svg');
    } else {
      $(this).css('color', enabled ? enabledColor : disabledColor);
    }
  });
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

function alignGameLayers() {
  var offsetTop = $('#game')[0].offsetTop;
  $('#canvas-texture, #game-background, #blurred-game').css('top', offsetTop);
}

/* Basic drawing */

function drawPoint(ctx, pt) {
  setupContext(ctx,'painting');
  if (!pt.brushSides) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.brushSize, 0, Math.PI*2);
    ctx.fill();
  } else {
    drawPolygon(ctx, pt.x, pt.y, pt.brushSides, pt.brushSize, {style:'fill'});
  }
}

function drawPath(ctx, pts) {
  var sides = pts[0].brushSides;
  var size = pts[0].brushSize;

  if (!sides) {
    var p1 = pts[0];
    var p2 = pts[1];

    ctx.lineWidth = size*2;
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
      var p1 = getPolyPath(pts[i].x, pts[i].y, sides, size);
      var p2 = getPolyPath(pts[i+1].x, pts[i+1].y, sides, size);
      joinPolys(ctx, p1, p2);
    }
    drawPoint(ctx, pts[pts.length-1]); // end cap
  }
}

function redrawGame(ctx) {
  drawLevel(gameState.level);
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
  var $iconWrapper = $('#level-icon-wrapper');
  var faClasses = 'fa-xs fa-fw fa-circle';

  var $circle = $(document.createElement('i')).addClass(faClasses);
  var $openCircle = $circle.clone().addClass('far');
  var $closedCircle = $circle.clone().addClass('fas');

  $iconWrapper.empty();
  for (var i = 0; i < 6; i++) {
    $iconWrapper.append(i< level ? $closedCircle.clone() : $openCircle.clone());
  }
}

function resetGameState() {
  gameState.strokes = [];
  gameState.isDrawing = 0;
  gameState.toolFocus = gameState.toolOptions.length;
  gameState.timerRunning = 0;
}

function initGame() {
  drawReticle();
  drawToolOptions();
  updateSelectors(0);
  setTimeout(alignGameLayers, 100);
}

$(document).ready(function(){
  initGame();
  setGameMode(gameMode.newLevel);

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
    if (!isToolEnabled(toolIndex)) return;

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
    if(gameState.mode==gameMode.playing)$('#reticle').show();
    updateReticle(e);

    if (!gameState.isDrawing) return;

    var strokes = gameState.strokes;
    var buffer = gameState.buffer;

    var curPos = getPathPoint($canvas[0], e);
    var lastPos = strokes[strokes.length-1].slice(-1)[0];

    if (getDistance(curPos, lastPos) < 10) {
      buffer.push(curPos);
    } else {
      gameState.buffer = [];
    }

    if (buffer.length > 3) {
      var totals = buffer.reduce((a,b) => ({x:a.x+b.x, y:a.y+b.y}));
      var avgPos = {x: totals.x/buffer.length, y: totals.y/buffer.length, brushSize: buffer[0].brushSize};

      strokes[strokes.length-1].splice(-(buffer.length-1), buffer.length-1, avgPos);
      gameState.buffer = [curPos];
    }
    strokes[strokes.length-1].push(curPos);
    redrawGame(ctx);
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
        var n = gameState.toolOptions.length+1;
        var newFocus = (gameState.toolFocus-1+n)%n; // fix mod for negatives
        while (newFocus < n-1 && !isToolEnabled(newFocus)) newFocus = (newFocus-1+n)%n;
        gameState.toolFocus = newFocus;
        break;
      case 40: // down arrow
        var newFocus  = (gameState.toolFocus+1)%(gameState.toolOptions.length+1);
        while (newFocus < gameState.toolOptions.length && !isToolEnabled(newFocus)) newFocus+=1;
        gameState.toolFocus = newFocus;
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
      case 13: // return key
        if (gameState.mode == gameMode.newLevel) {
          $('#start').click();
        } else if (gameState.mode == gameMode.complete) {
          $('#retry').click();
        }
        pressedArrow = false;
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
    if ($(this).hasClass('inactive')) return;
    gameState.strokes = [];
    gameState.isDrawing = 0;
    drawLevel(gameState.level);
    updatePercentPainted();
  });

  $('#retry').click(function() {
    if ($(this).hasClass('inactive')) return;
    setGameMode(gameMode.ready);
    setGameMode(gameMode.starting);
  });

  $('#start').click(function() {
    if ($(this).hasClass('inactive')) return;
    setGameMode(gameMode.starting);
  });

  $(window).resize(function() {
    alignGameLayers();
    updateSelectors(0);
  });
});
