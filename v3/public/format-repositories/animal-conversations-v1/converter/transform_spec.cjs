const fs = require('fs');

const [inputPath, outputPath, ...rawValues] = process.argv.slice(2);
if (!inputPath || !outputPath || rawValues.length !== 7) {
  throw new Error('usage: node transform_spec.cjs <input.json> <output.json> <position-x-fields> <position-y-fields> <scale-x> <scale-y> <rotation-degrees> <pivot-x-fields> <pivot-y-fields>');
}

const [positionXFields, positionYFields, scaleX, scaleY, rotationDegrees, pivotXFields, pivotYFields] = rawValues.map(Number);
if (![positionXFields, positionYFields, scaleX, scaleY, rotationDegrees, pivotXFields, pivotYFields].every(Number.isFinite)) {
  throw new Error('transform values must be finite numbers');
}

const gridX = 208.328125;
const gridY = 156.25;
const positionX = positionXFields * gridX;
const positionY = -positionYFields * gridY;
const pivotX = pivotXFields * gridX;
const pivotY = -pivotYFields * gridY;
const angle = -rotationDegrees * Math.PI / 180;
const cosine = Math.cos(angle);
const sine = Math.sin(angle);

function transformPoint(x, y) {
  const scaledX = (x - pivotX) * scaleX;
  const scaledY = (y - pivotY) * scaleY;
  return [
    pivotX + positionX + cosine * scaledX - sine * scaledY,
    pivotY + positionY + sine * scaledX + cosine * scaledY,
  ];
}

function transformPath(d) {
  const tokens = d.match(/[MLC]|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) || [];
  const output = [];
  let index = 0;
  while (index < tokens.length) {
    const command = tokens[index++].toUpperCase();
    output.push(command);
    const pointCount = command === 'C' ? 3 : command === 'M' || command === 'L' ? 1 : 0;
    if (pointCount === 0) throw new Error(`unsupported path command ${command}: ${d}`);
    for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
      const point = transformPoint(Number(tokens[index++]), Number(tokens[index++]));
      output.push(String(point[0]), String(point[1]));
    }
  }
  return output.join(' ');
}

const spec = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const transformSeed = (seed) => {
  const point = transformPoint(seed.x, seed.y);
  return { ...seed, x: point[0], y: point[1], boundary_x: point[0], boundary_y: point[1] };
};
const transformed = {
  ...spec,
  transform: { positionXFields, positionYFields, scaleX, scaleY, rotationDegrees, pivotXFields, pivotYFields },
  boundaries: spec.boundaries.map(transformPath),
  seeds: spec.seeds.map(transformSeed),
  fills: spec.fills.map((fill) => ({ ...fill, d: transformPath(fill.d) })),
  strokes: spec.strokes.map((stroke) => ({
    ...stroke,
    d: transformPath(stroke.d),
    width: stroke.width * Math.sqrt(Math.abs(scaleX * scaleY)),
  })),
};
fs.writeFileSync(outputPath, `${JSON.stringify(transformed)}\n`);
