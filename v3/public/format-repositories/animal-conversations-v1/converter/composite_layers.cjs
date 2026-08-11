const fs = require('fs');
const path = require('path');

const [outputPath, moduleRoot, ...inputPaths] = process.argv.slice(2);
if (!outputPath || !moduleRoot || inputPaths.length === 0) {
  throw new Error('usage: node composite_layers.cjs <output.png> <module-root> <bottom.png>...<top.png>');
}
const sharp = require(path.join(moduleRoot, 'node_modules', 'sharp'));

(async () => {
  const metadata = await sharp(inputPaths[0]).metadata();
  if (!metadata.width || !metadata.height) throw new Error('first layer has no dimensions');
  for (const inputPath of inputPaths.slice(1)) {
    const layer = await sharp(inputPath).metadata();
    if (layer.width !== metadata.width || layer.height !== metadata.height) {
      throw new Error(`layer dimensions do not match: ${inputPath}`);
    }
  }
  const transparent = {
    create: {
      width: metadata.width,
      height: metadata.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  };
  await sharp(transparent)
    .composite(inputPaths.map((input) => ({ input })))
    .png()
    .toFile(outputPath);
  process.stdout.write(`${JSON.stringify({ outputPath, width: metadata.width, height: metadata.height, layers: inputPaths.length })}\n`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
