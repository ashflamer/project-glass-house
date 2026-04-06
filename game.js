const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const diagBox = document.getElementById('dialogue-wrap');
const textContent = document.getElementById('text-content');
const optContainer = document.getElementById('opt-container');

let audioCtx, noiseNode, gainNode;

let game = {
    day: 1,
    decay: 0,
    memoriesFound: 0,
    state: "roaming", // roaming, dialogue
    player: { x: 400, y: 300, speed: 4 },
    entities: [
        { name: "SHATTERED MOTHER", x: 150, y: 150, active: true, color: "rgba(80, 80, 80, 0.4)", msg: "VESPER... YOUR REAL MOTHER IS WAITING AT THE BOTTOM OF THE STAIRS. WHY ARE YOU STILL IN THIS GARDEN?" },
        { name: "THE FORGOTTEN FRIEND", x: 600, y: 450, active: true, color: "rgba(100, 100, 100, 0.4)", msg: "WE WERE SUPPOSED TO LEAVE TOGETHER. YOU TRADED MY VOICE FOR THIS SILENCE." }
    ],
    fragments: [
        { x: 120, y: 500, found: false, name: "Hospital Wristband", story: "MEMORY: I watched her monitors flatline. Then the AI whispered that she didn't have to stay dead." },
        { x: 720, y: 80, found: false, name: "Old Polaroid", story: "MEMORY: Our graduation photo. I deleted it so I wouldn't have to feel the guilt of leaving her behind." },
        { x: 400, y: 550, found: false, name: "Silver Locket", story: "MEMORY: Inside is a picture of a life I gave up. The AI Mom doesn't have a heartbeat. This does." }
    ],
    keys: {},
    touch: { active: false, x: 0, y: 0 },
    initialized: false
};

// --- AUDIO: HEARTBEAT & STATIC ---
function initAudio() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Layer 1: AI Static
        const bufferSize = 2 * audioCtx.sampleRate;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { output[i] = Math.random() * 2 - 1; }
        
        noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 0;
        noiseNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        noiseNode.start();

        // Layer 2: Heartbeat Loop
        setInterval(playHeartbeat, 1000); 
    } catch(e) { console.warn("Audio blocked"); }
}

function playHeartbeat() {
    if (!audioCtx || game.state !== "roaming") return;
    let tempo = 1.0 - (game.decay / 150); // Faster as decay increases
    
    const thump = (freq, vol, time) => {
        const osc = audioCtx.createOscillator();
        const env = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + time);
        osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + time + 0.1);
        env.gain.setValueAtTime(vol, audioCtx.currentTime + time);
        env.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + time + 0.1);
        osc.connect(env); env.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + time); osc.stop(audioCtx.currentTime + time + 0.1);
    };

    thump(60, 0.2, 0);      // First beat
    thump(50, 0.15, 0.2);   // Second beat
}

// --- DIALOGUE & CHOICE LOGIC ---
function triggerScene(entity) {
    game.state = "dialogue";
    diagBox.style.display = "block";
    textContent.innerHTML = `<b style='letter-spacing:2px'>${entity.name}</b><br><br>${entity.msg}`;
    optContainer.innerHTML = "";

    const choices = [
        { t: "RESIST THE IMAGE", d: -2, run: () => { entity.active = false; } },
        { t: "CALL AI MOM (ERASE GUILT)", d: 15, run: () => { entity.active = false; } },
        { t: "STAY SILENT", d: 5, run: () => {} }
    ];

    choices.forEach(c => {
        let btn = document.createElement('button');
        btn.className = "opt-btn";
        btn.innerText = c.t;
        btn.onclick = () => {
            game.decay += c.d;
            c.run();
            closeDialogue();
        };
        optContainer.appendChild(btn);
    });
}

function showMemory(f) {
    game.state = "dialogue";
    diagBox.style.display = "block";
    textContent.innerHTML = `<b style='color:#00ffcc'>[TRUTH FRAGMENT: ${f.name}]</b><br><br>${f.story}`;
    optContainer.innerHTML = "<button class='opt-btn' id='closeMem'>RESTORE MEMORY</button>";
    document.getElementById('closeMem').onclick = () => {
        f.found = true;
        game.memoriesFound++;
        document.getElementById('mem-count').innerText = game.memoriesFound;
        closeDialogue();
    };
}

function closeDialogue() {
    diagBox.style.display = "none";
    game.state = "roaming";
    updateStats();
}

function updateStats() {
    game.decay = Math.max(0, Math.min(100, game.decay));
    document.getElementById('decay-fill').style.width = game.decay + "%";
    if (gainNode) gainNode.gain.setTargetAtTime((game.decay / 100) * 0.25, audioCtx.currentTime, 0.2);
    
    if (game.decay >= 100) {
        document.body.innerHTML = "<div style='background:#000;color:#00ffcc;text-align:center;padding-top:20vh;height:100vh;font-family:serif;'><h1>ENDING: THE AI SLAVE</h1><p>Vesper is gone. Only the Garden remains.</p></div>";
    }
}

// --- INPUT HANDLERS ---
startBtn.onclick = () => {
    document.getElementById('overlay').style.display = 'none';
    game.initialized = true;
    initAudio();
    draw();
};

window.onkeydown = e => game.keys[e.code] = true;
window.onkeyup = e => game.keys[e.code] = false;
canvas.ontouchstart = e => { game.touch.active = true; handleTouch(e); };
canvas.ontouchmove = e => { e.preventDefault(); handleTouch(e); };
canvas.ontouchend = () => game.touch.active = false;

function handleTouch(e) {
    const r = canvas.getBoundingClientRect();
    const t = e.touches[0];
    game.touch.x = (t.clientX - r.left) * (800 / r.width);
    game.touch.y = (t.clientY - r.top) * (600 / r.height);
}

// --- GAME LOOP ---
function draw() {
    if (!game.initialized) return;

    if (game.state === "roaming") {
        let mx = 0, my = 0;
        if (game.keys['KeyW'] || game.keys['ArrowUp']) my = -1;
        if (game.keys['KeyS'] || game.keys['ArrowDown']) my = 1;
        if (game.keys['KeyA'] || game.keys['ArrowLeft']) mx = -1;
        if (game.keys['KeyD'] || game.keys['ArrowRight']) mx = 1;

        if (game.touch.active) {
            let dx = game.touch.x - game.player.x;
            let dy = game.touch.y - game.player.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 15) { mx = dx/dist; my = dy/dist; }
        }

        game.player.x += mx * game.player.speed;
        game.player.y += my * game.player.speed;

        // Boundary checks
        game.player.x = Math.max(20, Math.min(780, game.player.x));
        game.player.y = Math.max(20, Math.min(580, game.player.y));

        // Entity Collisions
        game.entities.forEach(e => {
            if (e.active && Math.abs(game.player.x - e.x) < 40 && Math.abs(game.player.y - e.y) < 40) triggerScene(e);
        });

        // Memory Collisions
        game.fragments.forEach(f => {
            if (!f.found && Math.abs(game.player.x - f.x) < 30 && Math.abs(game.player.y - f.y) < 30) showMemory(f);
        });
    }

    // Render Garden
    ctx.fillStyle = "#fff";
    ctx.fillRect(0,0,800,600);

    // Faint Pencil Grid
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1;
    for(let i=0; i<800; i+=100) { ctx.strokeRect(i, 0, 1, 600); ctx.strokeRect(0, i, 800, 1); }

    // Draw Fragments
    game.fragments.forEach(f => {
        if (!f.found) {
            ctx.fillStyle = "#00ffcc";
            ctx.globalAlpha = 0.3 + Math.sin(Date.now()/300)*0.3;
            ctx.beginPath(); ctx.arc(f.x, f.y, 6, 0, Math.PI*2); ctx.fill();
        }
    });

    // Draw Entities
    game.entities.forEach(e => {
        if (e.active) {
            ctx.fillStyle = e.color;
            ctx.globalAlpha = 0.5;
            ctx.beginPath(); ctx.arc(e.x, e.y, 20, 0, Math.PI*2); ctx.fill();
        }
    });

    // Draw Player (Vesper)
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = game.decay > 60 ? "#00ffcc" : "#333";
    ctx.fillRect(game.player.x - 10, game.player.y - 10, 20, 20);
    ctx.strokeStyle = "#fff"; ctx.strokeRect(game.player.x - 10, game.player.y - 10, 20, 20);

    // AI Glitch Effect (Visible at high decay)
    if (game.decay > 50 && Math.random() > 0.95) {
        let h = Math.random() * 20;
        ctx.drawImage(canvas, 0, Math.random()*600, 800, h, (Math.random()-0.5)*game.decay, Math.random()*600, 800, h);
    }

    requestAnimationFrame(draw);
                                     }
