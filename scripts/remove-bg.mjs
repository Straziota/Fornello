import sharp from 'sharp';

const input  = './public/Fornello Logo.png';
const output = './public/Fornello Logo.png';

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const channels = 4;

function idx(x, y) { return (y * width + x) * channels; }
function isWhitish(x, y) {
  const i = idx(x, y);
  return data[i] > 230 && data[i+1] > 230 && data[i+2] > 230;
}

// BFS flood-fill from all 4 edges — only removes background, not white inside the logo
const visited = new Uint8Array(width * height);
const queue = [];

for (let x = 0; x < width; x++)  { queue.push([x, 0]); queue.push([x, height-1]); }
for (let y = 0; y < height; y++) { queue.push([0, y]); queue.push([width-1, y]); }

while (queue.length) {
  const [x, y] = queue.pop();
  if (x < 0 || x >= width || y < 0 || y >= height) continue;
  const vi = y * width + x;
  if (visited[vi]) continue;
  visited[vi] = 1;
  if (!isWhitish(x, y)) continue;
  data[idx(x, y) + 3] = 0; // make transparent
  queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
}

await sharp(Buffer.from(data), {
  raw: { width, height, channels }
}).png().toFile(output);

console.log('Done — background removed via flood fill.');
