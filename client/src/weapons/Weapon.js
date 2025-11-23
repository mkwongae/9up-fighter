import { GRAVITY, HORIZON_Y } from '../constants.js';
import { drawShadow } from '../utils.js';

export function drawWeaponShape(ctx, type) {
    if (type === 'bat') {
        ctx.fillStyle = '#d35400'; ctx.fillRect(-2, -35, 4, 50);
    } else if (type === 'sword') {
        ctx.fillStyle = '#bdc3c7'; ctx.fillRect(-2, -40, 4, 50);
        ctx.fillStyle = '#2c3e50'; ctx.fillRect(-6, 5, 12, 4); ctx.fillRect(-2, 5, 4, 10);
    } else if (type === 'spear') {
        ctx.fillStyle = '#8e44ad'; ctx.fillRect(-1, -70, 2, 100);
        ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.moveTo(0, -80); ctx.lineTo(-3, -70); ctx.lineTo(3, -70); ctx.fill();
    }
}

export class Weapon {
    constructor(x, z, type, startY = 800) {
        this.x = x; this.z = z; this.y = startY;
        this.type = type;
        this.vx = 0; this.vz = 0; this.vy = startY > 0 ? -15 : 5;
        this.state = startY > 0 ? 'falling' : 'ground';
        this.markedForDeletion = false;
    }
    update(frameCount) {
        if (this.state === 'falling' || this.y > 0) {
            this.vy -= GRAVITY; this.y += this.vy; this.x += this.vx; this.z += this.vz;
            if (this.y <= 0) {
                this.y = 0;
                if (Math.abs(this.vy) > 2) { this.vy = -this.vy * 0.5; this.vx *= 0.5; }
                else { this.vy = 0; this.vx = 0; this.state = 'ground'; }
            }
        } else if (this.state === 'ground') {
            this.y = Math.abs(Math.sin(frameCount * 0.1)) * 3;
        }
    }
    draw(ctx, frameCount) {
        const sx = this.x; const sy = HORIZON_Y + this.z - this.y;
        drawShadow(ctx, this.x, HORIZON_Y + this.z, 0, 15);
        ctx.save(); ctx.translate(sx, sy);
        if (this.y > 10) ctx.rotate(frameCount * 0.2);
        else ctx.rotate(Math.sin(frameCount * 0.05) * 0.1);
        drawWeaponShape(ctx, this.type);
        ctx.restore();
    }
}

export function dropWeapon(game, entity) {
    if (!entity.weapon) return;
    const w = new Weapon(entity.x, entity.z, entity.weapon, 40);
    w.vx = entity.facing * 5; w.vy = 8; w.state = 'falling';
    game.weapons.push(w);
    entity.weapon = null;
}
