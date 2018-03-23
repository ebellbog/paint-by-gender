/* Models & data */

colors = {
  innerReticle: [153, 153, 153],
  outerReticle: [221, 221, 221],
  enabledOption: [255, 255, 255],
  disabledOption: [110, 110, 110],
  white: [255, 255, 255],
  purple: [128, 0, 128],
  pink: [255, 150, 150],
  darkpink: [198, 83, 83],
  blue: [132, 189, 250],
  darkblue: [31, 100, 173],
  pinkblue: [132, 150, 150]
};

levelData = {
  1: {
    name: 'The Cistem',
    description: 'Round pegs in round holes. Everything in its place. The Cistem was built for you!',
    enabledTools: [1,0,0],
    tooltips: [[],
               ["Why? Your brush is perfect the way it is!",
                "Why? Your brush is perfect the way it is!",
                "What?? This isn't even a real thing..."],
               ['', 'Too expensive!', "Too risky! You're not ready yet."],
              ],
    endMessages: {
      0: ["Congrats!", "You played the game. You painted inside the lines and feel strangely validated."],
      1: ["Oops...", "You transgressed too far. People noticed, and they care way more than they should."],
      2: ["You got clocked", "Time's up. Not everyone gets a chance to fulfill their purpose."]
    },
    challenges: [1,3]
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

challengeData = {
  1: {
    canvasColor: colors.pink,
    paintColor: colors.darkpink,
    shapeColor: colors.white,
    maxTime: 30,
    enabledOptions: [[1,1,1],[1,0,0],[1,0,0]]
  },
  2: {
    canvasColor: colors.pink,
    paintColor: colors.blue,
    shapeColor: colors.white,
    spillColor: colors.pinkBlue,
    maxTime: 45,
    enabledOptions: [[1,1,1],[0,1,0],[1,0,0]]
  },
  3: {
    canvasColor: colors.blue,
    paintColor: colors.darkblue,
    shapeColor: colors.white,
    maxTime: 60,
    enabledOptions: [[1,1,1],[0,1,0],[1,0,0]]
  }
}

brushTypes = [
  {sides: 0, sizes:[8, 25, 50]},
  {sides: 4, sizes:[10, 32, 63]},
  {sides: 5, sizes:[10, 28, 57], starred:1}
];

gameMode = {
  newLevel: 0,
  ready: 1,
  starting: 2,
  playing: 3,
  transitioning: 4,
  complete: 5,
}

gameOutcome = {
  passed: 0,
  transgressed: 1,
  clocked: 2
}

gameState = {
  level: 1,
  challengeIndex: 0,
  timerRunning: 0,
  toolOptions: [1,0,0],
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

function isStarred() {
  return getBrushType().starred;
}

function getOptionCount() {
  var $tool = $(`#tools .tool-wrapper:eq(${gameState.toolFocus})`);
  return $tool.find('.tool-option').length;
}

function getChallengeData(level, challengeIndex) {
  return challengeData[levelData[level].challenges[challengeIndex]];
}

function randomAffirmation() {
  var affirmations = ['Nice job!', 'Awesome!', '100%', 'Nailed it!'];
  return affirmations[Math.floor(Math.random()*affirmations.length)];
}

function rgbToStr(rgbList) {
 return 'rgb('+rgbList.join(', ')+')';
}

// significantly faster than reduce
function rgbSum(pixelData, start) {
  if (!pixelData) return;
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
    brushSides: getBrushSides(),
    starred: isStarred()
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
    spill: 0,
    canvas: 0
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
      case rgbSum(colors.canvas):
        totals.canvas++;
        break;
    }
  }

  return totals;
}

function updatePercentPainted() {
  var ctx = getContext();
  var canvasData = analyzeCanvas();

  var percent, spill, maxSpill;
  if (colors.spill) {
    percent = canvasData.painted/(canvasData.painted+canvasData.unpainted);
    spill = canvasData.spill;
    maxSpill = 12000;
  } else {
    percent = (gameState.maxShape-canvasData.unpainted)/gameState.maxShape;
    spill = gameState.maxCanvas-canvasData.canvas;
    maxSpill = 18000;
  }

  var $slider = $('#percent-painted .slider-outline');
  var height = $slider.height();
  var $fill = $('#percent-painted .slider-fill');
  $fill.animate({height: height*percent}, 60, 'linear');

  var bottom;
  if (spill >= maxSpill) {
    bottom = height-10;
  } else {
    bottom = (height-10)*spill/maxSpill+2;
  }

  var $spillSlider = $('#spill-warning .slider-mark');
  $spillSlider.animate({bottom:bottom}, 80, 'linear');

  if (gameState.mode != gameMode.playing) return;
  else if (spill >= maxSpill) {
    $spillSlider.css('background-color', 'red');
    gameState.outcome = gameOutcome.transgressed;
    setGameMode(gameMode.complete);
  }
  else if(percent >= 1 && gameState.mode == gameMode.playing) {
    $fill.css('background-color', '#0f0');
    $fill.css('border-radius', '5px');

    gameState.challengeIndex += 1;
    if (gameState.challengeIndex == levelData[gameState.level].challenges.length) {
      gameState.outcome = gameOutcome.passed;
      setGameMode(gameMode.complete);
    } else {
      setGameMode(gameMode.transitioning);
    }
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

  setLevelTitle(level)
}

function resetLevel(level) {
  gameState.challengeIndex = 0;
  initChallenge(level, 0);
}

function initChallenge(level, challengeIndex) {
  var challengeData = getChallengeData(level, challengeIndex);
  colors.paint = challengeData.paintColor;
  colors.canvas = challengeData.canvasColor;
  colors.spill = challengeData.spillColor;
  colors.shape = challengeData.shapeColor;

  $('#game-background').css('background-color', rgbToStr(colors.canvas));
  $('#percent-painted .slider-fill').css('background-color', rgbToStr(colors.paint));

  gameState.maxTime = challengeData.maxTime;
  gameState.enabledOptions = challengeData.enabledOptions;

  updateSelectors(0);
  drawReticle();
  drawToolOptions();
  setTooltips(level);

  updateLevelIcon(level, challengeIndex);
  drawChallenge(level, challengeIndex);

  var canvasData = analyzeCanvas();
  gameState.maxShape = canvasData.unpainted;
  gameState.maxCanvas = canvasData.canvas;
}

function drawChallenge(level, challengeIndex) {
  var challenge = levelData[level].challenges[challengeIndex];

  var ctx = getContext();
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  ctx.fillStyle = rgbToStr(colors.canvas);
  ctx.fillRect(0, 0, 500, 500);
  ctx.fillStyle = rgbToStr(colors.shape);

  switch(challenge) {
    case 1:
    case 2:
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
    case 3:
    case 4:
      var ms = brushTypes[1].sizes[1]*2/Math.pow(2, .5);
      var ls = brushTypes[1].sizes[2]*2/Math.pow(2, .5);

      ctx.fillRect(50, 50, ls, ls);
      ctx.fillRect(50, 450-ls, ls, ls);
      ctx.fillRect(450-ls, 50, ls, ls);
      ctx.fillRect(450-ls, 450-ls, ls, ls);

      ctx.fillRect(160, 160, 180, 180);

      ctx.fillRect(50+ls, 50+(ls-ms)/2, 400-2*ls, ms);
      ctx.fillRect(50+ls, 450-(ls+ms)/2, 400-2*ls, ms);
      ctx.fillRect(50+(ls-ms)/2, 50+ls, ms, 400-2*ls);
      ctx.fillRect(450-(ls+ms)/2, 50+ls, ms, 400-2*ls);
      break;
    default:
      break;
  }
  ctx.restore();
}

function setTooltips(level) {
  $('.tool-wrapper').each(function(toolIndex) {
    $(this).find('.tool-option').each(function(optionIndex) {
      var enabled = gameState.enabledOptions[toolIndex][optionIndex];
      $(this).toggleClass('disabled', !enabled);
      $(this).prop('title', enabled ? '' : levelData[gameState.level].tooltips[toolIndex][optionIndex]);
    });
  });

  tippy('.tool-option[title]', {
    placement: 'bottom',
    maxWidth: '150px',
    theme: 'gray',
    arrow: true,
    dynamicTitle: true
  });
}

function setupContext(ctx, type) {
  switch(type) {
    case 'painting':
      ctx.lineJoin = ctx.lineCap = 'round';
      ctx.strokeStyle = ctx.fillStyle = rgbToStr(colors.paint);
      ctx.globalCompositeOperation = 'darken';
      break;
    case 'timer':
      ctx.lineWidth = 8;
      ctx.lineCap = 'butt';
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY= 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'gray';
      break;
    case 'transition':
      ctx.lineJoin = ctx.lineCap = 'round';
      ctx.lineWidth = 100;
      ctx.strokeStyle = ctx.fillStyle = rgbToStr(colors.purple);
      ctx.globalCompositeOperation = 'source-over';
    default:
      break;
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

  var endMessages = levelData[level].endMessages[outcome];
  $title.html(endMessages[0]);
  $body.html(endMessages[1]);
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
    case gameMode.transitioning:
      gameState.isDrawing = 0;
      gameState.timerRunning = 0;

      $('#game').css('cursor','default');
      $('#reticle').hide();

      setTimeout(()=>wipeOut(()=>{
        resetGameState();
        $('#percent-painted .slider-fill').animate({height: 0});
        $('#spill-warning .slider-mark').animate({bottom: 2});
        $('#percent-painted .slider-fill').css('border-radius', '0px 0px 5px 5px');
        initChallenge(gameState.level, gameState.challengeIndex);
        setTimer(0, gameState.maxTime);

        wipeIn(()=>{
          restartTimer();
          setGameMode(gameMode.playing);
        });
      }), 1000);

      flashExpanding(randomAffirmation(), 800, {hold:400, styling:'small', expand:200});
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

function getPolyPath(x, y, sides, size, rotation, starred) {
  var rotation = rotation || (Math.PI-(Math.PI*2/sides))/2;
  var path = [];

  if (starred) sides = sides*2;
  for (var i = 0; i < sides; i++) {
    var dist = starred ? (i%2 ? size/2 : size) : size;
    var angle = (Math.PI*2/sides)*i + rotation;
    var ptX = x+dist*Math.cos(angle);
    var ptY = y+dist*Math.sin(angle);
    path.push({x: ptX, y:ptY});
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

function wipeOut(cb,x,y,dir,time,ctx) {
  if (y > 450) {if (cb) cb(); return;}
  if (!(x || y || dir || time)) {
    x = 0;
    y = 50;
    dir = 1;
    time = Date.now();
  }
  if (!ctx) {
    ctx = getContext();
  }

  var newX = x, newY = y;
  if (x >= 550 && dir == 1) {
    dir = -1;
    newY += 100;
  } else if (x <= -50 && dir == -1) {
    dir = 1;
    newY += 100;
  }

  // using a time coefficient removes duration variability
  // arising from browser speed, hardware, etc.
  var newTime = Date.now();
  var timeCoefficient = Math.max((newTime-time)/10, 0.1);
  var speedCoefficient = 12;
  newX += dir*timeCoefficient*speedCoefficient;

  setupContext(ctx, 'transition');
  ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.lineTo(newX, newY);
  ctx.stroke();

  setTimeout(()=>wipeOut(cb,newX, newY, dir, newTime, ctx), 0);
}

function wipeIn(cb,y,time,ctx) {
  if (y > 500) {if (cb) cb(); return;}
  if (!(y || time)) {
    y = 0;
    time = Date.now();
  }
  if (!ctx) {
    ctx = getContext();
  }

  // using a time coefficient removes duration variability
  // arising from browser speed, hardware, etc.
  var newTime = Date.now();
  var timeCoefficient = Math.max((newTime-time)/10, 0.1);
  var speedCoefficient = 3;
  var newY = y+timeCoefficient*speedCoefficient;

  ctx.clearRect(0,0,500,500);
  drawChallenge(gameState.level, gameState.challengeIndex);
  setupContext(ctx, 'transition');
  ctx.fillRect(0,0,500,500-newY);
  setTimeout(()=>wipeIn(cb,newY,newTime,ctx), 0);
}

function flashExpanding(message, duration, options) {
  var options = options || {};
  var hold = options.hold || 200;
  var className = 'flash '+options.styling;
  var expand = options.expand || 350;

  var $gameCell = $('td#main');
  var $number = $(document.createElement('div')).addClass(className).html(message);
  $gameCell.append($number);
  setTimeout(()=>$number.animate({'font-size':`+=${expand}`, opacity:0}, duration-hold, ()=>$number.remove()), hold);
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
  var starred = isStarred();

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
      if (sides == 5) centerY += 1;
      drawPolygon(ctx, centerX, centerY, sides, size, {style:'fill', color:enabledColor, starred:starred});
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
    size = 13;

    sides = sideValues[index];
    starred = brushTypes[index].starred;

    if (!sides) {
      ctx.fillStyle = optionColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size-2, 0, Math.PI*2);
      ctx.fill();
    } else {
      var centerX = $canvas.width()/2;
      var centerY = centerX;
      if (sides == 5) centerY += 1;
      drawPolygon(ctx, centerX, centerY, sides, size, {style:'fill', color: optionColor, starred:starred});
    }
  });

  // set tool type color

  $('#tool-type .tool-option').each(function(index) {
    var enabled = gameState.enabledOptions[2][index];
    if (index == 1) {
      var $img = $(this).find('img');
      $img.prop('src', enabled ? './img/lipstick.svg' : './img/lipstick_gray.svg');
    } else {
      $(this).css('color', enabled ? enabledColor : disabledColor);
    }
  });
}

function updateSelectors(animated) {
  var enabled = gameState.enabledOptions;
  gameState.toolOptions.map((v,i)=>{
    while (enabled && !enabled[i][v]) {
      v = (v+1)%enabled[i].length;
    }
    gameState.toolOptions[i] = v;
    setSelector(i,v,animated);
  });
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
                {style:'stroke', color: innerColor, starred:isStarred()});
    drawPolygon(ctx, centerX, centerY, getBrushSides(), getBrushSize()+1,
                {style:'stroke', color: outerColor, starred:isStarred()});
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
    drawPolygon(ctx, pt.x, pt.y, pt.brushSides, pt.brushSize, {style:'fill', starred:pt.starred});
  }
}

function drawPath(ctx, pts) {
  var sides = pts[0].brushSides;
  var size = pts[0].brushSize;
  var starred = pts[0].starred;

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
      var p1 = getPolyPath(pts[i].x, pts[i].y, sides, size, 0, starred);
      var p2 = getPolyPath(pts[i+1].x, pts[i+1].y, sides, size, 0, starred);
      joinPolys(ctx, p1, p2);
    }
    drawPoint(ctx, pts[pts.length-1]); // end cap
  }
}

function redrawGame(ctx) {
  drawChallenge(gameState.level, gameState.challengeIndex);
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

function updateLevelIcon(level, challengeIndex) {
  var $iconWrapper = $('#level-icon-wrapper');
  var faClasses = 'fa-xs fa-fw fa-circle';

  var $circle = $(document.createElement('i')).addClass(faClasses);
  var $openCircle = $circle.clone().addClass('far');
  var $closedCircle = $circle.clone().addClass('fas');

  $iconWrapper.empty();
  for (var i = 0; i < levelData[level].challenges.length; i++) {
    $iconWrapper.append(i <= challengeIndex ? $closedCircle.clone() : $openCircle.clone());
  }
}

function resetGameState() {
  gameState.strokes = [];
  gameState.isDrawing = 0;
  gameState.toolFocus = gameState.toolOptions.length;
  gameState.timerRunning = 0;
}

function initGame() {
  setTimeout(alignGameLayers, 100);
  setGameMode(gameMode.newLevel);
}

$(document).ready(function(){
  initGame();

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
    if (gameState.mode != gameMode.playing) return;

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
      case 32: // spacebar
        if (gameState.mode == gameMode.newLevel) {
          $('#start').click();
        } else if (gameState.mode == gameMode.complete) {
          $('#retry').click();
        }
        pressedArrow = false;
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
    if ($(this).hasClass('inactive')) return;
    gameState.strokes = [];
    gameState.isDrawing = 0;
    drawChallenge(gameState.level, gameState.challengeIndex);
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
