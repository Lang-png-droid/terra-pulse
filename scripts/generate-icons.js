const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function drawIcon(ctx, size) {
  const center = size / 2;
  const radius = size * 0.48;

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, '#09090B');
  bgGrad.addColorStop(1, '#18181B');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Outer ring
  const ringGrad = ctx.createLinearGradient(0, 0, size, 0);
  ringGrad.addColorStop(0, '#EF4444');
  ringGrad.addColorStop(0.5, '#F97316');
  ringGrad.addColorStop(1, '#22D3EE');

  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#09090B';
  ctx.fill();
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = size * 0.02;
  ctx.stroke();

  // Pulse shape (stylized seismic wave)
  ctx.beginPath();
  const waveRadius = size * 0.22;
  ctx.moveTo(center, center - waveRadius);
  ctx.quadraticCurveTo(center, center - waveRadius * 0.5, center - waveRadius * 0.7, center - waveRadius * 0.5);
  ctx.quadraticCurveTo(center - waveRadius * 0.7, center, center, center);
  ctx.quadraticCurveTo(center + waveRadius * 0.7, center, center + waveRadius * 0.7, center - waveRadius * 0.5);
  ctx.quadraticCurveTo(center + waveRadius * 0.7, center - waveRadius, center, center - waveRadius);
  ctx.fillStyle = ringGrad;
  ctx.fill();

  // Center dot
  ctx.beginPath();
  ctx.arc(center, center, size * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = '#09090B';
  ctx.fill();

  // Inner pulse dot
  ctx.beginPath();
  ctx.arc(center, center, size * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.fill();
}

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  drawIcon(ctx, size);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), buffer);
  console.log(`Generated icon-${size}x${size}.png`);
}

// Also generate favicon.ico (16x16, 32x32)
const faviconCanvas = createCanvas(32, 32);
const faviconCtx = faviconCanvas.getContext('2d');
drawIcon(faviconCtx, 32);
const faviconBuffer = faviconCanvas.toBuffer('image/png');
fs.writeFileSync(path.join(__dirname, '../public/favicon.png'), faviconBuffer);

// Copy as ico (simplified - just use png)
fs.copyFileSync(path.join(__dirname, '../public/favicon.png'), path.join(__dirname, '../public/favicon.ico'));

console.log('All icons generated!');