const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const diagBox = document.getElementById('dialogue-wrap');
const textContent = document.getElementById('text-content');
const optContainer = document.getElementById('opt-container');
const inputArea = document.getElementById('input-area');

// --- 1. ASSETS & SPRITE SHEET MATH ---
const spriteSheet = new Image();
spriteSheet.src = 'pic movement.jpg'; 

// Based on your 256x256 sheet (4 frames of 64px each)
const FRAME_SIZE = 64; 
const ROWS = { 
    DOWN: 0,           // Row 1
    LEFT: FRAME_SIZE,      // Row 2
    RIGHT: FRAME_SIZE * 2,  // Row 3
    UP: FRAME_SIZE * 3      // Row 4
};

let game = {
    currentRoom: "HALL",
    state: "roaming",
    decay: 0,
    memories: 0,
    player: { 
        x: 400, y: 300, 
        velX: 0, velY: 0, 
        accel: 0.6, friction: 0.8,
        stepCounter: 0, 
        currentCol: 0, 
        currentRow: ROWS.DOWN
    },
    rooms: {
        "HALL": { bg: "#fff", doors: [
            { x: 40, y: 300, target: "MECHANICAL" },
            { x: 760, y: 300, target: "PERSONAL" },
            { x: 400, y: 40, target: "FOOD" },
            { x: 400, y: 560, target: "STORAGE" }
        ]},
        "MECHANICAL": { bg: "#050505", done: false, enemyX: 700, enemyY: 500 },
        "PERSONAL": { bg: "#fff", done: false },
        "FOOD": { bg: "#0a0a0a", done: false, momX: 400, momY: 100 },
        "STORAGE": { bg: "#fff", done: false, hasLadder: false }
    },
    keys: { w: false, a: false, s: false, d: false },
    initialized: false
};

// --- 2. GAME ENGINE ---
function update() {
    if (game.state !== "roaming") return;

    let p = game.player;
    
    // Physics Logic
    if (game.keys.w) p.velY -= p.accel;
    if (game.keys.s) p.velY += p.accel;
    if (game.keys.a) p.velX -= p.accel;
    if (game.keys.d) p.velX += p.accel;

    p.velX *= p.friction; 
    p.velY *= p.friction;
    p.x += p.velX; 
    p.y += p.velY;

    // Boundaries
    p.x = Math.max(30, Math.min(770, p.x));
    p.y = Math.max(30, Math.min(570, p.y));

    // Animation Logic (Mapped to your 4-frame rows)
    let speed = Math.sqrt(p.velX*p.velX + p.velY*p.velY);
    if (speed > 0.5) {
        if (Math.abs(p.velX) > Math.abs(p.velY)) {
            p.currentRow = p.velX > 0 ? ROWS.RIGHT : ROWS.LEFT;
        } else {
            p.currentRow = p.velY > 0 ? ROWS.DOWN : ROWS.UP;
        }
        p.stepCounter += speed * 0.15;
        p.currentCol = Math.floor(p.stepCounter) % 4; // Using all 4 frames
    } else {
        p.currentCol = 0; // Standing still
    }

    checkRoomLogic();
}

function checkRoomLogic() {
    let p = game.player;
    let room = game.rooms[game.currentRoom];

    // Hall Transitions
    if (game.currentRoom === "HALL") {
        room.doors.forEach(d => {
            if (Math.abs(p.x - d.x) < 40 && Math.abs(p.y - d.y) < 40) {
                game.currentRoom = d.target;
                document.getElementById('room-name').innerText = d.target;
                p.x = 400; p.y = 300; p.velX = 0; p.velY = 0;
            }
        });
    }

    // Room Goals
    if (game.currentRoom === "MECHANICAL" && !room.done) {
        if (Math.abs(p.x - room.enemyX) < 60 && Math.abs(p.y - room.enemyY) < 60) {
            triggerDialogue("FRIEND: 'You're back. Or is this just another simulation?'", [
                { text: "STAY SILENT", d: 5, action: () => { room.done = true; returnToHall(); } },
                { text: "FIGHT", d: 10, action: () => { room.done = true; returnToHall(); } }
            ]);
        }
    }

    if (game.currentRoom === "PERSONAL" && !room.done) {
        if (p.x > 680 && p.y < 150) {
            game.state = "dialogue";
            diagBox.style.display = "block";
            inputArea.style.display = "block";
            textContent.innerText = "The Locker is locked. Hint: Number of Books (1), Broken Picture (3), Hand Carvings (5), Hidden Spot (7).";
            document.getElementById('submit-pass').onclick = () => {
                if (document.getElementById('pass-input').value === "1357") {
                    room.done = true; game.memories++; returnToHall();
                }
            };
        }
    }
}

// --- 3. RENDERING ---
function draw() {
    if (!game.initialized) return;
    update();
    const room = game.rooms[game.currentRoom];

    // Background
    ctx.fillStyle = room.bg;
    ctx.fillRect(0, 0, 800, 600);

    // Flashlight Effect
    if (room.bg === "#050505" || room.bg === "#0a0a0a") {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.97)";
        ctx.fillRect(0,0,800,600);
        ctx.globalCompositeOperation = "destination-out";
        let grad = ctx.createRadialGradient(game.player.x, game.player.y, 20, game.player.x, game.player.y, 160);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(game.player.x, game.player.y, 160, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    // Draw Vesper (Using your new sheet mapping)
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.beginPath(); ctx.ellipse(game.player.x, game.player.y + 25, 15, 6, 0, 0, Math.PI*2); ctx.fill();
    
    ctx.drawImage(
        spriteSheet, 
        game.player.currentCol * FRAME_SIZE, 
        game.player.currentRow, 
        FRAME_SIZE, FRAME_SIZE, 
        game.player.x - 32, game.player.y - 40, // Centering adjustments
        64, 64
    );

    requestAnimationFrame(draw);
}

// --- 4. UTILS ---
function triggerDialogue(txt, options = []) {
    game.state = "dialogue";
    diagBox.style.display = "block";
    textContent.innerText = txt;
    optContainer.innerHTML = "";
    options.forEach(o => {
        let btn = document.createElement('button');
        btn.className = "opt-btn";
        btn.innerText = o.text;
        btn.onclick = () => { game.decay += o.d; o.action(); };
        optContainer.appendChild(btn);
    });
}

function returnToHall() {
    game.currentRoom = "HALL";
    document.getElementById('room-name').innerText = "MAIN HALL";
    document.getElementById('mem-count').innerText = game.memories;
    document.getElementById('decay-fill').style.width = game.decay + "%";
    diagBox.style.display = "none";
    inputArea.style.display = "none";
    game.state = "roaming";
}

window.addEventListener('keydown', (e) => { 
    let k = e.key.toLowerCase();
    if(k in game.keys) game.keys[k] = true; 
});
window.addEventListener('keyup', (e) => { 
    let k = e.key.toLowerCase();
    if(k in game.keys) game.keys[k] = false; 
});

startBtn.onclick = () => { 
    document.getElementById('overlay').style.display='none'; 
    game.initialized=true; 
    draw(); 
};
