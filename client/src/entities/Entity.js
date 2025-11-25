import { GRAVITY, DRAG, HORIZON_Y } from '../constants.js';
import { drawShadow } from '../utils.js';
import { createParticle } from '../effects/Particle.js';
import { Item } from '../items/Item.js';
import { drawWeaponShape, dropWeapon } from '../weapons/Weapon.js';
import { SpriteSheet, AnimationController } from '../graphics/SpriteSheet.js';
import { PLAYER_SPRITE_CONFIG } from '../graphics/PlayerSpriteConfig.js';
import { ENEMY_SPRITE_CONFIG } from '../graphics/EnemySpriteConfig.js';

// Load sprite sheets (shared across all entities)
const playerSpriteSheet = new SpriteSheet('./resource/sprite-sheet/player_sprite_sheet.png');
const enemySpriteSheet = new SpriteSheet('./resource/sprite-sheet/enemy_sprite_sheet.png');

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

        // Initialize animation controller based on type
        if (type === 'player') {
            this.animationController = new AnimationController(
                playerSpriteSheet,
                PLAYER_SPRITE_CONFIG.animations
            );
            this.spriteConfig = PLAYER_SPRITE_CONFIG;
        } else {
            this.animationController = new AnimationController(
                enemySpriteSheet,
                ENEMY_SPRITE_CONFIG.animations
            );
            this.spriteConfig = ENEMY_SPRITE_CONFIG;
        }
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

        // Update animation
        this.animationController.play(this.state);
        this.animationController.update();

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
        const screenX = this.x;
        const screenY = HORIZON_Y + this.z - this.y;

        // Draw shadow
        drawShadow(ctx, this.x, HORIZON_Y + this.z, 0, 20);

        // Calculate sprite size (80% of original 128px frames)
        const spriteWidth = this.spriteConfig.frameWidth * 0.8;  // 80% scale
        const spriteHeight = this.spriteConfig.frameHeight * 0.8;

        // Draw sprite
        this.animationController.draw(
            ctx,
            screenX,
            screenY,
            spriteWidth,
            spriteHeight,
            this.spriteConfig.frameWidth,
            this.spriteConfig.frameHeight,
            this.facing === -1  // Flip sprite when facing left
        );

        // Draw weapon if equipped (overlay on top of sprite)
        if (this.weapon) {
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.scale(this.facing, 1);

            let wx = 20, wy = -40;
            let wAngle = -0.5;

            if (this.state === 'weapon_attack') {
                const p = (30 - this.stateTimer) / 30;
                wAngle = -2.5 + (p * 4);
                wx = 30;
            } else if (this.state === 'walk' || this.state === 'run') {
                wAngle = -0.5 + Math.sin(frameCount * 0.2) * 0.2;
            }

            ctx.translate(wx, wy);
            ctx.rotate(wAngle);
            drawWeaponShape(ctx, this.weapon);
            ctx.restore();
        }

        // Draw special effects overlays
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.scale(this.facing, 1);

        // Uppercut energy effect
        if (this.state === 'uppercut') {
            ctx.strokeStyle = `rgba(0, 200, 255, ${this.stateTimer / 60})`;
            ctx.lineWidth = 20;
            ctx.beginPath();
            ctx.moveTo(10, -40);
            ctx.lineTo(10, -120);
            ctx.stroke();
        }

        // Whirlwind effect
        if (this.state === 'whirlwind') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, -30, 45, 15, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(0, -30, 30, 10, 0, Math.PI, Math.PI * 3);
            ctx.stroke();
        }

        // Run attack speed lines
        if (this.state === 'run_attack') {
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-30, -50);
            ctx.lineTo(-80, -50);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-30, -30);
            ctx.lineTo(-60, -30);
            ctx.stroke();
        }

        // Heal aura
        if (this.state === 'heal') {
            ctx.fillStyle = `rgba(0, 255, 0, 0.3)`;
            ctx.beginPath();
            ctx.arc(0, -40, 40, 0, Math.PI * 2);
            ctx.fill();
        }

        // Invulnerability flash
        if (this.invulnerable > 0 && frameCount % 4 === 0) {
            ctx.globalAlpha = 0.5;
        }

        ctx.restore();

        // Draw HP bar above entity
        if (this.type === 'enemy' || this.isRemote) {
            const barWidth = 40;
            const barHeight = 4;
            const barX = screenX - barWidth / 2;
            const barY = screenY - spriteHeight - 10;

            ctx.fillStyle = '#000';
            ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

            ctx.fillStyle = '#f00';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = '#0f0';
            const hpPercent = this.hp / 100;
            ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
        }
    }
}
