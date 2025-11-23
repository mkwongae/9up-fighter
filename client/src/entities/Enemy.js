import { Entity } from './Entity.js';


export class Enemy extends Entity {
    constructor(x, z) {
        super(x, z, 'enemy');
    }

    updateAI(game) {
        if (this.ownerId === game.myUserId && !['fallen', 'hurt', 'rise', 'whirlwind'].includes(this.state)) {
            let target = null;
            let minDist = 9999;
            game.entities.forEach(p => {
                if (p.type === 'player') {
                    const d = Math.abs(p.x - this.x) + Math.abs(p.z - this.z);
                    if (d < minDist) { minDist = d; target = p; }
                }
            });

            if (target) {
                const dist = Math.abs(this.x - target.x);
                const zDist = Math.abs(this.z - target.z);
                this.facing = target.x > this.x ? 1 : -1;
                if (dist > 60 || zDist > 10) {
                    if (dist > 60) this.vx += this.facing * 0.5;
                    if (zDist > 10) this.z += (this.z > target.z ? -1 : 1);
                    this.state = 'walk';
                } else {
                    if (Math.random() < 0.05) {
                        // We need performMove here. 
                        // Instead of importing from Game, we can attach it to game instance or pass it.
                        // For now, let's assume game has performMove or we move performMove to a shared helper.
                        if (game.performMove) {
                            if (this.weapon) game.performMove(this, 'weapon_attack');
                            else game.performMove(this, 'punch');
                        }
                    } else this.state = 'idle';
                }
            }
        }
    }
}
