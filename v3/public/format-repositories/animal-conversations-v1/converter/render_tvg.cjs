const fs = require('fs');
const path = require('path');
const sharp = require(path.join(process.argv[4], 'node_modules', 'sharp'));

const [specPath, outputPath] = process.argv.slice(2, 4);
if (!specPath || !outputPath || !process.argv[4]) {
  throw new Error('usage: node render_tvg.cjs <spec.json> <output.png> <module-root>');
}

(async () => {
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const allPaths = [...spec.boundaries, ...spec.fills.map((item) => item.d), ...spec.strokes.map((item) => item.d)];
const coords = allPaths.flatMap((d) => [...d.matchAll(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)].map((match) => Number(match[0])));
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (let index = 0; index + 1 < coords.length; index += 2) {
  const x = coords[index], y = coords[index + 1];
  if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
  minX = Math.min(minX, x); minY = Math.min(minY, y);
  maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
}
if (!Number.isFinite(minX)) throw new Error('drawing has no finite coordinates');

const scale = 2;
const margin = 50;
const width = Math.ceil((maxX - minX + margin * 2) * scale);
const height = Math.ceil((maxY - minY + margin * 2) * scale);
const tx = -minX + margin;
const ty = -minY + margin;
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const rgba = ([r, g, b, a]) => `rgba(${r},${g},${b},${a / 255})`;

const svg = (contents) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g transform="scale(${scale}) translate(${tx} ${ty})">${contents}</g></svg>`);
const boundarySvg = svg(spec.boundaries.map((d) => `<path d="${esc(d)}" fill="none" stroke="rgb(1,2,3)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`).join(''));
const debugSvg = svg([
  `<rect x="${minX - margin}" y="${minY - margin}" width="${maxX - minX + margin * 2}" height="${maxY - minY + margin * 2}" fill="white"/>`,
  ...spec.boundaries.map((d) => `<path d="${esc(d)}" fill="none" stroke="black" stroke-width="3"/>`),
  ...spec.seeds.map((seed) => `<circle cx="${seed.x}" cy="${seed.y}" r="12" fill="${rgba(seed.color)}" stroke="red" stroke-width="3"/>`),
].join(''));
await sharp(debugSvg).resize(Math.round(width / scale), Math.round(height / scale)).png().toFile(outputPath.replace(/\.png$/i, '-debug.png'));
const raw = await sharp(boundarySvg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const maskPixels = raw.data;
const channels = raw.info.channels;
const imageWidth = raw.info.width;
const imageHeight = raw.info.height;
const offset = (x, y) => (y * imageWidth + x) * channels;
const pixelCount = imageWidth * imageHeight;
const labels = new Int32Array(pixelCount);
labels.fill(-1);
for (let index = 0; index < pixelCount; index++) {
  if (maskPixels[index * channels + 3] !== 0) labels[index] = -2;
}
const queue = new Int32Array(pixelCount);
const regions = [];
for (let start = 0; start < pixelCount; start++) {
  if (labels[start] !== -1) continue;
  const label = regions.length;
  let read = 0;
  let write = 0;
  let touchesBorder = false;
  labels[start] = label;
  queue[write++] = start;
  while (read < write) {
    const current = queue[read++];
    const x = current % imageWidth;
    const y = Math.floor(current / imageWidth);
    if (x === 0 || y === 0 || x + 1 === imageWidth || y + 1 === imageHeight) touchesBorder = true;
    if (x > 0 && labels[current - 1] === -1) {
      labels[current - 1] = label;
      queue[write++] = current - 1;
    }
    if (x + 1 < imageWidth && labels[current + 1] === -1) {
      labels[current + 1] = label;
      queue[write++] = current + 1;
    }
    if (y > 0 && labels[current - imageWidth] === -1) {
      labels[current - imageWidth] = label;
      queue[write++] = current - imageWidth;
    }
    if (y + 1 < imageHeight && labels[current + imageWidth] === -1) {
      labels[current + imageWidth] = label;
      queue[write++] = current + imageWidth;
    }
  }
  regions.push({ size: write, touchesBorder });
}

function chooseRegion(startX, startY) {
  const x = Math.round((startX + tx) * scale);
  const y = Math.round((startY + ty) * scale);
  const candidates = new Map();
  for (let radius = 0; radius <= 48; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= imageWidth || ny < 0 || ny >= imageHeight) continue;
        const label = labels[ny * imageWidth + nx];
        if (label < 0 || candidates.has(label)) continue;
        candidates.set(label, Math.hypot(dx, dy));
      }
    }
    const enclosed = [...candidates].filter(([label]) => !regions[label].touchesBorder);
    if (enclosed.length) {
      enclosed.sort((left, right) => left[1] - right[1]);
      return { label: enclosed[0][0], distance: enclosed[0][1] };
    }
  }
  const all = [...candidates];
  if (!all.length) return null;
  all.sort((left, right) => left[1] - right[1]);
  return { label: all[0][0], distance: all[0][1] };
}

const regionPaint = new Map();
const paintResults = [];
for (const seed of spec.seeds) {
  const picked = chooseRegion(seed.x, seed.y);
  if (!picked) {
    paintResults.push({ ...seed, pixels: 0, region: null });
    continue;
  }
  const previous = regionPaint.get(picked.label);
  if (!previous || picked.distance < previous.distance) {
    regionPaint.set(picked.label, { color: seed.color, distance: picked.distance, seed });
  }
  paintResults.push({
    ...seed,
    pixels: regions[picked.label].size,
    region: picked.label,
    touchesBorder: regions[picked.label].touchesBorder,
    distance: picked.distance,
  });
}

const pixels = Buffer.alloc(maskPixels.length);
for (let index = 0; index < pixelCount; index++) {
  const paint = regionPaint.get(labels[index]);
  if (!paint) continue;
  const at = index * channels;
  pixels[at] = paint.color[0];
  pixels[at + 1] = paint.color[1];
  pixels[at + 2] = paint.color[2];
  pixels[at + 3] = paint.color[3];
}

// Grow neighboring paint under the invisible color-art boundaries. The visible line art is composited afterward.
for (let pass = 0; pass < 8; pass++) {
  const copy = Buffer.from(pixels);
  for (let y = 1; y + 1 < imageHeight; y++) {
    for (let x = 1; x + 1 < imageWidth; x++) {
      const at = offset(x, y);
      if (maskPixels[at] !== 1 || maskPixels[at + 1] !== 2 || maskPixels[at + 2] !== 3 || maskPixels[at + 3] === 0) continue;
      const neighbors = [offset(x - 1, y), offset(x + 1, y), offset(x, y - 1), offset(x, y + 1)];
      const source = neighbors.find((near) => copy[near + 3] === 255 && !(copy[near] === 1 && copy[near + 1] === 2 && copy[near + 2] === 3));
      if (!source) continue;
      pixels[at] = copy[source]; pixels[at + 1] = copy[source + 1]; pixels[at + 2] = copy[source + 2]; pixels[at + 3] = copy[source + 3];
    }
  }
}

const artSvg = svg([
  ...spec.fills.map((item) => `<path d="${esc(item.d)}" fill="${rgba(item.color)}" fill-rule="evenodd"/>`),
  ...spec.strokes.map((item) => `<path d="${esc(item.d)}" fill="none" stroke="${rgba(item.color)}" stroke-width="${item.width}" stroke-linecap="round" stroke-linejoin="round"/>`),
].join(''));

const base = await sharp(pixels, { raw: { width: imageWidth, height: imageHeight, channels } }).png().toBuffer();
const composited = await sharp(base).composite([{ input: artSvg }]).png().toBuffer();
await sharp(composited).resize(Math.round(imageWidth / scale), Math.round(imageHeight / scale)).png().toFile(outputPath);
console.log(JSON.stringify({ outputPath, width: Math.round(imageWidth / scale), height: Math.round(imageHeight / scale), paintResults }));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
