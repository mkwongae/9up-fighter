/**
 * SpriteSheet - Manages sprite sheet images and frame extraction
 */
export class SpriteSheet {
    constructor(imagePath) {
        this.image = new Image();
        this.image.src = imagePath;
        this.loaded = false;

        this.image.onload = () => {
            this.loaded = true;
            console.log(`Sprite sheet loaded: ${imagePath}`);
            console.log(`  Dimensions: ${this.image.width}x${this.image.height}`);
            this.applyChromaKey();
        };

        this.image.onerror = () => {
            console.error(`Failed to load sprite sheet: ${imagePath}`);
        };
    }

    applyChromaKey() {
        const canvas = document.createElement('canvas');
        canvas.width = this.image.width;
        canvas.height = this.image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.image, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Green screen color range (bright green)
        // Target: R=0, G=255, B=0
        // We'll use a threshold to catch compression artifacts
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // If pixel is predominantly green
            if (g > 100 && r < 100 && b < 100) {
                data[i + 3] = 0; // Set alpha to 0 (transparent)
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Replace the image source with the processed canvas
        const processedImage = new Image();
        processedImage.src = canvas.toDataURL();
        processedImage.onload = () => {
            this.image = processedImage;
        };
    }

    /**
     * Draw a specific frame from the sprite sheet
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} frameX - Frame column index
     * @param {number} frameY - Frame row index
     * @param {number} frameWidth - Width of each frame
     * @param {number} frameHeight - Height of each frame
     * @param {number} dx - Destination x on canvas
     * @param {number} dy - Destination y on canvas
     * @param {number} dWidth - Destination width (for scaling)
     * @param {number} dHeight - Destination height (for scaling)
     */
    drawFrame(ctx, frameX, frameY, frameWidth, frameHeight, dx, dy, dWidth, dHeight) {
        if (!this.loaded) return;

        const sx = frameX * frameWidth;
        const sy = frameY * frameHeight;

        ctx.drawImage(
            this.image,
            sx, sy, frameWidth, frameHeight,
            dx, dy, dWidth || frameWidth, dHeight || frameHeight
        );
    }
}

/**
 * Animation - Manages animation playback for a specific animation state
 */
export class Animation {
    constructor(config) {
        this.row = config.row;              // Which row in the sprite sheet
        this.frameCount = config.frameCount; // Number of frames in this animation
        this.frameRate = config.frameRate || 10; // Frames per second
        this.loop = config.loop !== false;   // Whether to loop (default true)

        this.currentFrame = 0;
        this.frameTimer = 0;
    }

    update() {
        this.frameTimer++;

        // Advance frame based on frame rate
        if (this.frameTimer >= 60 / this.frameRate) {
            this.frameTimer = 0;
            this.currentFrame++;

            if (this.currentFrame >= this.frameCount) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = this.frameCount - 1; // Stay on last frame
                }
            }
        }
    }

    reset() {
        this.currentFrame = 0;
        this.frameTimer = 0;
    }

    isFinished() {
        return !this.loop && this.currentFrame >= this.frameCount - 1;
    }
}

/**
 * AnimationController - Manages all animations for an entity
 */
export class AnimationController {
    constructor(spriteSheet, animationConfig) {
        this.spriteSheet = spriteSheet;
        this.animations = {};
        this.currentAnimation = null;
        this.currentAnimationName = 'idle';

        // Create Animation instances from config
        for (const [name, config] of Object.entries(animationConfig)) {
            this.animations[name] = new Animation(config);
        }

        this.currentAnimation = this.animations[this.currentAnimationName];
    }

    /**
     * Switch to a different animation
     */
    play(animationName, forceRestart = false) {
        if (!this.animations[animationName]) {
            console.warn(`Animation "${animationName}" not found`);
            return;
        }

        if (this.currentAnimationName !== animationName || forceRestart) {
            this.currentAnimationName = animationName;
            this.currentAnimation = this.animations[animationName];
            this.currentAnimation.reset();
        }
    }

    update() {
        if (this.currentAnimation) {
            this.currentAnimation.update();
        }
    }

    /**
     * Draw the current animation frame
     */
    draw(ctx, x, y, width, height, frameWidth, frameHeight, flipX = false) {
        if (!this.currentAnimation || !this.spriteSheet.loaded) return;

        ctx.save();

        // Calculate draw position (center horizontally, anchor at feet)
        const drawX = x - width / 2;
        const drawY = y - height;

        if (flipX) {
            ctx.translate(x, y);
            ctx.scale(-1, 1);
            ctx.translate(-x, -y);
        }

        this.spriteSheet.drawFrame(
            ctx,
            this.currentAnimation.currentFrame,
            this.currentAnimation.row,
            frameWidth,
            frameHeight,
            drawX,
            drawY,
            width,
            height
        );

        ctx.restore();
    }
}
