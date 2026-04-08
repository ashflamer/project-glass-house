const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const diagBox = document.getElementById('dialogue-wrap');
const textContent = document.getElementById('text-content');
const optContainer = document.getElementById('opt-container');
const inputArea = document.getElementById('input-area');

// --- 1. ASSETS ---
const spriteSheet = new Image();
spriteSheet.src = 'pic movement.jpg'; 

const CHARACTER_OFFSET_X = 6 * 32; 
const CHARACTER_OFFSET_Y = 6 * 32; 
const ROWS = { DOWN: 64, LEFT: 96, RIGHT: 0, UP: 32 };

let game = {
    currentRoom: "HALL",
    state: "roaming",
    decay: 0,
    memories: 0,
    player: { 
        x: 400, y: 300, 
        velX: 0, velY: 0, 
        accel: 0.6, friction: 0.8,
        stepCounter: 0, currentCol: 1, currentRow: ROWS.DOWN
    },
    rooms: {
        "HALL": { bg: "#fff", doors: [
            { x: 40, y: 300, target: "MECHANICAL", label: "WEST" },
            { x: 760, y: 300, target: "PERSONAL", label: "EAST" },
            { x: 400, y: 40, target: "FOOD", label: "NORTH" },
            { x: 400, y: 560, target: "STORAGE", label: "SOUTH" }
        ]},
        "MECHANICAL": { bg: "#050505", done: false, enemyX: 700, enemyY: 500 },
        "PERSONAL": { bg: "#fff", done: false, lockerX: 700, lockerY: 100 },
        "FOOD": { bg: "#0a0a0a", done: false, momX: 400, momY: 100 },
        "STORAGE": { bg: "#fff", done: false, hasLadder: false, ladderX: 750, ladderY: 550 }
    },
    keys: { w: false, a: false, s: false, d: false },
    initialized: false
};

// --- 2. GAME LOGIC ---
function update() {
    if (game.state !== "roaming") return;

    let p = game.player;
    if (game.keys.w) p.velY -= p.accel;
    if (game.keys.s) p.velY += p.accel;
    if (game.keys.a) p.velX -= p.accel;
    if (game.keys.d) p.velX += p.accel;

    p.velX *= p.friction; p.velY *= p.friction;
    p.x += p.velX; p.y += p.velY;

    p.x = Math.max(30, Math.min(770, p.x));
    p.y = Math.max(30, Math.min(570, p.y));

    // Animation Logic
    let speed = Math.sqrt(p.velX*p.velX + p.velY*p.velY);
    if (speed > 0.5) {
        if (Math.abs(p.velX) > Math.abs(p.velY)) { p.currentRow = p.velX > 0 ? ROWS.RIGHT : ROWS.LEFT; }
        else { p.currentRow = p.velY > 0 ? ROWS.DOWN : ROWS.UP; }
        p.stepCounter += speed * 0.1;
        p.currentCol = Math.floor(p.stepCounter) % 3;
    } else { p.currentCol = 1; }

    checkRoomTriggers();
}

function checkRoomTriggers() {
    let p = game.player;
    let room = game.rooms[game.currentRoom];

    if (game.currentRoom === "HALL") {
        room.doors.forEach(d => {
            if (Math.abs(p.x - d.x) < 40 && Math.abs(p.y - d.y) < 40) {
                game.currentRoom = d.target;
                document.getElementById('room-name').innerText = d.target;
                p.x = 400; p.y = 300; p.velX = 0; p.velY = 0;
            }
        });
    }

    // MECHANICAL: Dark encounter with Friend
    if (game.currentRoom === "MECHANICAL" && !room.done) {
        if (Math.abs(p.x - room.enemyX) < 60 && Math.abs(p.y - room.enemyY) < 60) {
            triggerDialogue("FRIEND: 'You turned me into a sub-routine, Vesper. Was the digital silence worth it?'", [
                { text: "FIGHT", d: 2, action: () => { room.done = true; returnToHall(); } },
                { text: "CALL AI MOM", d: 15, action: () => { room.done = true; returnToHall(); } }
            ]);
        }
    }

    // PERSONAL: Password Locker
    if (game.currentRoom === "PERSONAL" && !room.done) {
        if (p.x > 650 && p.y < 150) {
            game.state = "dialogue";
            diagBox.style.display = "block";
            inputArea.style.display = "block";
            textContent.innerText = "The locker is sealed. Hint: Ascending order of the markings (1,3,5,7).";
            document.getElementById('submit-pass').onclick = () => {
                if (document.getElementById('pass-input').value === "1357") {
                    room.done = true; game.memories++; returnToHall();
                }
            };
        }
    }

    // FOOD: Dark encounter with Mom
    if (game.currentRoom === "FOOD" && !room.done) {
        if (Math.abs(p.x - room.momX) < 60 && Math.abs(p.y - room.momY) < 60) {
            triggerDialogue("MOTHER: 'You look so thin, Vesper. Stay here... I've prepared your favorites.'", [
                { text: "REFUSE", d: 5, action: () => { room.done = true; returnToHall(); } },
                { text: "EAT (FORGET)", d: 20, action: () => { room.done = true; returnToHall(); } }
            ]);
        }
    }

    // STORAGE: Find Ladder -> Get Shard
    if (game.currentRoom === "STORAGE" && !room.done) {
        if (!room.hasLadder && p.x > 700 && p.y > 500) {
            room.hasLadder = true;
            triggerDialogue("Vesper found a ladder behind the junk. Now check the high shelves.");
        }
        if (room.hasLadder && p.y < 100) {
            room.done = true; game.memories++; returnToHall();
        }
    }
}

// --- 3. RENDERING ---
function draw() {
    if (!game.initialized) return;
    update();
    const room = game.rooms[game.currentRoom];

    ctx.fillStyle = room.bg;
    ctx.fillRect(0, 0, 800, 600);

    // Dark Room Flashlight Effect
    if (room.bg === "#050505" || room.bg === "#0a0a0a") {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.98)";
        ctx.fillRect(0,0,800,600);
        ctx.globalCompositeOperation = "destination-out";
        let grad = ctx.createRadialGradient(game.player.x, game.player.y, 20, game.player.x, game.player.y, 150);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(game.player.x, game.player.y, 150, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    // Draw Vesper
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.beginPath(); ctx.ellipse(game.player.x, game.player.y + 25, 12, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.drawImage(
        spriteSheet, 
        CHARACTER_OFFSET_X + (game.player.currentCol * 32), 
        CHARACTER_OFFSET_Y + game.player.currentRow, 
        32, 32, game.player.x - 32, game.player.y - 32, 64, 64
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

window.addEventListener('keydown', (e) => { if(e.key.toLowerCase() in game.keys) game.keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { if(e.key.toLowerCase() in game.keys) game.keys[e.key.toLowerCase()] = false; });
startBtn.onclick = () => { document.getElementById('overlay').style.display='none'; game.initialized=true; draw(); };
