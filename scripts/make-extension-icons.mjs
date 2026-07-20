import sharp from 'sharp';

const SIZE = 512;
const R = 215;

const logo = await sharp('public/Fornello Logo.png')
  .resize(SIZE, SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .flatten({ background: { r: 255, g: 255, b: 255 } })
  .png()
  .toBuffer();

const mask = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}"><circle cx="${SIZE/2}" cy="${SIZE/2}" r="${R}" fill="white"/></svg>`
);

const base = await sharp(logo).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();

for (const size of [16, 48, 128]) {
  await sharp(base).resize(size, size).png().toFile(`extension/icons/icon-${size}.png`);
  console.log(`✓ icon-${size}.png`);
}
