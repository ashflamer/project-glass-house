const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const diagBox = document.getElementById('dialogue-box');

let audioCtx, noiseNode, gainNode;

let game = {
    day: parseInt(localStorage.getItem('gh_day')) || 1,
    stability: 1.0,
    inCombat: false,
    hasTalked: false,
    checkedItems: 0,
    player: { x: 400, y: 300, size: 20, speed: 3.5 }, // Slower for immersion
    enemy: { hp: 0, name: "" },
    // Static objects (X, Y, Width, Height, Name)
    props: [
        { x: 100, y: 100, w: 60, h: 40, name: "A BROKEN MIRROR", msg: "You don't recognize the reflection." },
        { x: 600, y: 450, w: 50, h: 50, name: "OLD SKETCHBOOK", msg: "The pages are all blank white." },
        { x: 200, y: 400, w: 40, h: 30, name: "RUSTY LAPTOP", msg: "It's stuck on a login screen you don't know." }
    ],
    npc: { x: 650, y: 150, w: 20, h: 30, name: "STRANGER" },
    keys: {},
    initialized: false
};

// --- AUDIO ENGINE ---
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
    let targetVol = (1 - game.stability) * 0.25;
    gainNode.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.1);
}

// --- CORE MECHANICS ---
function showDialogue(text) {
    diagBox.innerText = text;
    diagBox.style.display = "block";
    setTimeout(() => { diagBox.style.display = "none"; }, 3000);
}

function nextDay() {
    // Immersion Lock: Player must interact with at least 1 item and the NPC
    if (!game.hasTalked || game.checkedItems < 1) {
        showDialogue("I CAN'T LEAVE YET. SOMETHING IS UNFINISHED.");
        game.player.x = 400; game.player.y = 300;
        return;
    }

    if (game.day >= 30) {
        localStorage.clear();
        document.body.innerHTML = "<div style='color:red; text-align:center; padding:100px;'><h1>[PURGED]</h1><p>SUBJECT: VESPER IS GONE.</p></div>";
        return;
    }

    game.day++;
    game.hasTalked = false;
    game.checkedItems = 0;
    game.player.x = 400; game.player.y = 300;
    updateStability();
    showDialogue(`DAY ${game.day}: THE WALLS FEEL CLOSER.`);
}

function updateStability() {
    game.stability = Math.max(0.05, 1.0 - (game.day / 30));
    document.getElementById('day-txt').innerText = `DAY: ${game.day < 10 ? '0'+game.day : game.day}`;
    document.getElementById('stab-txt').innerText = `STABILITY: ${Math.round(game.stability * 100)}%`;
    localStorage.setItem('gh_day', game.day);
    updateAudio();
}

// --- INPUTS ---
startBtn.addEventListener('click', () => {
    document.getElementById('overlay').style.display = 'none';
    game.initialized = true;
    initAudio();
    updateStability();
    draw();
});

window.addEventListener('keydown', e => game.keys[e.code] = true);
window.addEventListener('keyup', e => game.keys[e.code] = false);

// --- RENDER LOOP ---
function draw() {
    if (!game.initialized) return;

    let nextX = game.player.x;
    let nextY = game.player.y;

    if (game.keys['KeyW'] || game.keys['ArrowUp']) nextY -= game.player.speed;
    if (game.keys['KeyS'] || game.keys['ArrowDown']) nextY += game.player.speed;
    if (game.keys['KeyA'] || game.keys['ArrowLeft']) nextX -= game.player.speed;
    if (game.keys['KeyD'] || game.keys['ArrowRight']) nextX += game.player.speed;

    // Simple Collision Detection
    let collision = false;
    game.props.forEach(p => {
        if (nextX < p.x + p.w && nextX + 20 > p.x && nextY < p.y + p.h && nextY + 20 > p.y) {
            collision = true;
            showDialogue(p.msg);
            game.checkedItems++;
        }
    });

    if (!collision) {
        game.player.x = nextX;
        game.player.y = nextY;
    }

    // Edge check for next day
    if (game.player.x > 780 || game.player.x < 10 || game.player.y > 580 || game.player.y < 10) {
        nextDay();
    }

    // Rendering
    ctx.fillStyle = "#121212"; // Deep room grey
    ctx.fillRect(0,0,800,600);

    // Grid (The "Headspace" Floor)
    ctx.strokeStyle = `rgba(255,255,255,${game.stability * 0.08})`;
    for(let i=0; i<800; i+=80) { ctx.strokeRect(i, 0, 1, 600); ctx.strokeRect(0, i, 800, 1); }

    // Draw Props
    ctx.fillStyle = "#222";
    game.props.forEach(p => {
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = "#333";
        ctx.strokeRect(p.x, p.y, p.w, p.h);
    });

    // Draw NPC (Stranger)
    ctx.fillStyle = game.stability < 0.4 ? "#f00" : "#444";
    ctx.fillRect(game.npc.x, game.npc.y, game.npc.w, game.npc.h);
    
    let dToNpc = Math.sqrt(Math.pow(game.player.x - game.npc.x, 2) + Math.pow(game.player.y - game.npc.y, 2));
    if (dToNpc < 50) {
        game.hasTalked = true;
        let lines = ["HAVE YOU FOUND THE EXIT?", "THE GLASS IS CRACKING.", "STAY HERE. IT'S SAFER.", "WHO IS RAMYA?"];
        showDialogue(`STRANGER: "${lines[game.day % 4]}"`);
    }

    // Player (Vesper)
    ctx.fillStyle = game.day > 25 ? "#f00" : "#fff";
    ctx.fillRect(game.player.x, game.player.y, 18, 18);

    // Glitch Shaders
    if (game.stability < 0.9) {
        let y = Math.random() * 600;
        let shift = (Math.random()-0.5) * (1-game.stability) * 150;
        ctx.drawImage(canvas, 0, y, 800, 5, shift, y, 800, 5);
    }

    requestAnimationFrame(draw);
}
    
