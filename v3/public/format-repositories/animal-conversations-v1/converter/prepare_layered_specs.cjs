const fs = require('fs');
const path = require('path');

const [outputDirectory, ...inputPaths] = process.argv.slice(2);
if (!outputDirectory || inputPaths.length === 0) {
  throw new Error('usage: node prepare_layered_specs.cjs <output-directory> <drawing.json>...');
}

const drawings = inputPaths.map((inputPath) => ({
  inputPath,
  spec: JSON.parse(fs.readFileSync(inputPath, 'utf8')),
}));
const allPaths = drawings.flatMap(({ spec }) => [
  ...spec.boundaries,
  ...spec.fills.map((item) => item.d),
  ...spec.strokes.map((item) => item.d),
]);
const coords = allPaths.flatMap((d) =>
  [...d.matchAll(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)].map((match) => Number(match[0]))
);
const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
for (let index = 0; index + 1 < coords.length; index += 2) {
  const x = coords[index];
  const y = coords[index + 1];
  if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}
if (!Object.values(bounds).every(Number.isFinite)) throw new Error('scene has no finite coordinates');

fs.mkdirSync(outputDirectory, { recursive: true });
const outputs = drawings.map(({ inputPath, spec }, index) => {
  const outputPath = path.join(outputDirectory, `${String(index).padStart(2, '0')}-${path.basename(inputPath)}`);
  fs.writeFileSync(outputPath, `${JSON.stringify({ ...spec, bounds })}\n`);
  return outputPath;
});
process.stdout.write(`${JSON.stringify({ bounds, outputs })}\n`);
