import { decode, encode } from "jpeg-js";
import type { ThreeDBreakdownStoryboardFrameIndex } from "../../scene/types";

type Gutter = {
  end: number;
  start: number;
};

const findLightGutters = (
  image: { data: Uint8Array; height: number; width: number },
) => {
  const lightLines: number[] = [];

  for (let y = 0; y < image.height; y += 1) {
    let lightPixels = 0;
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      if (
        image.data[offset]! > 220
        && image.data[offset + 1]! > 220
        && image.data[offset + 2]! > 220
      ) {
        lightPixels += 1;
      }
    }
    if (lightPixels / image.width > 0.94) lightLines.push(y);
  }

  return lightLines.reduce<Gutter[]>((gutters, y) => {
    const last = gutters.at(-1);
    if (last && y === last.end + 1) {
      last.end = y;
    } else {
      gutters.push({ start: y, end: y });
    }
    return gutters;
  }, []);
};

export const cropThreeDStoryboardPanel = (
  jpegBytes: Uint8Array,
  frameIndex: ThreeDBreakdownStoryboardFrameIndex,
) => {
  const image = decode(jpegBytes, { useTArray: true, formatAsRGBA: true });
  if (image.width < 2 || image.height < 3) throw new Error("3D Breakdown storyboard image is too small to crop.");

  const zeroIndex = frameIndex - 1;
  const column = zeroIndex % 2;
  const row = Math.floor(zeroIndex / 2);
  const horizontalGutters = findLightGutters(image)
    .filter((gutter) => gutter.start > 0 && gutter.end < image.height - 1);
  const detectedRows = horizontalGutters.length >= 2
    ? [
        [0, horizontalGutters[0]!.start],
        [horizontalGutters[0]!.end + 1, horizontalGutters[1]!.start],
        [horizontalGutters[1]!.end + 1, horizontalGutters[2]?.start ?? image.height],
      ]
    : null;
  const cellLeft = Math.round((image.width * column) / 2);
  const cellRight = Math.round((image.width * (column + 1)) / 2);
  const cellTop = detectedRows?.[row]?.[0] ?? Math.round((image.height * row) / 3);
  const cellBottom = detectedRows?.[row]?.[1] ?? Math.round((image.height * (row + 1)) / 3);
  const inset = Math.max(1, Math.round(Math.min(cellRight - cellLeft, cellBottom - cellTop) * 0.01));

  let sourceLeft = cellLeft + inset;
  let sourceRight = cellRight - inset;
  let sourceTop = cellTop + inset;
  let sourceBottom = cellBottom - inset;
  const sourceWidth = sourceRight - sourceLeft;
  const sourceHeight = sourceBottom - sourceTop;
  const targetRatio = 9 / 16;

  if (sourceWidth / sourceHeight > targetRatio) {
    const croppedWidth = Math.max(1, Math.round(sourceHeight * targetRatio));
    sourceLeft += Math.floor((sourceWidth - croppedWidth) / 2);
    sourceRight = sourceLeft + croppedWidth;
  } else {
    const croppedHeight = Math.max(1, Math.round(sourceWidth / targetRatio));
    sourceTop += Math.floor((sourceHeight - croppedHeight) / 2);
    sourceBottom = sourceTop + croppedHeight;
  }

  const cropWidth = sourceRight - sourceLeft;
  const cropHeight = sourceBottom - sourceTop;
  const outputWidth = image.width;
  const outputHeight = Math.round(outputWidth / targetRatio);
  const output = new Uint8Array(outputWidth * outputHeight * 4);

  for (let y = 0; y < outputHeight; y += 1) {
    const sourceY = Math.min(sourceBottom - 1, sourceTop + Math.floor((y / outputHeight) * cropHeight));
    for (let x = 0; x < outputWidth; x += 1) {
      const sourceX = Math.min(sourceRight - 1, sourceLeft + Math.floor((x / outputWidth) * cropWidth));
      const sourceOffset = (sourceY * image.width + sourceX) * 4;
      const outputOffset = (y * outputWidth + x) * 4;
      output[outputOffset] = image.data[sourceOffset];
      output[outputOffset + 1] = image.data[sourceOffset + 1];
      output[outputOffset + 2] = image.data[sourceOffset + 2];
      output[outputOffset + 3] = 255;
    }
  }

  return new Uint8Array(encode({ width: outputWidth, height: outputHeight, data: output }, 90).data);
};
