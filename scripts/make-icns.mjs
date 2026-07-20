import sharp from 'sharp';
import { mkdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';

const ICONSET = 'scripts/icon.iconset';
const SIZE = 1024;
const R_FRACTION = 0.845; // crops just at the outer edge of the rosemary wreath

// Cleanup and create iconset dir
try { rmSync(ICONSET, { recursive: true }); } catch {}
mkdirSync(ICONSET, { recursive: true });

// Generate base image: circular crop at wreath edge, transparent background
async function makeBase(px) {
  const r = Math.round(px * R_FRACTION / 2);
  const logo = await sharp('public/Fornello Logo.png')
    .resize(px, px, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  const mask = Buffer.from(
    `<svg width="${px}" height="${px}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${px/2}" cy="${px/2}" r="${r}" fill="white"/>
    </svg>`
  );

  return sharp(logo).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

// Required iconset sizes
const sizes = [16, 32, 64, 128, 256, 512, 1024];

for (const s of sizes) {
  const buf = await makeBase(s);
  await sharp(buf).toFile(`${ICONSET}/icon_${s}x${s}.png`);
  // Retina versions (except 1024)
  if (s <= 512) {
    const buf2x = await makeBase(s * 2);
    await sharp(buf2x).toFile(`${ICONSET}/icon_${s}x${s}@2x.png`);
  }
  console.log(`✓ ${s}px`);
}

// Build the .icns file using Apple's iconutil
execSync(`iconutil -c icns ${ICONSET} -o public/icon.icns`);
console.log('✓ icon.icns created');

// Cleanup iconset
rmSync(ICONSET, { recursive: true });
