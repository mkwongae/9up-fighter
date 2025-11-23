import { GRAVITY, DRAG, HORIZON_Y } from '../constants.js';
import { drawShadow } from '../utils.js';
import { createParticle } from '../effects/Particle.js';
import { Item } from '../items/Item.js';
import { drawWeaponShape, dropWeapon } from '../weapons/Weapon.js';

export class Entity {
    constructor(x, z, type) {
        this.x = x; this.z = z; this.y = 0;
        this.vx = 0; this.vz = 0; this.vy = 0;
        this.type = type;
        this.isRemote = false;
        this.targetX = x; this.targetZ = z; this.targetY = 0;
        this.state = 'idle'; this.stateTimer = 0;
        this.hp = 100; this.mp = 100;
        this.comboCount = 0; this.comboTimer = 0;
        this.invulnerable = 0;
        this.color = type === 'player' ? '#3498db' : '#e74c3c';
        this.markedForDeletion = false;
        this.ownerId = null; this.id = null;
        this.weapon = null;
        this.lastSeen = Date.now();
        this.isHost = false;
        this.facing = 1;
    }

    update(game) {
        if (this.isRemote) {
            if (!isNaN(this.targetX)) this.x += (this.targetX - this.x) * 0.2;
            if (!isNaN(this.targetZ)) this.z += (this.targetZ - this.z) * 0.2;
            if (!isNaN(this.targetY)) this.y = this.targetY;
            if (['attack', 'uppercut'].includes(this.state) && this.stateTimer === 0) this.stateTimer = 20;
            this.stateTimer--;
            return;
        }

        this.x += this.vx; this.z += this.vz; this.y += this.vy;

        if (this.y > 0) this.vy -= GRAVITY;
        else { this.y = 0; this.vy = 0; if (['jump', 'jump_kick', 'uppercut'].includes(this.state)) this.setState('idle'); }

        if (this.y === 0) { this.vx *= DRAG; this.vz *= DRAG; }
        if (this.z < 0) this.z = 0;

        this.stateTimer--; this.invulnerable--; this.comboTimer--;
        if (this.comboTimer < 0) this.comboCount = 0;

        if (Math.abs(this.vx) > 0.5 || Math.abs(this.vz) > 0.5) { if (this.state === 'idle' && this.y === 0) this.state = 'walk'; }
        else { if (this.state === 'walk' && this.y === 0) this.state = 'idle'; }

        if (['attack', 'hurt', 'heal', 'whirlwind', 'run_attack', 'weapon_attack'].includes(this.state) && this.stateTimer <= 0) this.setState('idle');

        if (this.state === 'fallen') {
            if (this.type === 'enemy' && this.stateTimer <= 0) {
                this.markedForDeletion = true;
                if (Math.random() < 0.3) {
                    const type = Math.random() > 0.5 ? 'hp' : 'mp';
                    game.items.push(new Item(this.x, this.z, type));
                }
                if (game.isHost) {
                    game.network.send({ type: 'remove', id: this.id });
                }
            } else if (this.type === 'player' && this.stateTimer <= 0) { this.state = 'rise'; this.stateTimer = 30; }
        }
        if (this.state === 'rise' && this.stateTimer <= 0) { this.setState('idle'); this.invulnerable = 60; }
        if (this.mp < 100 && game.frameCount % 10 === 0) this.mp++;

        // Broadcast state
        if (game.frameCount % 3 === 0) {
            game.network.send({
                type: 'state_update',
                data: {
                    id: this.id,
                    type: this.type,
                    ownerId: this.ownerId,
                    x: Math.round(this.x),
                    z: Math.round(this.z),
                    y: Math.round(this.y),
                    state: this.state,
                    facing: this.facing,
                    hp: this.hp,
                    weapon: this.weapon
                }
            });
        }
    }

    setState(newState) {
        if (this.state === 'fallen' || this.state === 'rise') return;
        if (this.state === 'hurt' && !['fallen', 'idle'].includes(newState)) return;
        this.state = newState; this.stateTimer = 0;

        if (newState === 'attack') this.stateTimer = 30;
        if (newState === 'weapon_attack') this.stateTimer = 30;
        if (newState === 'jump_kick') this.stateTimer = 60;
        if (newState === 'uppercut') this.stateTimer = 60;
        if (newState === 'whirlwind') this.stateTimer = 80;
        if (newState === 'heal') this.stateTimer = 70;
        if (newState === 'run_attack') this.stateTimer = 50;
        if (newState === 'hurt') this.stateTimer = 20;
        if (newState === 'fallen') this.stateTimer = 60;
        if (newState === 'defend') this.stateTimer = 10;
    }

    takeDamage(amount, forceX, forceY = 0, game) {
        if (this.invulnerable > 0 || ['fallen', 'rise'].includes(this.state)) return;
        if (this.state === 'defend') {
            amount = Math.floor(amount * 0.2); this.vx = forceX * 0.5;
            if (game) createParticle(game.particles, this.x, this.z, this.y + 40, 'block');
        } else {
            this.vx = forceX; this.vy = forceY; this.setState('hurt');
            if (game) createParticle(game.particles, this.x, this.z, this.y + 40, 'hit');
            if ((forceY > 0 || amount > 15) && this.weapon && game) dropWeapon(game, this);
        }
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.setState('fallen');
            if (this.weapon && game) dropWeapon(game, this);
        }
    }

    draw(ctx, frameCount) {
        const screenX = this.x; const screenY = HORIZON_Y + this.z - this.y;
        drawShadow(ctx, this.x, HORIZON_Y + this.z, 0, 20);

        ctx.save(); ctx.translate(screenX, screenY); ctx.scale(this.facing, 1);

        ctx.fillStyle = this.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;

        let bob = 0; let lean = 0;
        if (this.state === 'idle') bob = Math.sin(frameCount * 0.1) * 2;
        if (this.state === 'walk') { bob = Math.sin(frameCount * 0.3) * 3; lean = 0.1; }
        if (this.state === 'run') { bob = Math.sin(frameCount * 0.5) * 5; lean = 0.3; }
        if (this.state === 'run_attack') lean = 0.5;
        if (this.state === 'jump_kick') lean = -0.2;
        if (this.state === 'weapon_attack') { const p = (30 - this.stateTimer) / 30; lean = -0.5 + (p * 1.5); }

        ctx.rotate(lean);

        if (this.state === 'fallen') {
            ctx.rotate(-Math.PI / 2); ctx.translate(-20, 0);
            if (this.type === 'enemy' && this.stateTimer < 20) ctx.globalAlpha = this.stateTimer / 20;
        }
        if (this.invulnerable > 0 && frameCount % 4 === 0) ctx.globalAlpha = 0.5;

        // LEGS
        ctx.beginPath();
        const legFreq = this.state === 'run' ? 0.8 : 0.4;
        const legAmp = this.state === 'run' ? 15 : 10;
        const legAngle = (this.state === 'walk' || this.state === 'run') ? Math.sin(frameCount * legFreq) : 0;

        if (this.state === 'jump_kick') {
            ctx.moveTo(-5, -20); ctx.lineTo(-15, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5, -20); ctx.lineTo(25, -5); ctx.stroke();
        } else if (this.state === 'whirlwind') {
            const spin = Math.sin(frameCount * 0.8) * 15;
            ctx.moveTo(-5, -20); ctx.lineTo(-15 - spin, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5, -20); ctx.lineTo(15 + spin, 0); ctx.stroke();
        } else if (this.state !== 'fallen') {
            ctx.moveTo(-5, -20 + bob); ctx.lineTo(-10 + legAngle * legAmp, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5, -20 + bob); ctx.lineTo(10 - legAngle * legAmp, 0); ctx.stroke();
        }

        // BODY
        ctx.beginPath(); ctx.rect(-10, -50 + bob, 20, 30); ctx.fill(); ctx.stroke();

        // HEAD
        ctx.fillStyle = '#ffccaa'; ctx.beginPath(); ctx.arc(0, -60 + bob, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#000';
        if (this.state === 'hurt') ctx.fillText('x x', -8, -58 + bob);
        else {
            ctx.beginPath(); ctx.arc(4, -60 + bob, 2, 0, Math.PI * 2); ctx.fill();
            if (this.type === 'player') { ctx.fillStyle = this.isRemote ? '#e67e22' : 'red'; ctx.fillRect(-11, -68 + bob, 22, 5); }
        }

        // ARMS
        ctx.strokeStyle = this.color; ctx.lineWidth = 4;
        let armAngle = 0; let armLen = 15; let armY = -35;
        if (this.state === 'attack') armAngle = -1.5;
        if (this.state === 'defend') armAngle = -2.5;
        if (this.state === 'walk') armAngle = Math.sin(frameCount * 0.4);
        if (this.state === 'run') armAngle = Math.sin(frameCount * 0.8) * 1.5;

        if (this.weapon) {
            let wx = 10, wy = -35 + bob; let wAngle = -0.5;
            if (this.state === 'weapon_attack') { const p = (30 - this.stateTimer) / 30; wAngle = -2.5 + (p * 4); wx = 20; }
            else if (this.state === 'walk') { wAngle = -0.5 + Math.sin(frameCount * 0.2) * 0.2; }
            ctx.beginPath(); ctx.moveTo(0, -45 + bob); ctx.lineTo(wx, wy); ctx.stroke();
            ctx.save(); ctx.translate(wx, wy); ctx.rotate(wAngle); drawWeaponShape(ctx, this.weapon); ctx.restore();
        }
        else if (this.state === 'attack') {
            const p = (30 - this.stateTimer) / 30;
            let punchLen = p < 0.3 ? 15 + (p / 0.3) * 20 : 35 - ((p - 0.3) / 0.7) * 20;
            ctx.beginPath(); ctx.moveTo(0, -45 + bob); ctx.lineTo(punchLen, -45 + bob); ctx.stroke();
            ctx.fillStyle = '#ffccaa'; ctx.beginPath(); ctx.arc(punchLen, -45 + bob, 4, 0, Math.PI * 2); ctx.fill();
        }
        else if (this.state === 'uppercut') {
            ctx.beginPath(); ctx.moveTo(0, -45 + bob); ctx.lineTo(10, -80 + bob); ctx.stroke();
            ctx.strokeStyle = `rgba(0, 200, 255, ${this.stateTimer / 60})`; ctx.lineWidth = 20;
            ctx.beginPath(); ctx.moveTo(10, -40 + bob); ctx.lineTo(10, -120 + bob); ctx.stroke(); ctx.lineWidth = 4;
        }
        else if (this.state === 'whirlwind') {
            ctx.beginPath(); ctx.moveTo(0, -45 + bob); ctx.lineTo(20, -45 + bob); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -45 + bob); ctx.lineTo(-20, -45 + bob); ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath(); ctx.ellipse(0, -30 + bob, 45, 15, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(0, -30 + bob, 30, 10, 0, Math.PI, Math.PI * 3); ctx.stroke();
        }
        else if (this.state === 'run_attack') {
            ctx.beginPath(); ctx.moveTo(0, -45 + bob); ctx.lineTo(15, -45 + bob); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-30, -50 + bob); ctx.lineTo(-80, -50 + bob); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-30, -30 + bob); ctx.lineTo(-60, -30 + bob); ctx.stroke();
        }
        else if (this.state === 'heal') {
            ctx.beginPath(); ctx.moveTo(-5, -45 + bob); ctx.lineTo(-15, -70 + bob); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5, -45 + bob); ctx.lineTo(15, -70 + bob); ctx.stroke();
            ctx.fillStyle = `rgba(0, 255, 0, 0.3)`; ctx.beginPath(); ctx.arc(0, -40 + bob, 40, 0, Math.PI * 2); ctx.fill();
        }
        else {
            ctx.beginPath();
            ctx.moveTo(0, -45 + bob);
            const armX = 15 + Math.cos(armAngle) * 10;
            const armY = -35 + bob + Math.sin(armAngle) * 10;
            ctx.lineTo(armX, armY);
            ctx.stroke();
        }

        ctx.restore();
    }
}
