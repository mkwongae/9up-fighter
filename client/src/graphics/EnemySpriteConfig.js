/**
 * Enemy sprite sheet animation configuration
 * Layout: 10 rows matching the generated sprite sheet
 * Frame Size: 128x128
 */

export const ENEMY_SPRITE_CONFIG = {
    frameWidth: 128,
    frameHeight: 128,

    animations: {
        idle: {
            row: 0,
            frameCount: 4,
            frameRate: 8,
            loop: true
        },
        walk: {
            row: 1,
            frameCount: 6,
            frameRate: 12,
            loop: true
        },
        run: {
            row: 2,
            frameCount: 6,
            frameRate: 16,
            loop: true
        },
        attack: {
            row: 3,
            frameCount: 5,
            frameRate: 15,
            loop: false
        },
        weapon_attack: {
            row: 3,
            frameCount: 5,
            frameRate: 15,
            loop: false
        },
        jump: {
            row: 4,
            frameCount: 5,
            frameRate: 12,
            loop: false
        },
        jump_kick: {
            row: 5,
            frameCount: 6,
            frameRate: 12,
            loop: false
        },
        uppercut: {
            row: 6,
            frameCount: 6,
            frameRate: 12,
            loop: false
        },
        whirlwind: {
            row: 7,
            frameCount: 8,
            frameRate: 20,
            loop: true
        },
        hurt: {
            row: 8,
            frameCount: 3,
            frameRate: 10,
            loop: false
        },
        fallen: {
            row: 9,
            frameCount: 2,
            frameRate: 8,
            loop: false
        },
        rise: {
            row: 9,
            frameCount: 2,
            frameRate: 8,
            loop: false
        },
        defend: {
            row: 0,
            frameCount: 4,
            frameRate: 8,
            loop: true
        },
        heal: {
            row: 0,
            frameCount: 4,
            frameRate: 8,
            loop: true
        },
        run_attack: {
            row: 3,
            frameCount: 5,
            frameRate: 18,
            loop: false
        }
    }
};
