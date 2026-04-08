const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const diagBox = document.getElementById('dialogue-wrap');
const textContent = document.getElementById('text-content');
const optContainer = document.getElementById('opt-container');
const inputArea = document.getElementById('input-area');
const passInput = document.getElementById('pass-input');
const submitPass = document.getElementById('submit-pass');
const roomNameEl = document.getElementById('room-name');
const memCountEl = document.getElementById('mem-count');
const decayFill = document.getElementById('decay-fill');

const spriteSheet = new Image();
spriteSheet.src = 'pic movement.jpg';

const FRAME_SIZE = 64;
const ROWS = {
    DOWN: 0,
    LEFT: FRAME_SIZE,
    RIGHT: FRAME_SIZE * 2,
    UP: FRAME_SIZE * 3
};

const ROOM_THEMES = {
    HALL: '#f6f6f6',
    MECHANICAL: '#0a0a0a',
    PERSONAL: '#ffffff',
    FOOD: '#080808',
    STORAGE: '#fefefe'
};

const game = {
    currentRoom: 'HALL',
    state: 'roaming',
    decay: 6,
    memories: 0,
    maxMemories: 4,
    knownClues: new Set(),
    inventory: new Set(),
    endingTriggered: false,
    time: 0,
    player: {
        x: 400,
        y: 300,
        velX: 0,
        velY: 0,
        accel: 0.62,
        friction: 0.82,
        stepCounter: 0,
        currentCol: 0,
        currentRow: ROWS.DOWN
    },
    rooms: {
        HALL: {
            bg: ROOM_THEMES.HALL,
            doors: [
                { x: 45, y: 300, target: 'MECHANICAL', spawn: { x: 740, y: 300 } },
                { x: 755, y: 300, target: 'PERSONAL', spawn: { x: 60, y: 300 } },
                { x: 400, y: 45, target: 'FOOD', spawn: { x: 400, y: 540 } },
                { x: 400, y: 555, target: 'STORAGE', spawn: { x: 400, y: 70 } }
            ],
            interactions: [
                {
                    id: 'mirror',
                    x: 400,
                    y: 300,
                    radius: 70,
                    label: 'Mirror',
                    done: false,
                    run: () => {
                        openDialogue({
                            text: game.memories < 3
                                ? 'Your reflection is one beat behind. A voice whispers: "Collect what you buried first."'
                                : 'The reflection finally moves with you. The hallway stops breathing for a moment.',
                            options: [{ text: 'Step away', onPick: closeDialogue }]
                        });
                    }
                }
            ]
        },
        MECHANICAL: {
            bg: ROOM_THEMES.MECHANICAL,
            done: false,
            interactions: [
                {
                    id: 'fusePuzzle',
                    x: 640,
                    y: 120,
                    radius: 65,
                    label: 'Control Box',
                    done: false,
                    run: () => openFusePuzzle()
                }
            ]
        },
        PERSONAL: {
            bg: ROOM_THEMES.PERSONAL,
            done: false,
            interactions: [
                {
                    id: 'journal',
                    x: 675,
                    y: 125,
                    radius: 70,
                    label: 'Locked Drawer',
                    done: false,
                    run: () => openCodePuzzle()
                }
            ]
        },
        FOOD: {
            bg: ROOM_THEMES.FOOD,
            done: false,
            interactions: [
                {
                    id: 'catBattle',
                    x: 400,
                    y: 160,
                    radius: 75,
                    label: 'Something waits at the table',
                    done: false,
                    run: () => startBattle()
                }
            ]
        },
        STORAGE: {
            bg: ROOM_THEMES.STORAGE,
            done: false,
            interactions: [
                {
                    id: 'toyBox',
                    x: 140,
                    y: 470,
                    radius: 70,
                    label: 'Toy Box',
                    done: false,
                    run: () => openToyChoice()
                }
            ]
        }
    },
    keys: { w: false, a: false, s: false, d: false },
    initialized: false
};

function updateUi() {
    roomNameEl.innerText = game.currentRoom === 'HALL' ? 'MAIN HALL' : game.currentRoom;
    memCountEl.innerText = `${game.memories}/${game.maxMemories}`;
    decayFill.style.width = `${Math.max(0, Math.min(game.decay, 100))}%`;
}

function update() {
    if (!game.initialized || game.state !== 'roaming') return;

    const p = game.player;
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

    const speed = Math.sqrt(p.velX * p.velX + p.velY * p.velY);
    if (speed > 0.5) {
        if (Math.abs(p.velX) > Math.abs(p.velY)) {
            p.currentRow = p.velX > 0 ? ROWS.RIGHT : ROWS.LEFT;
        } else {
            p.currentRow = p.velY > 0 ? ROWS.DOWN : ROWS.UP;
        }
        p.stepCounter += speed * 0.15;
        p.currentCol = Math.floor(p.stepCounter) % 4;
        game.time += 0.4;
        if (Math.floor(game.time) % 50 === 0) {
            game.decay = Math.min(100, game.decay + 0.03);
        }
    } else {
        p.currentCol = 0;
    }

    checkRoomLogic();
    updateUi();
}

function checkRoomLogic() {
    const p = game.player;
    const room = game.rooms[game.currentRoom];

    if (game.currentRoom === 'HALL') {
        room.doors.forEach((door) => {
            if (Math.abs(p.x - door.x) < 35 && Math.abs(p.y - door.y) < 35) {
                moveToRoom(door.target, door.spawn);
            }
        });
    }

    if (!room.interactions) return;

    room.interactions.forEach((interaction) => {
        if (interaction.done) return;
        if (Math.abs(p.x - interaction.x) < interaction.radius && Math.abs(p.y - interaction.y) < interaction.radius) {
            interaction.run();
        }
    });
}

function moveToRoom(target, spawn) {
    game.currentRoom = target;
    game.player.x = spawn.x;
    game.player.y = spawn.y;
    game.player.velX = 0;
    game.player.velY = 0;
    updateUi();
}

function openDialogue({ text, options = [] }) {
    game.state = 'dialogue';
    diagBox.style.display = 'block';
    inputArea.style.display = 'none';
    passInput.value = '';
    textContent.innerText = text;
    optContainer.innerHTML = '';

    options.forEach((option) => {
        const btn = document.createElement('button');
        btn.className = 'opt-btn';
        btn.innerText = option.text;
        btn.onclick = option.onPick;
        optContainer.appendChild(btn);
    });
}

function closeDialogue() {
    diagBox.style.display = 'none';
    inputArea.style.display = 'none';
    optContainer.innerHTML = '';
    game.state = 'roaming';
}

function unlockMemory(roomKey, interactionId, memoryName, decayReward = 8) {
    const room = game.rooms[roomKey];
    const interaction = room.interactions.find((node) => node.id === interactionId);
    interaction.done = true;
    room.done = true;
    if (!game.inventory.has(memoryName)) {
        game.inventory.add(memoryName);
        game.memories += 1;
        game.decay = Math.max(0, game.decay - decayReward);
    }
    checkEnding();
}

function openFusePuzzle() {
    game.knownClues.add('fuse-order');
    openDialogue({
        text: 'Four dead fuses flicker in the dark. A scratched note reads: "Not power. Pattern. 2 - 4 - 1 - 3."',
        options: [
            {
                text: 'Restore sequence',
                onPick: () => {
                    unlockMemory('MECHANICAL', 'fusePuzzle', 'Rusty Fuse', 10);
                    openDialogue({
                        text: 'The room hums back to life. You recover a warm fuse wrapped in black ribbon.',
                        options: [{ text: 'Return to hall', onPick: returnToHall }]
                    });
                }
            },
            { text: 'Back away', onPick: closeDialogue }
        ]
    });
}

function openCodePuzzle() {
    game.state = 'dialogue';
    diagBox.style.display = 'block';
    textContent.innerText = 'Drawer lock: "Books(1), Picture(3), Carvings(5), Hidden(7)." Enter the code.';
    optContainer.innerHTML = '<button class="opt-btn" id="cancel-pass">Cancel</button>';
    inputArea.style.display = 'block';
    passInput.value = '';

    document.getElementById('cancel-pass').onclick = closeDialogue;
    submitPass.onclick = () => {
        if (passInput.value.trim() === '1357') {
            unlockMemory('PERSONAL', 'journal', 'Photo Fragment', 8);
            openDialogue({
                text: 'The drawer clicks. A torn family photo stares back, edges damp with ink.',
                options: [{ text: 'Hold it tight', onPick: returnToHall }]
            });
        } else {
            textContent.innerText = 'Wrong code. The lock buzzes like it is laughing at you.';
        }
    };
}

function openToyChoice() {
    openDialogue({
        text: 'Inside the toy box: a knife-shaped crayon and a tiny violin. Which memory do you keep?',
        options: [
            {
                text: 'Take violin charm',
                onPick: () => {
                    unlockMemory('STORAGE', 'toyBox', 'Violin Charm', 12);
                    game.decay = Math.max(0, game.decay - 4);
                    openDialogue({
                        text: 'A soft note rings in your ears. For once, your hands stop shaking.',
                        options: [{ text: 'Leave', onPick: returnToHall }]
                    });
                }
            },
            {
                text: 'Take knife crayon',
                onPick: () => {
                    unlockMemory('STORAGE', 'toyBox', 'Knife Crayon', 5);
                    game.decay = Math.min(100, game.decay + 10);
                    openDialogue({
                        text: 'The wax edge cuts your thumb. The room gets louder, but clearer.',
                        options: [{ text: 'Leave', onPick: returnToHall }]
                    });
                }
            }
        ]
    });
}

function startBattle() {
    game.state = 'dialogue';
    let enemyHp = 18;
    let playerHp = 16;

    const renderBattleText = (line) => {
        textContent.innerText = `${line}\n\nVESPER HP: ${playerHp}   SOMETHING HP: ${enemyHp}`;
    };

    const enemyTurn = () => {
        if (enemyHp <= 0 || playerHp <= 0) return;
        const attack = Math.random() < 0.5 ? 3 : 4;
        playerHp -= attack;
        if (playerHp <= 0) {
            renderBattleText('Something lunges through your chest. You wake up in the hallway, gasping.');
            optContainer.innerHTML = '';
            const retry = document.createElement('button');
            retry.className = 'opt-btn';
            retry.innerText = 'Wake up';
            retry.onclick = () => {
                game.decay = Math.min(100, game.decay + 12);
                returnToHall();
            };
            optContainer.appendChild(retry);
            return;
        }
        renderBattleText(`Something scratches for ${attack}.`);
    };

    const action = (type) => {
        if (type === 'calm') {
            const heal = 2;
            playerHp = Math.min(16, playerHp + heal);
            renderBattleText(`You steady your breath (+${heal} HP).`);
        }
        if (type === 'stab') {
            const hit = Math.random() < 0.75 ? 5 : 2;
            enemyHp -= hit;
            renderBattleText(`You strike through static for ${hit}.`);
        }
        if (type === 'remember') {
            const hit = game.inventory.has('Violin Charm') ? 7 : 4;
            enemyHp -= hit;
            renderBattleText(`You remember sunlight and deal ${hit}.`);
        }

        if (enemyHp <= 0) {
            unlockMemory('FOOD', 'catBattle', 'Picnic Ribbon', 14);
            textContent.innerText = 'Something collapses into paper confetti. A picnic ribbon remains.';
            optContainer.innerHTML = '';
            const leave = document.createElement('button');
            leave.className = 'opt-btn';
            leave.innerText = 'Take ribbon';
            leave.onclick = returnToHall;
            optContainer.appendChild(leave);
            return;
        }

        setTimeout(enemyTurn, 180);
    };

    diagBox.style.display = 'block';
    inputArea.style.display = 'none';
    optContainer.innerHTML = '';

    ['Stab', 'Calm Down', 'Remember'].forEach((label) => {
        const btn = document.createElement('button');
        btn.className = 'opt-btn';
        btn.innerText = label;
        btn.onclick = () => action(label === 'Stab' ? 'stab' : label === 'Calm Down' ? 'calm' : 'remember');
        optContainer.appendChild(btn);
    });

    renderBattleText('The table stretches into a boss arena. Something waits with empty eyes.');
}

function checkEnding() {
    if (game.endingTriggered || game.memories < game.maxMemories) return;
    game.endingTriggered = true;

    openDialogue({
        text: 'All fragments recovered. The mirror in the hall is now a door. Do you open it?',
        options: [
            {
                text: 'Open the door',
                onPick: () => {
                    game.decay = Math.max(0, game.decay - 20);
                    openDialogue({
                        text: 'Morning light floods the house. Vesper finally steps outside. TRUE END unlocked.',
                        options: [{ text: 'Restart dream', onPick: resetRun }]
                    });
                }
            },
            {
                text: 'Stay inside',
                onPick: () => {
                    game.decay = Math.min(100, game.decay + 20);
                    openDialogue({
                        text: 'You sit with the shadows a little longer. NEUTRAL END unlocked.',
                        options: [{ text: 'Restart dream', onPick: resetRun }]
                    });
                }
            }
        ]
    });
}

function resetRun() {
    Object.values(game.rooms).forEach((room) => {
        room.done = false;
        if (room.interactions) {
            room.interactions.forEach((interaction) => {
                interaction.done = false;
            });
        }
    });

    game.currentRoom = 'HALL';
    game.state = 'roaming';
    game.decay = 6;
    game.memories = 0;
    game.knownClues.clear();
    game.inventory.clear();
    game.endingTriggered = false;
    game.player.x = 400;
    game.player.y = 300;
    updateUi();
    closeDialogue();
}

function returnToHall() {
    moveToRoom('HALL', { x: 400, y: 320 });
    closeDialogue();
}

function drawRoomDetails(room) {
    ctx.save();

    if (game.currentRoom === 'HALL') {
        ctx.strokeStyle = '#0f0f0f';
        ctx.lineWidth = 3;
        ctx.strokeRect(220, 180, 360, 240);
        ctx.fillStyle = '#fff';
        ctx.fillRect(348, 230, 104, 140);
        ctx.strokeRect(348, 230, 104, 140);
    }

    if (game.currentRoom === 'MECHANICAL') {
        ctx.fillStyle = '#1a1a1a';
        for (let i = 0; i < 12; i += 1) {
            ctx.fillRect(30 + i * 62, 420 + (i % 2) * 30, 44, 110);
        }
    }

    if (game.currentRoom === 'PERSONAL') {
        ctx.fillStyle = '#ececec';
        ctx.fillRect(90, 100, 240, 160);
        ctx.fillStyle = '#d0d0d0';
        ctx.fillRect(550, 80, 180, 120);
        ctx.strokeStyle = '#111';
        ctx.strokeRect(550, 80, 180, 120);
    }

    if (game.currentRoom === 'FOOD') {
        ctx.fillStyle = '#111';
        ctx.fillRect(160, 110, 480, 120);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(160, 110, 480, 120);
    }

    if (game.currentRoom === 'STORAGE') {
        ctx.fillStyle = '#fafafa';
        ctx.strokeStyle = '#121212';
        for (let r = 0; r < 3; r += 1) {
            ctx.strokeRect(80 + r * 220, 100, 160, 380);
        }
    }

    room.interactions?.forEach((interaction) => {
        if (interaction.done) return;
        const pulse = 4 + Math.sin(game.time * 0.05) * 2;
        ctx.strokeStyle = game.currentRoom === 'FOOD' ? '#fff' : '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(interaction.x, interaction.y, pulse + 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = game.currentRoom === 'FOOD' ? '#f6f6f6' : '#111';
        ctx.font = '12px Georgia';
        ctx.fillText(interaction.label, interaction.x - 48, interaction.y - 26);
    });

    ctx.restore();
}

function draw() {
    if (!game.initialized) return;

    update();
    const room = game.rooms[game.currentRoom];

    ctx.fillStyle = room.bg;
    ctx.fillRect(0, 0, 800, 600);

    drawRoomDetails(room);

    if (room.bg === '#0a0a0a' || room.bg === '#080808') {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.96)';
        ctx.fillRect(0, 0, 800, 600);
        ctx.globalCompositeOperation = 'destination-out';
        const grad = ctx.createRadialGradient(game.player.x, game.player.y, 20, game.player.x, game.player.y, 180);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(game.player.x, game.player.y, 180, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(game.player.x, game.player.y + 25, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (spriteSheet.complete) {
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
    }

    requestAnimationFrame(draw);
}

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k in game.keys) {
        e.preventDefault();
        game.keys[k] = true;
    }
});

window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k in game.keys) game.keys[k] = false;
});

startBtn.onclick = () => {
    document.getElementById('overlay').style.display = 'none';
    game.initialized = true;
    game.state = 'roaming';
    updateUi();
    draw();
};
