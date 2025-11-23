import { Entity } from './Entity.js';

export class Player extends Entity {
    constructor(x, z) {
        super(x, z, 'player');
    }
    // Add specific player logic here if needed, currently handled in Entity or Game controller
}
