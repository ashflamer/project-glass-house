(function () {
  // ---------- DOM ----------
  var canvas = document.getElementById('gameCanvas');
  var startBtn = document.getElementById('startBtn');
  var overlay = document.getElementById('overlay');
  var diagBox = document.getElementById('dialogue-wrap');
  var textContent = document.getElementById('text-content');
  var optContainer = document.getElementById('opt-container');
  var inputArea = document.getElementById('input-area');
  var passInput = document.getElementById('pass-input');
  var submitPass = document.getElementById('submit-pass');
  var roomNameEl = document.getElementById('room-name');
  var memCountEl = document.getElementById('mem-count');
  var decayFill = document.getElementById('decay-fill');

  if (!canvas || !startBtn || !overlay) {
    alert('Setup error: required HTML IDs missing (gameCanvas/startBtn/overlay).');
    return;
  }

  var ctx = canvas.getContext('2d');

  // ---------- Sprite ----------
  var spriteSheet = new Image();
  spriteSheet.src = 'pic movement.jpg';

  var FRAME_SIZE = 64;
  var ROWS = { DOWN: 0, LEFT: FRAME_SIZE, RIGHT: FRAME_SIZE * 2, UP: FRAME_SIZE * 3 };

  var game = {
    initialized: false,
    state: 'roaming',
    currentRoom: 'HALL',
    decay: 6,
    memories: 0,
    maxMemories: 4,
    endingTriggered: false,
    time: 0,
    inventory: {},
    keys: { w: false, a: false, s: false, d: false },
    player: {
      x: 400,
      y: 420, // spawn away from center trigger so it won't instantly lock
      velX: 0,
      velY: 0,
      accel: 0.6,
      friction: 0.82,
      stepCounter: 0,
      currentCol: 0,
      currentRow: ROWS.DOWN
    },
    rooms: {
      HALL: {
        bg: '#f6f6f6',
        doors: [
          { x: 45, y: 300, target: 'MECHANICAL', spawn: { x: 740, y: 300 } },
          { x: 755, y: 300, target: 'PERSONAL', spawn: { x: 60, y: 300 } },
          { x: 400, y: 45, target: 'FOOD', spawn: { x: 400, y: 540 } },
          { x: 400, y: 555, target: 'STORAGE', spawn: { x: 400, y: 70 } }
        ],
        interactions: [{ id: 'mirror', x: 400, y: 300, radius: 60, label: 'Mirror', done: false }]
      },
      MECHANICAL: {
        bg: '#0a0a0a',
        interactions: [{ id: 'fuse', x: 640, y: 120, radius: 65, label: 'Control Box', done: false }]
      },
      PERSONAL: {
        bg: '#ffffff',
        interactions: [{ id: 'drawer', x: 675, y: 125, radius: 70, label: 'Locked Drawer', done: false }]
      },
      FOOD: {
        bg: '#080808',
        interactions: [{ id: 'table', x: 400, y: 160, radius: 75, label: 'Something waits', done: false }]
      },
      STORAGE: {
        bg: '#fefefe',
        interactions: [{ id: 'toy', x: 140, y: 470, radius: 70, label: 'Toy Box', done: false }]
      }
    }
  };

  function updateUi() {
    if (roomNameEl) roomNameEl.textContent = game.currentRoom === 'HALL' ? 'MAIN HALL' : game.currentRoom;
    if (memCountEl) memCountEl.textContent = game.memories + '/' + game.maxMemories;
    if (decayFill) decayFill.style.width = Math.max(0, Math.min(100, game.decay)) + '%';
  }

  function openDialogue(text, options) {
    game.state = 'dialogue';
    if (diagBox) diagBox.style.display = 'block';
    if (inputArea) inputArea.style.display = 'none';
    if (passInput) passInput.value = '';
    if (textContent) textContent.textContent = text || '';
    if (optContainer) optContainer.innerHTML = '';

    (options || []).forEach(function (opt) {
      var b = document.createElement('button');
      b.className = 'opt-btn';
      b.textContent = opt.text;
      b.onclick = opt.onPick;
      if (optContainer) optContainer.appendChild(b);
    });
  }

  function closeDialogue() {
    if (diagBox) diagBox.style.display = 'none';
    if (inputArea) inputArea.style.display = 'none';
    if (optContainer) optContainer.innerHTML = '';
    game.state = 'roaming';
  }

  function moveToRoom(target, spawn) {
    game.currentRoom = target;
    game.player.x = spawn.x;
    game.player.y = spawn.y;
    game.player.velX = 0;
    game.player.velY = 0;
    updateUi();
  }

  function addMemory(name, decayReward) {
    if (game.inventory[name]) return;
    game.inventory[name] = true;
    game.memories += 1;
    game.decay = Math.max(0, game.decay - (decayReward || 8));
    updateUi();
  }

  function checkInteraction(interaction, roomKey) {
    if (interaction.done) return;
    interaction.done = true;

    if (roomKey === 'HALL' && interaction.id === 'mirror') {
      openDialogue('Your reflection is one beat behind.', [{ text: 'Step away', onPick: closeDialogue }]);
      interaction.done = false; // repeatable
      return;
    }

    if (roomKey === 'MECHANICAL') {
      addMemory('Rusty Fuse', 10);
      openDialogue('You restore the sequence and recover a warm fuse.', [{ text: 'Return', onPick: returnToHall }]);
      return;
    }

    if (roomKey === 'PERSONAL') {
      game.state = 'dialogue';
      if (diagBox) diagBox.style.display = 'block';
      if (textContent) textContent.textContent = 'Enter code: 1357';
      if (inputArea) inputArea.style.display = 'block';
      if (optContainer) optContainer.innerHTML = '<button class="opt-btn" id="cancel-pass">Cancel</button>';
      var cancelBtn = document.getElementById('cancel-pass');
      if (cancelBtn) cancelBtn.onclick = closeDialogue;

      if (submitPass) {
        submitPass.onclick = function () {
          if (passInput && passInput.value.trim() === '1357') {
            addMemory('Photo Fragment', 8);
            openDialogue('Drawer unlocked. You found a photo fragment.', [{ text: 'Return', onPick: returnToHall }]);
          } else if (textContent) {
            textContent.textContent = 'Wrong code.';
          }
        };
      }
      return;
    }

    if (roomKey === 'FOOD') {
      addMemory('Picnic Ribbon', 12);
      openDialogue('Something fades. A ribbon remains.', [{ text: 'Return', onPick: returnToHall }]);
      return;
    }

    if (roomKey === 'STORAGE') {
      addMemory('Violin Charm', 10);
      openDialogue('You keep the violin charm.', [{ text: 'Return', onPick: returnToHall }]);
      return;
    }
  }

  function returnToHall() {
    closeDialogue();
    moveToRoom('HALL', { x: 400, y: 420 });
  }

  function update() {
    if (!game.initialized || game.state !== 'roaming') return;

    var p = game.player;

    if (game.keys.w) p.velY -= p.accel;
    if (game.keys.s) p.velY += p.accel;
    if (game.keys.a) p.velX -= p.accel;
    if (game.keys.d) p.velX += p.accel;

    p.velX *= p.friction;
    p.velY *= p.friction;

    p.x += p.velX;
    p.y += p.velY;

    p.x = Math.max(30, Math.min(770, p.x));
    p.y = Math.max(30, Math.min(570, p.y));

    var speed = Math.sqrt(p.velX * p.velX + p.velY * p.velY);
    if (speed > 0.5) {
      if (Math.abs(p.velX) > Math.abs(p.velY)) p.currentRow = p.velX > 0 ? ROWS.RIGHT : ROWS.LEFT;
      else p.currentRow = p.velY > 0 ? ROWS.DOWN : ROWS.UP;
      p.stepCounter += speed * 0.15;
      p.currentCol = Math.floor(p.stepCounter) % 4;
      game.time += 0.4;
    } else {
      p.currentCol = 0;
    }

    var room = game.rooms[game.currentRoom];

    if (game.currentRoom === 'HALL') {
      room.doors.forEach(function (d) {
        if (Math.abs(p.x - d.x) < 35 && Math.abs(p.y - d.y) < 35) moveToRoom(d.target, d.spawn);
      });
    }

    room.interactions.forEach(function (it) {
      if (it.done) return;
      if (Math.abs(p.x - it.x) < it.radius && Math.abs(p.y - it.y) < it.radius) {
        checkInteraction(it, game.currentRoom);
      }
    });

    updateUi();
  }

  function drawRoomDetails() {
    ctx.save();

    if (game.currentRoom === 'HALL') {
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.strokeRect(220, 180, 360, 240);
      ctx.fillStyle = '#fff';
      ctx.fillRect(348, 230, 104, 140);
      ctx.strokeRect(348, 230, 104, 140);
    } else if (game.currentRoom === 'MECHANICAL') {
      ctx.fillStyle = '#1a1a1a';
      for (var i = 0; i < 12; i++) ctx.fillRect(30 + i * 62, 420 + (i % 2) * 30, 44, 110);
    } else if (game.currentRoom === 'PERSONAL') {
      ctx.fillStyle = '#ececec';
      ctx.fillRect(90, 100, 240, 160);
      ctx.fillStyle = '#d0d0d0';
      ctx.fillRect(550, 80, 180, 120);
      ctx.strokeStyle = '#111';
      ctx.strokeRect(550, 80, 180, 120);
    } else if (game.currentRoom === 'FOOD') {
      ctx.fillStyle = '#111';
      ctx.fillRect(160, 110, 480, 120);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(160, 110, 480, 120);
    } else if (game.currentRoom === 'STORAGE') {
      ctx.fillStyle = '#fafafa';
      ctx.strokeStyle = '#121212';
      for (var r = 0; r < 3; r++) ctx.strokeRect(80 + r * 220, 100, 160, 380);
    }

    var room = game.rooms[game.currentRoom];
    room.interactions.forEach(function (it) {
      if (it.done) return;
      var pulse = 20 + Math.sin(game.time * 0.05) * 2;
      ctx.strokeStyle = game.currentRoom === 'FOOD' ? '#fff' : '#000';
      ctx.beginPath();
      ctx.arc(it.x, it.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = game.currentRoom === 'FOOD' ? '#fff' : '#111';
      ctx.font = '12px Georgia';
      ctx.fillText(it.label, it.x - 50, it.y - 26);
    });

    ctx.restore();
  }

  function drawPlayer() {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(game.player.x, game.player.y + 25, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (spriteSheet.complete && spriteSheet.naturalWidth > 0) {
      ctx.drawImage(
        spriteSheet,
        game.player.currentCol * FRAME_SIZE,
        game.player.currentRow,
        FRAME_SIZE,
        FRAME_SIZE,
        game.player.x - 32,
        game.player.y - 40,
        64,
        64
      );
    } else {
      // fallback if image missing
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(game.player.x, game.player.y - 8, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(game.player.x - 8, game.player.y + 4, 16, 22);
    }
  }

  function draw() {
    if (!game.initialized) return;

    update();

    var room = game.rooms[game.currentRoom];
    ctx.fillStyle = room.bg;
    ctx.fillRect(0, 0, 800, 600);

    drawRoomDetails();

    if (room.bg === '#0a0a0a' || room.bg === '#080808') {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.96)';
      ctx.fillRect(0, 0, 800, 600);
      ctx.globalCompositeOperation = 'destination-out';
      var grad = ctx.createRadialGradient(game.player.x, game.player.y, 20, game.player.x, game.player.y, 180);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(game.player.x, game.player.y, 180, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawPlayer();
    requestAnimationFrame(draw);
  }

  function mapKey(k) {
    var key = (k || '').toLowerCase();
    if (key === 'arrowup') return 'w';
    if (key === 'arrowleft') return 'a';
    if (key === 'arrowdown') return 's';
    if (key === 'arrowright') return 'd';
    return key;
  }

  window.addEventListener('keydown', function (e) {
    var k = mapKey(e.key);
    if (game.keys.hasOwnProperty(k)) {
      e.preventDefault();
      game.keys[k] = true;
    }
  });

  window.addEventListener('keyup', function (e) {
    var k = mapKey(e.key);
    if (game.keys.hasOwnProperty(k)) game.keys[k] = false;
  });

  startBtn.addEventListener('click', function () {
    overlay.style.display = 'none';
    game.initialized = true;
    game.state = 'roaming';
    updateUi();
    draw();
  });

  console.log('Game booted. Click OPEN EYES to start.');
})();
