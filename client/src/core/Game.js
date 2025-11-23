import { GAME_WIDTH, GAME_HEIGHT, HORIZON_Y, FPS, FRAME_DELAY, Z_BOUNDS } from '../constants.js';
import { Input } from './Input.js';
import { Network } from './Network.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Entity } from '../entities/Entity.js';
import { Weapon, dropWeapon } from '../weapons/Weapon.js';
import { Item } from '../items/Item.js';
import { Projectile } from '../effects/Projectile.js';
import { createParticle } from '../effects/Particle.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = GAME_WIDTH;
        this.canvas.height = GAME_HEIGHT;

        this.input = new Input();
        this.network = new Network();

        this.entities = [];
        this.particles = [];
        this.projectiles = [];
        this.items = [];
        this.weapons = [];

        this.player = null;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.gameOver = false;
        this.roomId = "Lobby";

        this.menuScreen = document.getElementById('menu-screen');
        this.lobbyScreen = document.getElementById('lobby-screen');
        this.gameContainer = document.getElementById('game-container');
        this.statusIndicator = document.getElementById('status-indicator');
        this.debugPanel = document.getElementById('debug-panel');
        this.btnStartMatch = document.getElementById('btn-start-match');
        this.playerListEl = document.getElementById('player-list');
        this.p1Label = document.getElementById('p1-label');

        this.initUI();
    }

    get isHost() { return this.network.isHost; }
    get myUserId() { return this.network.myUserId; }

    initUI() {
        document.getElementById('btn-create').addEventListener('click', () => this.connect('localhost:8080', true));
        document.getElementById('btn-join').addEventListener('click', () => {
            const ipInput = document.getElementById('server-ip');
            if (ipInput) this.connect(ipInput.value, false);
        });

        this.btnStartMatch.addEventListener('click', () => {
            this.network.send({ type: 'start_game' });
            this.launchGame();
        });
    }

    connect(address, asHost) {
        this.statusIndicator.innerText = "Connecting to " + address;

        // Immediately transition to lobby screen
        this.menuScreen.style.display = 'none';
        this.lobbyScreen.style.display = 'flex';
        document.getElementById('lobby-ip').innerText = address;

        this.network.connect(address, asHost,
            () => { // onOpen
                this.statusIndicator.innerText = "Connected";

                if (asHost) {
                    this.btnStartMatch.disabled = false;
                    this.btnStartMatch.style.opacity = 1;
                }

                this.player = new Player(100, 100);
                this.player.id = this.myUserId;
                this.player.ownerId = this.myUserId;
                this.player.isHost = asHost;
                this.entities = [this.player];

                this.updateLobbyUI();
            },
            (msg) => this.handleNetworkMessage(msg), // onMessage
            () => { // onClose
                this.statusIndicator.innerText = "Disconnected";
                alert("Connection lost");
                this.menuScreen.style.display = 'flex';
                this.lobbyScreen.style.display = 'none';
            },
            (e) => { // onError
                this.statusIndicator.innerText = "Connection Failed";
                this.menuScreen.style.display = 'flex';
                this.lobbyScreen.style.display = 'none';
            }
        );
    }

    handleNetworkMessage(msg) {
        if (msg.type === 'start_game') {
            this.launchGame();
        }
        else if (msg.type === 'state_update') {
            this.handleRemoteUpdate(msg.data);
        }
        else if (msg.type === 'hit') {
            this.handleRemoteHit(msg);
        }
        else if (msg.type === 'spawn_enemy') {
            this.handleRemoteSpawn(msg);
        }
        else if (msg.type === 'remove') {
            const ent = this.entities.find(e => e.id === msg.id);
            if (ent) ent.markedForDeletion = true;
        }
        else if (msg.type === 'join') {
            if (!this.entities.find(e => e.id === msg.id)) {
                const p2 = new Player(100, 100);
                p2.id = msg.id;
                p2.isRemote = true;
                p2.color = '#e67e22';
                p2.isHost = msg.isHost;
                this.entities.push(p2);
            }
            if (this.isHost) {
                this.network.send({
                    type: 'lobby_update',
                    players: this.entities.filter(e => e.type === 'player').map(p => ({ id: p.id, isHost: p.isHost }))
                });
            }
            this.updateLobbyUI();
        }
        else if (msg.type === 'lobby_update') {
            msg.players.forEach(pData => {
                if (pData.id !== this.myUserId && !this.entities.find(e => e.id === pData.id)) {
                    const p2 = new Player(100, 100);
                    p2.id = pData.id;
                    p2.isRemote = true;
                    p2.color = '#e67e22';
                    p2.isHost = pData.isHost;
                    this.entities.push(p2);
                }
            });
            this.updateLobbyUI();
        }
    }

    updateLobbyUI() {
        this.playerListEl.innerHTML = "";
        const sortedPlayers = this.entities.filter(e => e.type === 'player').sort((a, b) => {
            if (a.isHost) return -1;
            if (b.isHost) return 1;
            return a.id.localeCompare(b.id);
        });

        sortedPlayers.forEach((p, i) => {
            const li = document.createElement('li');
            const role = p.isHost ? " (HOST)" : "";
            const me = p.id === this.myUserId ? " (You)" : "";
            li.innerHTML = `<span>Player ${i + 1}${role}${me}</span> <span class="ready-status">Ready</span>`;
            this.playerListEl.appendChild(li);
        });
    }

    launchGame() {
        this.lobbyScreen.style.display = 'none';
        this.gameContainer.style.display = 'flex';
        this.p1Label.innerText = this.isHost ? "PLAYER 1 (HOST)" : "PLAYER 2";
        this.gameLoop(0);

        if (this.isHost) {
            setTimeout(() => this.spawnEnemy(), 2000);
        }
    }

    handleRemoteUpdate(data) {
        if (data.id === this.myUserId) return;

        let ent = this.entities.find(e => e.id === data.id);
        if (!ent) {
            if (data.type === 'player') {
                ent = new Player(data.x, data.z);
                ent.color = '#e67e22';
            } else {
                ent = new Enemy(data.x, data.z);
            }
            ent.id = data.id;
            ent.ownerId = data.ownerId;
            ent.isRemote = true;
            this.entities.push(ent);
        }

        ent.targetX = data.x;
        ent.targetZ = data.z;
        ent.targetY = data.y;
        ent.state = data.state;
        ent.facing = data.facing;
        ent.hp = data.hp;
        ent.weapon = data.weapon;
        ent.lastSeen = Date.now();
    }

    handleRemoteSpawn(msg) {
        const e = new Enemy(msg.x, msg.z);
        e.id = msg.id;
        e.ownerId = msg.ownerId;
        e.isRemote = true;
        this.entities.push(e);
    }

    handleRemoteHit(msg) {
        const target = this.entities.find(e => e.id === msg.targetId);
        if (target && (target.id === this.myUserId || target.ownerId === this.myUserId)) {
            target.takeDamage(msg.damage, msg.forceX, msg.forceY, this);
        }
    }

    spawnEnemy() {
        if (!this.isHost) return;

        const ex = this.canvas.width + 50;
        const ez = Math.random() * (Z_BOUNDS.max - Z_BOUNDS.min);
        const id = "enemy_" + Math.floor(Math.random() * 10000);

        this.network.send({
            type: 'spawn_enemy',
            id: id,
            ownerId: this.myUserId,
            x: ex, z: ez
        });

        const e = new Enemy(ex, ez);
        e.id = id;
        e.ownerId = this.myUserId;
        e.facing = -1;
        this.entities.push(e);
    }

    spawnWeapon() {
        if (!this.isHost) return;
        const types = ['bat', 'sword', 'spear'];
        const type = types[Math.floor(Math.random() * types.length)];
        const wx = 50 + Math.random() * (this.canvas.width - 100);
        const wz = Math.random() * 200;
        this.weapons.push(new Weapon(wx, wz, type));
    }

    handleInput() {
        if (this.player.state === 'fallen' || this.player.state === 'hurt' || this.player.state === 'rise') return;

        let dx = 0; let dz = 0; const speed = 4;
        const keys = this.input.keys;

        // Drop Weapon
        if (keys.d && keys.ArrowDown && keys.s) {
            keys.s = false; dropWeapon(this, this.player); return;
        }
        // Heal
        if (keys.d && keys.ArrowUp && keys.s) {
            keys.s = false; if (this.player.mp >= 50) this.performMove(this.player, 'heal'); return;
        }

        // Run
        if (this.player.state === 'run') {
            if (this.player.facing === 1 && !keys.ArrowRight) this.player.setState('idle');
            else if (this.player.facing === -1 && !keys.ArrowLeft) this.player.setState('idle');
            else {
                this.player.vx = this.player.facing * 9;
                if (keys.ArrowUp) dz = -speed * 0.8; if (keys.ArrowDown) dz = speed * 0.8; this.player.z += dz;
            }

            if (keys.a) { keys.a = false; this.performMove(this.player, 'run_attack'); return; }
            if (keys.s && this.player.y === 0) { this.player.vy = 12; this.player.state = 'jump'; keys.s = false; return; }
        }
        else {
            const isAttacking = ['attack', 'weapon_attack', 'uppercut', 'whirlwind', 'heal'].includes(this.player.state);
            if (!isAttacking) {
                if (keys.ArrowLeft) { dx = -speed; this.player.facing = -1; }
                if (keys.ArrowRight) { dx = speed; this.player.facing = 1; }
                if (keys.ArrowUp) dz = -speed * 0.7;
                if (keys.ArrowDown) dz = speed * 0.7;

                if (dx || dz) {
                    this.player.vx = dx;
                    this.player.z += dz;
                    if (this.player.state === 'idle' && this.player.y === 0) this.player.state = 'walk';
                } else {
                    if (this.player.state === 'walk' && this.player.y === 0) this.player.state = 'idle';
                }
            }
        }

        if (keys.s && this.player.y === 0) {
            if (!['attack', 'weapon_attack', 'uppercut', 'whirlwind', 'heal'].includes(this.player.state)) {
                this.player.vy = 12; this.player.state = 'jump'; keys.s = false;
            }
        }

        if (keys.d) { this.player.state = 'defend'; this.player.vx = 0; }

        if (keys.a && this.player.state !== 'run') {
            keys.a = false;
            if (this.player.state === 'jump') this.performMove(this.player, 'jump_kick');
            else if (keys.d) {
                if (keys.ArrowUp && this.player.mp >= 15) this.performMove(this.player, 'uppercut');
                else if (keys.ArrowDown && this.player.mp >= 30) this.performMove(this.player, 'whirlwind');
                else if (keys.ArrowLeft || keys.ArrowRight) this.performMove(this.player, 'blast');
            }
            else if (!['attack', 'hurt', 'uppercut', 'whirlwind', 'heal', 'jump_kick', 'weapon_attack'].includes(this.player.state) && this.player.y === 0) {

                // Pickup Check
                let pickedUp = false;
                if (!this.player.weapon) {
                    for (let w of this.weapons) {
                        if (w.state === 'ground' && !w.markedForDeletion &&
                            Math.abs(this.player.x - w.x) < 30 && Math.abs(this.player.z - w.z) < 20) {

                            this.player.weapon = w.type; w.markedForDeletion = true;
                            createParticle(this.particles, w.x, w.z, 40, 'text', 'GOT ' + w.type.toUpperCase());
                            pickedUp = true; break;
                        }
                    }
                }

                if (!pickedUp) {
                    if (this.player.weapon) this.performMove(this.player, 'weapon_attack');
                    else this.performMove(this.player, 'punch');
                }
            }
        }
    }

    performMove(actor, type) {
        if (type === 'blast') {
            actor.mp -= 30; actor.setState('attack');
            this.projectiles.push(new Projectile(actor.x, actor.z, actor.y + 30, actor.facing, actor));
            return;
        }
        if (type === 'heal') {
            actor.mp -= 50; actor.setState('heal'); actor.hp = Math.min(actor.hp + 20, 100);
            createParticle(this.particles, actor.x, actor.z, actor.y + 60, 'text', '+HP'); return;
        }

        let d = 10, fx = 2, fy = 0, rx = 60, ry = 50, rz = 20;
        if (type === 'uppercut') { actor.mp -= 15; actor.setState('uppercut'); actor.vy = 10; actor.vx = actor.facing * 2; d = 25; fx = 5; fy = 15; ry = 80; }
        else if (type === 'jump_kick') { actor.setState('jump_kick'); actor.vx = actor.facing * 6; d = 15; fx = 10; rx = 100; ry = 80; rz = 45; }
        else if (type === 'whirlwind') { actor.mp -= 30; actor.setState('whirlwind'); actor.vx = actor.facing * 3; d = 15; fx = 8; rx = 80; ry = 60; rz = 40; }
        else if (type === 'run_attack') { actor.setState('run_attack'); actor.vx = actor.facing * 8; d = 20; fx = 12; rx = 70; ry = 60; }
        else if (type === 'weapon_attack') {
            actor.setState('weapon_attack');
            if (actor.weapon === 'bat') { d = 30; fx = 8; rx = 90; rz = 30; }
            if (actor.weapon === 'sword') { d = 25; fx = 4; rx = 80; rz = 30; }
            if (actor.weapon === 'spear') { d = 35; fx = 6; rx = 120; rz = 15; }
        }
        else { actor.setState('attack'); actor.comboCount++; actor.comboTimer = 50; }

        this.entities.forEach(ent => {
            if (ent !== actor && ent.state !== 'fallen') {
                if (Math.abs(ent.x - actor.x) < rx && Math.abs(ent.z - actor.z) < rz && Math.abs(ent.y - actor.y) < ry) {
                    if (type === 'whirlwind' || (actor.facing === 1 && ent.x > actor.x) || (actor.facing === -1 && ent.x < actor.x)) {
                        createParticle(this.particles, ent.x, ent.z, ent.y, 'hit');

                        if (ent.isRemote || (ent.type === 'enemy' && ent.ownerId !== this.myUserId)) {
                            ent.setState('hurt');
                            ent.vx = actor.facing * 5;
                            this.network.send({
                                type: 'hit',
                                targetId: ent.id,
                                damage: d,
                                forceX: (ent.x > actor.x ? 1 : -1) * fx,
                                forceY: fy
                            });
                        } else {
                            ent.takeDamage(d, (ent.x > actor.x ? 1 : -1) * fx, fy, this);
                        }
                    }
                }
            }
        });
    }

    updateAI() {
        this.entities.forEach(ent => {
            if (ent.type === 'enemy') {
                ent.updateAI(this);
            }
        });
    }

    gameLoop(timestamp) {
        requestAnimationFrame((t) => this.gameLoop(t));

        if (!this.lastFrameTime) this.lastFrameTime = timestamp;
        const deltaTime = timestamp - this.lastFrameTime;

        if (deltaTime < FRAME_DELAY) return;

        this.lastFrameTime = timestamp - (deltaTime % FRAME_DELAY);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#4caf50'; this.ctx.fillRect(0, HORIZON_Y, this.canvas.width, this.canvas.height - HORIZON_Y);
        this.ctx.strokeStyle = '#388e3c'; this.ctx.beginPath(); this.ctx.moveTo(0, HORIZON_Y); this.ctx.lineTo(this.canvas.width, HORIZON_Y); this.ctx.stroke();

        if (!this.gameOver) {
            this.handleInput();
            this.updateAI();

            const enemies = this.entities.filter(e => e.type === 'enemy');
            if (this.isHost && enemies.length < 1 && Math.random() < 0.02) this.spawnEnemy();
            if (this.isHost && Math.random() < 0.002) this.spawnWeapon();

            this.entities = this.entities.filter(e => !e.markedForDeletion);
            this.items = this.items.filter(i => !i.markedForDeletion);
            this.weapons = this.weapons.filter(w => !w.markedForDeletion);
        }

        this.items.forEach(i => { i.update(this.player, this.particles, this.frameCount); i.draw(this.ctx, this.frameCount); });
        this.weapons.forEach(w => { w.update(this.frameCount); w.draw(this.ctx, this.frameCount); });
        this.entities.forEach(e => { e.update(this); });
        this.projectiles.forEach((p, i) => { p.update(this.entities, this.particles); if (p.life <= 0) this.projectiles.splice(i, 1); });
        this.particles.forEach((p, i) => { p.update(); if (p.life <= 0) this.particles.splice(i, 1); });

        [...this.items, ...this.weapons, ...this.entities, ...this.projectiles, ...this.particles].sort((a, b) => a.z - b.z).forEach(e => {
            if (e.draw) e.draw(this.ctx, this.frameCount);
        });

        if (this.player) {
            document.getElementById('p1-hp').style.width = this.player.hp + '%';
            document.getElementById('p1-mp').style.width = this.player.mp + '%';

            if (this.player.hp <= 0 && !this.gameOver) {
                this.gameOver = true;
                this.showMessage("GAME OVER");
            }
        }

        const pCount = this.entities.filter(e => e.type === 'player').length;
        this.debugPanel.innerHTML = `
            <strong>Room:</strong> ${this.roomId}<br>
            <strong>Players:</strong> ${pCount}<br>
            <strong>Role:</strong> ${this.isHost ? 'HOST' : 'GUEST'}<br>
            <strong>ID:</strong> ${this.myUserId}
        `;

        this.frameCount++;
    }

    showMessage(text) {
        const el = document.getElementById('message-area'); el.innerText = text; el.style.display = 'block';
        setTimeout(() => { if (!this.gameOver) el.style.display = 'none'; }, 2000);
    }
}

// Initialize Game
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
