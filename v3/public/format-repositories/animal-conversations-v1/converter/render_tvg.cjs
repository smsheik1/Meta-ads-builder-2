const fs = require('fs');
const path = require('path');
const sharp = require(path.join(process.argv[4], 'node_modules', 'sharp'));

const [specPath, outputPath] = process.argv.slice(2, 4);
if (!specPath || !outputPath || !process.argv[4]) {
  throw new Error('usage: node render_tvg.cjs <spec.json> <output.png> <module-root> [--debug]');
}
const writeDebug = process.argv.slice(5).includes('--debug');

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
if (spec.bounds) {
  const bounds = spec.bounds;
  if (![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(Number.isFinite)) {
    throw new Error('drawing bounds must contain finite minX/minY/maxX/maxY values');
  }
  minX = bounds.minX;
  minY = bounds.minY;
  maxX = bounds.maxX;
  maxY = bounds.maxY;
}

const scale = 2;
const margin = 50;
const boundaryStrokeWidth = 1;
const width = Math.ceil((maxX - minX + margin * 2) * scale);
const height = Math.ceil((maxY - minY + margin * 2) * scale);
const tx = -minX + margin;
const ty = -minY + margin;
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const rgba = ([r, g, b, a]) => `rgba(${r},${g},${b},${a / 255})`;

const svg = (contents) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g transform="scale(${scale}) translate(${tx} ${ty})">${contents}</g></svg>`);
const boundarySvg = svg(spec.boundaries.map((d) => `<path d="${esc(d)}" fill="none" stroke="rgb(1,2,3)" stroke-width="${boundaryStrokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`).join(''));
const debugSvg = svg([
  `<rect x="${minX - margin}" y="${minY - margin}" width="${maxX - minX + margin * 2}" height="${maxY - minY + margin * 2}" fill="white"/>`,
  ...spec.boundaries.map((d) => `<path d="${esc(d)}" fill="none" stroke="black" stroke-width="3"/>`),
  ...spec.seeds.map((seed) => `<circle cx="${seed.x}" cy="${seed.y}" r="12" fill="${rgba(seed.color)}" stroke="red" stroke-width="3"/>`),
].join(''));
if (writeDebug) {
  await sharp(debugSvg).resize(Math.round(width / scale), Math.round(height / scale)).png().toFile(outputPath.replace(/\.png$/i, '-debug.png'));
}
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

function pathSamples(d) {
  const tokens = d.match(/[MLC]|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) || [];
  const samples = [];
  let index = 0;
  let current = null;
  const point = () => ({ x: Number(tokens[index++]), y: Number(tokens[index++]) });
  const cubicPoint = (p0, p1, p2, p3, t) => {
    const inverse = 1 - t;
    return {
      x: inverse ** 3 * p0.x + 3 * inverse ** 2 * t * p1.x + 3 * inverse * t ** 2 * p2.x + t ** 3 * p3.x,
      y: inverse ** 3 * p0.y + 3 * inverse ** 2 * t * p1.y + 3 * inverse * t ** 2 * p2.y + t ** 3 * p3.y,
    };
  };
  const cubicTangent = (p0, p1, p2, p3, t) => {
    const inverse = 1 - t;
    return {
      x: 3 * inverse ** 2 * (p1.x - p0.x) + 6 * inverse * t * (p2.x - p1.x) + 3 * t ** 2 * (p3.x - p2.x),
      y: 3 * inverse ** 2 * (p1.y - p0.y) + 6 * inverse * t * (p2.y - p1.y) + 3 * t ** 2 * (p3.y - p2.y),
    };
  };

  while (index < tokens.length) {
    const command = tokens[index++].toUpperCase();
    if (command === 'M') {
      current = point();
      continue;
    }
    if (!current) throw new Error(`path command ${command} has no starting point: ${d}`);
    if (command === 'L') {
      const end = point();
      for (const t of [0.25, 0.5, 0.75]) {
        samples.push({
          x: current.x + (end.x - current.x) * t,
          y: current.y + (end.y - current.y) * t,
          dx: end.x - current.x,
          dy: end.y - current.y,
        });
      }
      current = end;
      continue;
    }
    if (command === 'C') {
      const start = current;
      const control1 = point();
      const control2 = point();
      const end = point();
      for (const t of [0.25, 0.5, 0.75]) {
        const at = cubicPoint(start, control1, control2, end, t);
        const tangent = cubicTangent(start, control1, control2, end, t);
        samples.push({ x: at.x, y: at.y, dx: tangent.x, dy: tangent.y });
      }
      current = end;
      continue;
    }
    throw new Error(`unsupported path command ${command}: ${d}`);
  }
  return samples;
}

const boundarySamples = spec.boundaries.map(pathSamples);

function labelAt(sourceX, sourceY) {
  const x = Math.round((sourceX + tx) * scale);
  const y = Math.round((sourceY + ty) * scale);
  if (x < 0 || x >= imageWidth || y < 0 || y >= imageHeight) return -1;
  return labels[y * imageWidth + x];
}

function chooseBoundarySideRegion(seed) {
  const votes = new Map();
  const samples = boundarySamples[seed.boundary_index] || [];
  for (const sample of samples) {
    const length = Math.hypot(sample.dx, sample.dy);
    if (!Number.isFinite(length) || length < 0.001) continue;
    // In Harmony color art, side 0 is the screen-space right side of the
    // directed path. Side 1 is the opposite side.
    const direction = seed.side === 0 ? 1 : -1;
    const normalX = direction * sample.dy / length;
    const normalY = direction * -sample.dx / length;
    for (const distance of [1, 2, 4, 8, 12, 18, 26, 38]) {
      const label = labelAt(sample.x + normalX * distance, sample.y + normalY * distance);
      if (label < 0) continue;
      if (regions[label].touchesBorder) break;
      const vote = votes.get(label) || { count: 0, distanceTotal: 0 };
      vote.count += 1;
      vote.distanceTotal += distance;
      votes.set(label, vote);
      break;
    }
  }
  const ranked = [...votes].sort((left, right) =>
    right[1].count - left[1].count || left[1].distanceTotal - right[1].distanceTotal
  );
  if (!ranked.length) return null;
  return { label: ranked[0][0], votes: ranked[0][1].count, distance: ranked[0][1].distanceTotal / ranked[0][1].count };
}

function chooseSeedRegion(seed) {
  const requested = chooseBoundarySideRegion(seed);
  if (requested) return { ...requested, sideFallback: false };

  // Some Harmony TVGs contain a valid paint seed whose recorded side points
  // away from the only enclosed region on that boundary. Treat the opposite
  // side as a recovery path only when the requested side resolves to nothing.
  // This preserves every unambiguous seed while recovering otherwise-empty
  // authored color regions such as Shaz Mouth-2's white teeth.
  const opposite = chooseBoundarySideRegion({
    ...seed,
    side: seed.side === 0 ? 1 : 0,
  });
  return opposite ? { ...opposite, sideFallback: true } : null;
}

const regionVotes = new Map();
const paintResults = [];
for (const seed of spec.seeds) {
  const picked = chooseSeedRegion(seed);
  if (!picked) {
    paintResults.push({ ...seed, pixels: 0, region: null });
    continue;
  }
  const colors = regionVotes.get(picked.label) || new Map();
  const colorKey = seed.color.join(',');
  const vote = colors.get(colorKey) || { color: seed.color, count: 0, distanceTotal: 0, seed };
  vote.count += picked.votes;
  vote.distanceTotal += picked.distance * picked.votes;
  colors.set(colorKey, vote);
  regionVotes.set(picked.label, colors);
  paintResults.push({
    ...seed,
    pixels: regions[picked.label].size,
    region: picked.label,
    touchesBorder: regions[picked.label].touchesBorder,
    distance: picked.distance,
    votes: picked.votes,
    sideFallback: picked.sideFallback,
  });
}

const regionPaint = new Map();
for (const [label, colors] of regionVotes) {
  const ranked = [...colors.values()].sort((left, right) =>
    right.count - left.count || left.distanceTotal - right.distanceTotal
  );
  regionPaint.set(label, ranked[0]);
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
const diagnostics = writeDebug ? {
  unpaintedRegions: regions
    .map((region, label) => ({ label, pixels: region.size, touchesBorder: region.touchesBorder }))
    .filter((region) => !region.touchesBorder && !regionPaint.has(region.label))
    .sort((left, right) => right.pixels - left.pixels)
    .slice(0, 20),
  boundaryRegions: spec.boundaries.map((_, boundary_index) => ({
    boundary_index,
    side0: chooseBoundarySideRegion({ boundary_index, side: 0 }),
    side1: chooseBoundarySideRegion({ boundary_index, side: 1 }),
  })),
} : {};
console.log(JSON.stringify({ outputPath, width: Math.round(imageWidth / scale), height: Math.round(imageHeight / scale), paintResults, ...diagnostics }));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
