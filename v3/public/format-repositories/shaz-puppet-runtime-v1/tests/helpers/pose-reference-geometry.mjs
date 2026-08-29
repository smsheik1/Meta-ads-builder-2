import sharp from "sharp";

const isCoral = (red, green, blue) => (
  red > 215
  && green >= 65 && green <= 165
  && blue >= 55 && blue <= 155
  && red - green >= 65
  && Math.abs(green - blue) <= 50
);

const isSkin = (red, green, blue) => (
  red > 230
  && green >= 140 && green <= 215
  && blue >= 90 && blue <= 185
  && red - green >= 25 && red - green <= 115
  && green - blue >= 5 && green - blue <= 80
);

function connectedComponents(mask, width, height, minimumArea = 40) {
  const seen = new Uint8Array(mask.length);
  const stack = new Int32Array(mask.length);
  const components = [];
  for (let seed = 0; seed < mask.length; seed += 1) {
    if (!mask[seed] || seen[seed]) continue;
    let top = 0;
    stack[top++] = seed;
    seen[seed] = 1;
    const pixels = [];
    let area = 0;
    let sumX = 0;
    let sumY = 0;
    let sumXX = 0;
    let sumYY = 0;
    let sumXY = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    while (top > 0) {
      const pixel = stack[--top];
      const y = Math.floor(pixel / width);
      const x = pixel - y * width;
      pixels.push(pixel);
      area += 1;
      sumX += x;
      sumY += y;
      sumXX += x * x;
      sumYY += y * y;
      sumXY += x * y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
        for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
          if (deltaX === 0 && deltaY === 0) continue;
          const nextX = x + deltaX;
          const nextY = y + deltaY;
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
          const next = nextY * width + nextX;
          if (!mask[next] || seen[next]) continue;
          seen[next] = 1;
          stack[top++] = next;
        }
      }
    }
    if (area < minimumArea) continue;
    const centerX = sumX / area;
    const centerY = sumY / area;
    const centeredXX = sumXX / area - centerX * centerX;
    const centeredYY = sumYY / area - centerY * centerY;
    const centeredXY = sumXY / area - centerX * centerY;
    components.push({
      area,
      centerX,
      centerY,
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      axisDegrees: 0.5 * Math.atan2(
        2 * centeredXY,
        centeredXX - centeredYY,
      ) * 180 / Math.PI,
      pixels,
    });
  }
  return components.sort((left, right) => right.area - left.area);
}

function meanPoint(pixels, width) {
  let sumX = 0;
  let sumY = 0;
  for (const pixel of pixels) {
    const y = Math.floor(pixel / width);
    sumX += pixel - y * width;
    sumY += y;
  }
  return { x: sumX / pixels.length, y: sumY / pixels.length };
}

export async function measureScreenRightPresent(input) {
  const { data, info } = await sharp(input)
    .resize(1280, 720)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const coralMask = new Uint8Array(info.width * info.height);
  const skinMask = new Uint8Array(info.width * info.height);
  for (let pixel = 0, offset = 0; pixel < skinMask.length; pixel += 1, offset += info.channels) {
    coralMask[pixel] = isCoral(data[offset], data[offset + 1], data[offset + 2]) ? 1 : 0;
    skinMask[pixel] = isSkin(data[offset], data[offset + 1], data[offset + 2]) ? 1 : 0;
  }
  const coral = connectedComponents(coralMask, info.width, info.height);
  const skin = connectedComponents(skinMask, info.width, info.height);
  const face = skin.find((component) => component.centerY < 410 && component.area > 2500);
  if (!face) throw new Error("reference geometry could not find the face");
  const hand = skin.find((component) => (
    component !== face
    && component.area > 500
    && component.centerX > face.centerX + face.width * 0.45
    && component.centerY < 570
  ));
  const sleeve = coral.find((component) => (
    component.area > 500
    && component.centerX > face.centerX + face.width * 0.25
    && component.centerY > face.centerY
    && component.centerY < 620
  ));
  const torsoBand = skin.find((component) => (
    component !== face
    && component !== hand
    && component.area > 1500
    && component.centerY > 390 && component.centerY < 650
    && Math.abs(component.centerX - face.centerX) < face.width * 0.9
  ));
  if (!hand || !sleeve || !torsoBand) {
    throw new Error("reference geometry could not find the presenting hand, sleeve, and torso band");
  }
  return {
    faceCentroid: { x: face.centerX, y: face.centerY },
    shoulder: meanPoint(
      sleeve.pixels.filter((pixel) => pixel % info.width <= sleeve.minX + 4),
      info.width,
    ),
    elbow: meanPoint(
      sleeve.pixels.filter((pixel) => Math.floor(pixel / info.width) >= sleeve.maxY - 4),
      info.width,
    ),
    upperWristAnchor: { x: hand.minX, y: sleeve.minY },
    palmCentroid: { x: hand.centerX, y: hand.centerY },
    palmAxisDegrees: hand.axisDegrees,
    sleeveCentroid: { x: sleeve.centerX, y: sleeve.centerY },
    torsoBandAxisDegrees: torsoBand.axisDegrees,
  };
}

export function assertPointNear(assert, actual, expected, label) {
  const distance = Math.hypot(actual.x - expected.x, actual.y - expected.y);
  assert.ok(
    distance <= expected.tolerancePixels,
    `${label} drifted ${distance.toFixed(2)}px; limit ${expected.tolerancePixels}px`,
  );
}

export function assertAngleNear(assert, actual, expected, label) {
  const difference = Math.abs(actual - expected.value);
  assert.ok(
    difference <= expected.toleranceDegrees,
    `${label} drifted ${difference.toFixed(2)}deg; limit ${expected.toleranceDegrees}deg`,
  );
}
