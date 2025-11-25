# Sprite Processing Utility

This folder contains the sprite sheet processing tool used to convert AI-generated sprite images into game-ready sprite sheets.

## Tool: `process_sprites.js`

A Node.js script that automatically detects, extracts, aligns, and stitches sprite frames from AI-generated images.

### Features

- **Green Screen Removal**: Automatically removes bright green (#00FF00) backgrounds
- **Smart Sprite Detection**: Uses flood-fill algorithm to find individual sprites
- **Row Detection**: Groups sprites into animation rows using Y-projection method
- **Bottom-Center Alignment**: Aligns all sprites consistently at their feet
- **Batch Processing**: Can process multiple images from a folder
- **Artifact Filtering**: Ignores small noise (< 20x20 pixels)

### Installation

```bash
# Install dependencies (only needs to be done once)
npm install jimp
```

### Usage

#### Single Image Processing

Process one AI-generated sprite sheet:

```bash
node util/process_sprites.js <input_image.png> <output_sheet.png> [frame_size]
```

**Example:**
```bash
node util/process_sprites.js big_sheet.png client/resource/sprite-sheet/player_sprite_sheet.png 128
```

#### Batch Processing (Recommended)

Process multiple images from a folder:

```bash
node util/process_sprites.js <input_folder/> <output_sheet.png> [frame_size]
```

**Example:**
```bash
# 1. Create input folder
mkdir sprites_input

# 2. Save AI-generated images there (name them in order):
#    - 01_idle.png
#    - 02_walk.png
#    - 03_attack.png
#    etc.

# 3. Process all images
node util/process_sprites.js sprites_input/ client/resource/sprite-sheet/player_sprite_sheet.png 128
```

### Parameters

- `input_path`: Path to a single PNG file or a folder containing PNG files
- `output_image`: Path where the final sprite sheet will be saved
- `frame_size`: (Optional) Size of each frame in pixels. Default: 128

### Workflow: AI to Game

#### Step 1: Generate Sprites with AI

Use Google Gemini, DALL-E, or any AI image generator with this prompt:

```
A pixel art sprite sheet of a martial artist in a blue gi with red headband.
The image must be organized into distinct horizontal rows with clear vertical gaps.
Row 1: Idle animation (4 frames) - standing breathing cycle
Row 2: Walk animation (6 frames) - walking cycle
Row 3: Run animation (6 frames) - running cycle
Row 4: Punch attack (5 frames) - forward punch motion
Row 5: Jump animation (5 frames) - jumping arc
Row 6: Jump kick (6 frames) - flying kick pose
Row 7: Uppercut (6 frames) - rising uppercut
Row 8: Whirlwind attack (8 frames) - spinning rotation
Row 9: Hurt/damage (3 frames) - recoiling from hit
Row 10: Fallen/knockout (2 frames) - lying on ground
Solid bright green background #00FF00.
16-bit retro style. Ensure characters are separated and not overlapping.
```

**Tips for better results:**
- Generate 2-3 rows at a time for better quality
- Use bright green (#00FF00) background for easy removal
- Keep characters separated with clear gaps
- Ensure consistent character size across frames

#### Step 2: Process the Sprites

```bash
# For single image
node util/process_sprites.js ai_generated.png client/resource/sprite-sheet/player_sprite_sheet.png 128

# For multiple images (recommended)
node util/process_sprites.js sprites_input/ client/resource/sprite-sheet/player_sprite_sheet.png 128
```

#### Step 3: Copy to Enemy Sheet (if needed)

```bash
cp client/resource/sprite-sheet/player_sprite_sheet.png client/resource/sprite-sheet/enemy_sprite_sheet.png
```

#### Step 4: Update Configuration

Edit `client/src/graphics/PlayerSpriteConfig.js` to match your sprite sheet layout:

```javascript
export const PLAYER_SPRITE_CONFIG = {
    frameWidth: 128,
    frameHeight: 128,
    
    animations: {
        idle: {
            row: 0,      // Which row in the sheet
            frameCount: 4, // How many frames
            frameRate: 12, // Animation speed
            loop: true
        },
        // ... more animations
    }
};
```

#### Step 5: Test in Game

1. Refresh browser: `http://localhost:8081/9up.html`
2. Use debug tool: `http://localhost:8081/debug_sprites.html` to verify rows

### Troubleshooting

**Problem: Too many rows detected**
- Solution: Generate fewer rows per image, or increase `MERGE_THRESHOLD` in the script

**Problem: Sprites not aligned properly**
- Solution: Ensure AI generated sprites with consistent size and positioning

**Problem: Small artifacts appearing**
- Solution: Increase the noise filter threshold (currently 20x20) in the script

**Problem: Green background still visible**
- Solution: Check that background is exactly #00FF00 bright green

### Output

The script will output:
- Number of images processed
- Rows detected per image
- Total animation rows
- Final sprite sheet dimensions

Example output:
```
Found 2 images in directory.
Processing sprites_input/01_idle.png...
  01_idle.png: Detected 5 rows.
Processing sprites_input/02_walk.png...
  02_walk.png: Detected 5 rows.
Total animation rows: 10
Saved sprite sheet to client/resource/sprite-sheet/player_sprite_sheet.png
```

### Technical Details

**Row Detection Algorithm:**
1. Scans image vertically to create Y-projection
2. Finds continuous "bands" of sprite activity
3. Merges bands within 30px threshold
4. Assigns sprites to bands based on overlap

**Sprite Alignment:**
- Horizontal: Centered in 128x128 frame
- Vertical: Bottom-aligned with 2px padding
- Oversized sprites are scaled down proportionally

**Grid Layout:**
- Maximum 8 frames per row
- Rows stacked vertically
- Each frame is 128x128 pixels
