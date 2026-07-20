import sharp from 'sharp';

const SIZE = 512;
const R = 215; // tighter radius — crops right at the outer edge of the rosemary wreath

// Step 1: resize logo onto white square
const logo = await sharp('public/Fornello Logo.png')
  .resize(SIZE, SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .flatten({ background: { r: 255, g: 255, b: 255 } })
  .png()
  .toBuffer();

// Step 2: create a perfectly smooth circular mask using SVG
const mask = Buffer.from(`
  <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${R}" fill="white"/>
  </svg>
`);

// Step 3: apply mask — outside the circle becomes transparent, inside stays as-is
await sharp(logo)
  .composite([{ input: mask, blend: 'dest-in' }])
  .png()
  .toFile('public/icon.png');

console.log('Done.');
