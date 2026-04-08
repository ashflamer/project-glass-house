const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const diagBox = document.getElementById('dialogue-wrap');
const textContent = document.getElementById('text-content');
const optContainer = document.getElementById('opt-container');
const inputArea = document.getElementById('input-area');

// --- 1. SPRITE CONFIG (64px Frames) ---
const spriteSheet = new Image();
spriteSheet.src = 'pic movement.jpg'; 

const FRAME_SIZE = 64; 
const ROWS = { 
    DOWN: 0, 
    LEFT: FRAME_SIZE, 
    RIGHT: FRAME_SIZE * 2, 
    UP: FRAME_SIZE * 3 
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
        stepCounter: 0, currentCol: 0, currentRow: ROWS.DOWN
    },
    rooms: {
        "HALL": { bg: "#fff", doors: [
            { x: 40, y: 300, target: "MECHANICAL" },
            { x: 760, y: 300, target: "PERSONAL" },
            { x: 400, y: 40, target: "FOOD" },
            { x: 400, y: 560, target: "STORAGE" }
        ]},
        "MECHANICAL": { bg: "#050505", done: false, x: 700, y: 500 },
        "PERSONAL": { bg: "#fff", done: false },
        "FOOD": { bg: "#0a0a0a", done: false, x: 400, y: 100 },
        "STORAGE": { bg: "#fff", done: false }
    },
    keys: { w: false, a: false, s: false, d: false },
    initialized: false
};

// --- 2. ENGINE ---
function update() {
    if (!game.initialized || game.state !== "roaming") return;

    let p = game.player;
    if (game.keys.w) p.velY -= p.accel;
    if (game.keys.s) p.velY += p.accel;
    if (game.keys.a) p.velX -= p.accel;
    if (game.keys.d) p.velX += p.accel;

    p.velX *= p.friction; p.velY *= p.friction;
    p.x += p.velX; p.y += p.velY;

    p.x = Math.max(30, Math.min(770, p.x));
    p.y = Math.max(30, Math.min(570, p.y));

    let speed = Math.sqrt(p.velX*p.velX + p.velY*p.velY);
    if (speed > 0.5) {
        if (Math.abs(p.velX) > Math.abs(p.velY)) {
            p.currentRow = p.velX > 0 ? ROWS.RIGHT : ROWS.LEFT;
        } else {
            p.currentRow = p.velY > 0 ? ROWS.DOWN : ROWS.UP;
        }
        p.stepCounter += speed * 0.15;
        p.currentCol = Math.floor(p.stepCounter) % 4; 
    } else {
        p.currentCol = 0;
    }
    checkRoomLogic();
}

function checkRoomLogic() {
    let p = game.player;
    let room = game.rooms[game.currentRoom];

    if (game.currentRoom === "HALL") {
        room.doors.forEach(d => {
            if (Math.abs(p.x - d.x) < 40 && Math.abs(p.y - d.y) < 40) {
                game.currentRoom = d.target;
                document.getElementById('room-name').innerText = d.target;
                p.x = 400; p.y = 350; // Spawn safely away from the top door
                p.velX = 0; p.velY = 0;
            }
        });
    }

    if (game.currentRoom === "PERSONAL" && !room.done) {
        if (p.x > 680 && p.y < 150) {
            game.state = "dialogue";
            diagBox.style.display = "block";
            inputArea.style.display = "block";
            textContent.innerText = "Locker Code: Books(1), Picture(3), Carvings(5), Hidden(7).";
            document.getElementById('submit-pass').onclick = () => {
                if (document.getElementById('pass-input').value === "1357") {
                    room.done = true; game.memories++; returnToHall();
                }
            };
        }
    }
}

function draw() {
    if (!game.initialized) return;
    update();
    const room = game.rooms[game.currentRoom];

    ctx.fillStyle = room.bg;
    ctx.fillRect(0, 0, 800, 600);

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

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.beginPath(); ctx.ellipse(game.player.x, game.player.y + 25, 15, 6, 0, 0, Math.PI*2); ctx.fill();
    
    // Draw Vesper
    if (spriteSheet.complete) {
        ctx.drawImage(
            spriteSheet, 
            game.player.currentCol * FRAME_SIZE, game.player.currentRow, 
            FRAME_SIZE, FRAME_SIZE, 
            game.player.x - 32, game.player.y - 40, 
            64, 64
        );
    }
    requestAnimationFrame(draw);
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
    if(k in game.keys) {
        e.preventDefault(); // Stop page scrolling
        game.keys[k] = true; 
    }
});
window.addEventListener('keyup', (e) => { 
    let k = e.key.toLowerCase();
    if(k in game.keys) game.keys[k] = false; 
});

startBtn.onclick = () => { 
    document.getElementById('overlay').style.display='none'; 
    game.initialized=true; 
    game.state = "roaming";
    draw(); 
};
