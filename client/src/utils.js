export function drawShadow(ctx, x, y, z, size) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath();
    const s = size * (0.8 + (z / 500));
    ctx.ellipse(x, y, s, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
}
