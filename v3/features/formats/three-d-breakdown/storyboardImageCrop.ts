import { decode, encode } from "jpeg-js";
import type { ThreeDBreakdownStoryboardFrameIndex } from "../../scene/types";

export const cropThreeDStoryboardPanel = (
  jpegBytes: Uint8Array,
  frameIndex: ThreeDBreakdownStoryboardFrameIndex,
) => {
  const image = decode(jpegBytes, { useTArray: true, formatAsRGBA: true });
  if (image.width < 2 || image.height < 3) throw new Error("3D Breakdown storyboard image is too small to crop.");

  const zeroIndex = frameIndex - 1;
  const column = zeroIndex % 2;
  const row = Math.floor(zeroIndex / 2);
  const cellLeft = Math.round((image.width * column) / 2);
  const cellRight = Math.round((image.width * (column + 1)) / 2);
  const cellTop = Math.round((image.height * row) / 3);
  const cellBottom = Math.round((image.height * (row + 1)) / 3);
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
