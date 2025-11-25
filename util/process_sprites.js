const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

async function processImage(filePath) {
    console.log(`Processing ${filePath}...`);
    const image = await Jimp.read(filePath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    // 1. Remove Green Background & Create Mask
    const pixels = new Uint8Array(width * height); // 0 = bg, 1 = sprite

    image.scan(0, 0, width, height, (x, y, idx) => {
        const r = image.bitmap.data[idx + 0];
        const g = image.bitmap.data[idx + 1];
        const b = image.bitmap.data[idx + 2];

        // Green detection (adjust thresholds if needed)
        if (g > 100 && g > r + 20 && g > b + 20) {
            image.bitmap.data[idx + 3] = 0; // Transparent
            pixels[y * width + x] = 0;
        } else {
            // Also check if it was already transparent
            if (image.bitmap.data[idx + 3] < 10) {
                pixels[y * width + x] = 0;
            } else {
                pixels[y * width + x] = 1;
            }
        }
    });

    // 2. Blob Detection (Flood Fill)
    const visited = new Uint8Array(width * height);
    const sprites = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (pixels[idx] === 1 && visited[idx] === 0) {
                // Flood fill
                let minX = x, maxX = x;
                let minY = y, maxY = y;
                const stack = [[x, y]];
                visited[idx] = 1;

                while (stack.length > 0) {
                    const [cx, cy] = stack.pop();
                    minX = Math.min(minX, cx);
                    maxX = Math.max(maxX, cx);
                    minY = Math.min(minY, cy);
                    maxY = Math.max(maxY, cy);

                    const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nIdx = ny * width + nx;
                            if (pixels[nIdx] === 1 && visited[nIdx] === 0) {
                                visited[nIdx] = 1;
                                stack.push([nx, ny]);
                            }
                        }
                    }
                }

                const w = maxX - minX + 1;
                const h = maxY - minY + 1;
                // Filter noise: Increased threshold to 20x20 to avoid small artifacts
                if (w > 20 && h > 20) {
                    sprites.push({ x: minX, y: minY, w, h, image });
                }
            }
        }
    }

    // 3. Group by Rows (Y-Projection Method)
    // This is more robust for jumping animations. We look for vertical "bands" of activity.
    const rowBands = [];
    const projection = new Uint8Array(height);

    // Fill projection: 1 if any sprite occupies this Y line
    for (const s of sprites) {
        for (let y = s.y; y < s.y + s.h; y++) {
            if (y < height) projection[y] = 1;
        }
    }

    // Find continuous bands
    let inBand = false;
    let bandStart = 0;
    for (let y = 0; y < height; y++) {
        if (projection[y] === 1 && !inBand) {
            inBand = true;
            bandStart = y;
        } else if (projection[y] === 0 && inBand) {
            // End of band
            rowBands.push({ start: bandStart, end: y });
            inBand = false;
        }
    }
    if (inBand) rowBands.push({ start: bandStart, end: height });

    // Merge close bands (e.g. a jumping sprite might be slightly detached above)
    const MERGE_THRESHOLD = 30;
    const mergedBands = [];
    if (rowBands.length > 0) {
        let currentBand = rowBands[0];
        for (let i = 1; i < rowBands.length; i++) {
            const nextBand = rowBands[i];
            if (nextBand.start - currentBand.end < MERGE_THRESHOLD) {
                // Merge
                currentBand.end = nextBand.end;
            } else {
                mergedBands.push(currentBand);
                currentBand = nextBand;
            }
        }
        mergedBands.push(currentBand);
    }

    // Assign sprites to bands
    const rows = mergedBands.map(() => []);

    for (const s of sprites) {
        const centerY = s.y + s.h / 2;
        // Find which band this sprite belongs to
        let bestBandIndex = -1;
        let minDist = Infinity;

        for (let i = 0; i < mergedBands.length; i++) {
            const band = mergedBands[i];
            const bandCenter = (band.start + band.end) / 2;

            // Check for overlap
            if (s.y < band.end && (s.y + s.h) > band.start) {
                bestBandIndex = i;
                break;
            }

            // Fallback: Distance to band center
            const dist = Math.abs(centerY - bandCenter);
            if (dist < minDist) {
                minDist = dist;
                bestBandIndex = i;
            }
        }

        if (bestBandIndex !== -1) {
            rows[bestBandIndex].push(s);
        }
    }

    // Filter out empty rows
    return rows.filter(r => r.length > 0);
}

async function processSprites(inputPath, outputPath, frameSize = 128) {
    let allRows = [];

    // Determine if input is file or directory
    let files = [];
    if (fs.existsSync(inputPath) && fs.lstatSync(inputPath).isDirectory()) {
        files = fs.readdirSync(inputPath)
            .filter(file => file.toLowerCase().endsWith('.png'))
            .sort() // Sort alphabetically to maintain order (e.g. 01_idle, 02_walk)
            .map(file => path.join(inputPath, file));
        console.log(`Found ${files.length} images in directory.`);
    } else {
        files = [inputPath];
    }

    for (const file of files) {
        const rows = await processImage(file);
        console.log(`  ${path.basename(file)}: Detected ${rows.length} rows.`);
        allRows = allRows.concat(rows);
    }

    console.log(`Total animation rows: ${allRows.length}`);

    // 4. Stitch into Grid
    const MAX_COLS = 8;
    const sheetWidth = MAX_COLS * frameSize;
    const sheetHeight = allRows.length * frameSize;

    const sheet = new Jimp({ width: sheetWidth, height: sheetHeight, color: 0x00000000 });

    for (let r = 0; r < allRows.length; r++) {
        const rowSprites = allRows[r];

        // Sort sprites in this row by X coordinate
        rowSprites.sort((a, b) => a.x - b.x);

        for (let c = 0; c < rowSprites.length; c++) {
            if (c >= MAX_COLS) break;

            const s = rowSprites[c];

            // Extract sprite from its source image
            const spriteImg = s.image.clone().crop({ x: s.x, y: s.y, w: s.w, h: s.h });

            // Resize if too big
            if (s.w > frameSize || s.h > frameSize) {
                spriteImg.scaleToFit({ w: frameSize, h: frameSize });
            }

            // Align Bottom-Center
            const targetX = (c * frameSize) + Math.floor((frameSize - spriteImg.bitmap.width) / 2);
            const targetY = (r * frameSize) + (frameSize - spriteImg.bitmap.height - 2);

            sheet.composite(spriteImg, targetX, targetY);
        }
    }

    await sheet.write(outputPath);
    console.log(`Saved sprite sheet to ${outputPath}`);
}

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log("Usage: node process_sprites.js <input_path> <output_image> [frame_size]");
    process.exit(1);
}

processSprites(args[0], args[1], parseInt(args[2] || 128));
