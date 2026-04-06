const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let game = {
    currentRoom: "HALL",
    decay: 0,
    memories: 0,
    state: "roaming",
    player: { x: 400, y: 300, speed: 5 },
    camera: { x: 0, y: 0 },
    // Room Data
    rooms: {
        "HALL": { bg: "#fff", doors: [
            { x: 100, y: 300, target: "MECHANICAL", label: "MECHANICAL" },
            { x: 700, y: 300, target: "PERSONAL", label: "PERSONAL" },
            { x: 400, y: 100, target: "FOOD", label: "FOOD" },
            { x: 400, y: 500, target: "STORAGE", label: "STORAGE" }
        ]},
        "MECHANICAL": { bg: "#050505", done: false, enemyX: 700, enemyY: 500 },
        "PERSONAL": { bg: "#fff", done: false, code: "1357", codeFound: [false,false,false,false], lockerX: 700, lockerY: 100 },
        "FOOD": { bg: "#0a0a0a", done: false, momX: 400, momY: 100 },
        "STORAGE": { bg: "#fff", done: false, hasLadder: false, ladderX: 700, ladderY: 500, shardBox: Math.floor(Math.random()*6) }
    },
    keys: {}, initialized: false
};

function drawVesper(x, y) {
    ctx.save(); ctx.translate(x, y);
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.beginPath(); ctx.ellipse(0, 15, 10, 4, 0, 0, Math.PI*2); ctx.fill();
    // Body & Head (Omori Style)
    ctx.fillStyle = "#222"; ctx.fillRect(-8, -5, 16, 18);
    ctx.fillStyle = "#fff"; ctx.strokeRect(-10, -25, 20, 20); ctx.fillRect(-10, -25, 20, 20);
    // Eyes
    ctx.fillStyle = "#000"; ctx.fillRect(-6, -18, 3, 5); ctx.fillRect(3, -18, 3, 5);
    // Hair
    ctx.fillStyle = "#000"; ctx.fillRect(-12, -27, 24, 7);
    ctx.restore();
}

function triggerDialogue(txt, options = []) {
    game.state = "dialogue";
    document.getElementById('dialogue-wrap').style.display = "block";
    document.getElementById('text-content').innerText = txt;
    const container = document.getElementById('opt-container');
    container.innerHTML = "";
    
    options.forEach(o => {
        const btn = document.createElement('button');
        btn.className = "opt-btn";
        btn.innerText = o.text;
        btn.onclick = () => { o.action(); };
        container.appendChild(btn);
    });
}

function returnToHall() {
    game.currentRoom = "HALL";
    game.player.x = 400; game.player.y = 300;
    document.getElementById('dialogue-wrap').style.display = "none";
    document.getElementById('input-area').style.display = "none";
    game.state = "roaming";
}

function update() {
    if (game.state !== "roaming") return;

    // Movement
    if (game.keys['KeyW']) game.player.y -= game.player.speed;
    if (game.keys['KeyS']) game.player.y += game.player.speed;
    if (game.keys['KeyA']) game.player.x -= game.player.speed;
    if (game.keys['KeyD']) game.player.x += game.player.speed;

    const room = game.rooms[game.currentRoom];

    // Room Specific Logic
    if (game.currentRoom === "HALL") {
        room.doors.forEach(d => {
            if (Math.abs(game.player.x - d.x) < 30 && Math.abs(game.player.y - d.y) < 30) {
                game.currentRoom = d.target;
                game.player.x = 400; game.player.y = 300;
            }
        });
    } 
    
    else if (game.currentRoom === "MECHANICAL") {
        let dist = Math.sqrt((game.player.x-room.enemyX)**2 + (game.player.y-room.enemyY)**2);
        if (dist < 60 && !room.done) {
            triggerDialogue("FRIEND: 'You built this machine to forget me.'", [
                { text: "FIGHT", action: () => { room.done = true; returnToHall(); } },
                { text: "CALL AI MOM", action: () => { game.decay += 15; room.done = true; returnToHall(); } }
            ]);
        }
    }

    else if (game.currentRoom === "PERSONAL") {
        // Code hunting logic...
        if (game.player.x > 650 && game.player.y < 150 && !room.done) {
            document.getElementById('dialogue-wrap').style.display = "block";
            document.getElementById('text-content').innerText = "LOCKER: Enter 4-digit code (Ascending Order).";
            document.getElementById('input-area').style.display = "block";
            document.getElementById('submit-pass').onclick = () => {
                if (document.getElementById('pass-input').value === "1357") {
                    room.done = true; game.memories++; returnToHall();
                }
            };
        }
    }

    else if (game.currentRoom === "STORAGE") {
        if (!room.hasLadder && game.player.x > 650 && game.player.y > 450) {
            room.hasLadder = true;
            triggerDialogue("Found the ladder. Now check the boxes.");
        }
        if (room.hasLadder && game.player.y < 200) {
             room.done = true; game.memories++; returnToHall();
        }
    }
}

function draw() {
    const room = game.rooms[game.currentRoom];
    ctx.fillStyle = room.bg;
    ctx.fillRect(0,0,800,600);

    // Dark Room Visibility (Only see near player)
    if (room.bg === "#050505" || room.bg === "#0a0a0a") {
        ctx.save();
        ctx.globalCompositeOperation = "destination-in";
        let grad = ctx.createRadialGradient(game.player.x, game.player.y, 20, game.player.x, game.player.y, 150);
        grad.addColorStop(0, "rgba(0,0,0,1)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,800,600);
        ctx.restore();
    }

    drawVesper(game.player.x, game.player.y);
    requestAnimationFrame(draw);
}

window.onkeydown = e => game.keys[e.code] = true;
window.onkeyup = e => game.keys[e.code] = false;
startBtn.onclick = () => { document.getElementById('overlay').style.display='none'; game.initialized=true; draw(); };
                
