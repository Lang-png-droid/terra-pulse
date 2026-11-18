const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Read the SVG
const svgBuffer = fs.readFileSync(path.join(__dirname, '../public/favicon.svg'));

async function generateIcons() {
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Generate favicon.png (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, '../public/favicon.png'));

  // Copy as ico (use png for now, browsers accept it)
  fs.copyFileSync(
    path.join(__dirname, '../public/favicon.png'),
    path.join(__dirname, '../public/favicon.ico')
  );

  console.log('All icons generated!');
}

generateIcons().catch(console.error);