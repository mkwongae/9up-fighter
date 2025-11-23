import { GRAVITY, HORIZON_Y } from '../constants.js';
import { drawShadow } from '../utils.js';
import { createParticle } from '../effects/Particle.js';

export class Item {
    constructor(x, z, type) {
        this.x = x; this.z = z; this.y = 60; this.type = type; this.vy = 3;
        this.markedForDeletion = false; this.life = 600;
    }
    update(player, particles, frameCount) {
        if (this.y > 0) { this.vy -= GRAVITY; this.y += this.vy; } else { this.y = 0; this.vy = 0; }
        this.life--; if (this.life <= 0) this.markedForDeletion = true;
        if (!player) return;
        if (Math.abs(player.x - this.x) < 30 && Math.abs(player.z - this.z) < 20 && Math.abs(player.y - this.y) < 40 && player.hp > 0) {
            if (this.type === 'hp') { player.hp = Math.min(player.hp + 30, 100); createParticle(particles, this.x, this.z, this.y + 40, 'text', '+HP'); }
            else if (this.type === 'mp') { player.mp = Math.min(player.mp + 30, 100); createParticle(particles, this.x, this.z, this.y + 40, 'text', '+MP'); }
            this.markedForDeletion = true;
        }
    }
    draw(ctx, frameCount) {
        const screenX = this.x; const screenY = HORIZON_Y + this.z - this.y;
        drawShadow(ctx, this.x, HORIZON_Y + this.z, 0, 10);
        const bob = Math.sin(frameCount * 0.1) * 3;
        ctx.save(); ctx.translate(screenX, screenY + bob - 10);
        ctx.fillStyle = this.type === 'hp' ? '#e74c3c' : '#3498db';
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.rect(-6, -6, 12, 14); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.rect(-3, -12, 6, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.rect(-3, -4, 4, 8); ctx.fill();
        ctx.restore();
    }
}
