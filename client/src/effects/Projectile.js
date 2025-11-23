import { HORIZON_Y } from '../constants.js';
import { createParticle } from './Particle.js';

export class Projectile {
    constructor(x, z, y, dir, owner) {
        this.x = x; this.z = z; this.y = y;
        this.vx = dir * 12; this.owner = owner;
        this.life = 40;
    }
    update(entities, particles) {
        this.x += this.vx; this.life--;
        entities.forEach(ent => {
            if (ent !== this.owner && ent.type !== this.owner.type && ent.state !== 'fallen' && ent.state !== 'rise') {
                if (Math.abs(this.x - ent.x) < 30 && Math.abs(this.z - ent.z) < 15 && Math.abs(this.y - ent.y) < 40) {
                    ent.takeDamage(20, this.vx > 0 ? 5 : -5);
                    createParticle(particles, this.x, this.z, this.y, 'hit');
                    this.life = 0;
                }
            }
        });
    }
    draw(ctx) {
        const sx = this.x; const sy = HORIZON_Y + this.z - this.y;
        const c = this.owner.type === 'player' ? '#0ff' : '#f0f';
        ctx.fillStyle = c; ctx.shadowBlur = 10; ctx.shadowColor = c;
        ctx.beginPath(); ctx.arc(sx, sy - 30, 10, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
}
