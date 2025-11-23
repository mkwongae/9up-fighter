import { HORIZON_Y } from '../constants.js';

export class Particle {
    constructor(x, z, y, type, text) {
        this.x = x; this.z = z; this.y = y; this.life = 20;
        this.type = type; // hit, block, text
        this.text = text;
        this.vx = (Math.random() - 0.5) * 5; this.vy = (Math.random() - 0.5) * 5;

        if (type === 'hit') this.color = 'rgba(255, 255, 0,';
        else if (type === 'block') this.color = 'rgba(100, 200, 255,';
        else if (type === 'text') { this.vy = 2; this.life = 40; }
    }
    update() {
        if (this.type === 'text') this.y += 1; // Float up
        else { this.x += this.vx; this.y += this.vy; }
        this.life--;
    }
    draw(ctx) {
        const sx = this.x; const sy = HORIZON_Y + this.z - this.y;
        if (this.type === 'text') {
            ctx.fillStyle = this.text.includes('HP') ? '#e74c3c' : (this.text.includes('MP') ? '#3498db' : '#fff');
            ctx.font = '12px monospace';
            ctx.fillText(this.text, sx - 15, sy - 20);
        } else {
            ctx.fillStyle = this.color + this.life / 20 + ')';
            ctx.beginPath(); ctx.rect(sx, sy - 40, this.life, this.life); ctx.fill();
        }
    }
}

export function createParticle(particles, x, z, y, type, text) {
    if (type === 'text') {
        particles.push(new Particle(x, z, y, type, text));
    } else {
        for (let i = 0; i < 5; i++) particles.push(new Particle(x, z, y, type));
    }
}
