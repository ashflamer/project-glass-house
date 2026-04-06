const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
let audioCtx, noiseNode, gainNode;

// --- INITIAL STATE ---
let game = {
    day: parseInt(localStorage.getItem('gh_day')) || 1,
    stability: 1.0,
    inCombat: false,
    player: { x: 400, y: 300, size: 20, speed: 5 },
    enemy: { hp: 0, name: "" },
    keys: {},
    touch: { active: false, startX: 0, startY: 0, moveX: 0, moveY: 0 },
    initialized: false
};

// --- AUDIO ENGINE (Synthesized Noise) ---
function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; 
    }
    
    noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    noiseNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noiseNode.start();
}

function updateAudio() {
    if (!gainNode) return;
    let targetVol = (1 - game.stability) * 0.15;
    gainNode.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.1);
}

// --- GAME FUNCTIONS ---
function startGame() {
    document.getElementById('overlay').style.display = 'none';
    game.initialized = true;
    initAudio();
    updateStability();
    draw();
}

function updateStability() {
    game.stability = Math.max(0, 1.0 - (game.day / 30));
    document.getElementById('day-counter').innerText = `DAY: ${game.day}`;
    document.getElementById('stability-meter').innerText = `STABILITY: ${Math.round(game.stability * 100)}%`;
    localStorage.setItem('gh_day', game.day);
    updateAudio();
}

function nextDay() {
    if (game.day >= 30) {
        triggerEnding();
        return;
    }
    game.day++;
    game.player.x = 400; 
    game.player.y = 300;
    updateStability();
    
    // Random combat chance based on instability
    if (game.day > 5 && Math.random() > game.stability) {
        startCombat();
    }
}

function triggerEnding() {
    localStorage.clear();
    document.body.innerHTML = `
        <div style="color:#f00; text-align:center; padding: 40px; width: 100%; font-family: monospace;">
            <h1 style="letter-spacing: 6px; animation: glitch 0.1s infinite;">[DATA_PURGE]</h1>
            <p>SUBJECT_ID: VESPER | STATUS: DELETED</p>
            <p style="opacity: 0.5;">The 30-day protocol is complete. Connection lost.</p>
            <br>
            <button onclick="location.reload()" style="color:#f00; border: 1px solid #f00; background:none; padding:10px 20px; cursor:pointer;">REINITIALIZE</button>
        </div>
    `;
}

function startCombat() {
    game.inCombat = true;
    game.enemy.hp = 100;
    game.enemy.name = game.day < 20 ? "MEMORY_ERROR" : "NULL_VOICE";
    document.getElementById('objective').innerText = "TAP REPEATEDLY / SPACE TO RESIST";
}

// --- CONTROLS ---
startBtn.addEventListener('click', startGame);
window.addEventListener('keydown', e => game.keys[e.code] = true);
window.addEventListener('keyup', e => game.keys[e.code] = false);

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (game.inCombat) game.enemy.hp -= 6;
    game.touch.active = true;
    let t = e.touches[0], r = canvas.getBoundingClientRect();
    game.touch.startX = (t.clientX - r.left) * (800 / r.width);
    game.touch.startY = (t.clientY - r.top) * (600 / r.height);
}, {passive:false});

canvas.addEventListener('touchmove', e => {
    let t = e.touches[0], r = canvas.getBoundingClientRect();
    game.touch.moveX = (t.clientX - r.left) * (800 / r.width);
    game.touch.moveY = (t.clientY - r.top) * (600 / r.height);
}, {passive:false});

canvas.addEventListener('touchend', () => game.touch.active = false);

// --- RENDER ---
function draw() {
    if (!game.initialized) return;

    let dx = 0, dy = 0;
    if (game.keys['KeyW'] || game.keys['ArrowUp']) dy = -1;
    if (game.keys['KeyS'] || game.keys['ArrowDown']) dy = 1;
    if (game.keys['KeyA'] || game.keys['ArrowLeft']) dx = -1;
    if (game.keys['KeyD'] || game.keys['ArrowRight']) dx = 1;

    if (game.touch.active) {
        let vx = game.touch.moveX - game.touch.startX;
        let vy = game.touch.moveY - game.touch.startY;
        let d = Math.sqrt(vx*vx + vy*vy);
        if (d > 10) { dx = vx/d; dy = vy/d; }
    }

    if (!game.inCombat) {
        game.player.x += dx * game.player.speed;
        game.player.y += dy * game.player.speed;
        // Edge check to advance day
        if (game.player.x > 795 || game.player.x < 5 || game.player.y > 595 || game.player.y < 5) nextDay();
    } else {
        if (game.keys['Space']) game.enemy.hp -= 2;
        if (game.enemy.hp <= 0) {
            game.inCombat = false;
            document.getElementById('objective').innerText = "OBJECTIVE: SURVIVE.";
        }
    }

    // Canvas Clearing
    ctx.fillStyle = `rgba(0,0,0,0.3)`;
    ctx.fillRect(0,0,800,600);

    // Decorative Grid
    ctx.strokeStyle = `rgba(255,255,255,${game.stability * 0.1})`;
    for(let i=0; i<800; i+=80) { ctx.strokeRect(i, 0, 1, 600); ctx.strokeRect(0, i, 800, 1); }

    // Player Rendering
    ctx.fillStyle = game.day > 25 ? "#f00" : "#fff";
    let j = (1 - game.stability) * 5;
    ctx.fillRect(game.player.x + (Math.random()*j), game.player.y + (Math.random()*j), 18, 18);

    // Combat Visuals
    if (game.inCombat) {
        ctx.fillStyle = "#fff";
        ctx.font = "italic 24px Courier New";
        ctx.fillText(game.enemy.name, 250 + (Math.random()*15), 280);
        ctx.fillStyle = "#f00";
        ctx.fillRect(250, 300, game.enemy.hp * 3, 4);
    }

    // Glitch Visual Effect
    if (game.stability < 0.95) {
        let y = Math.random() * 600;
        let h = Math.random() * 15;
        let shift = (Math.random()-0.5) * (1-game.stability) * 150;
        ctx.drawImage(canvas, 0, y, 800, h, shift, y, 800, h);
    }

    requestAnimationFrame(draw);
}