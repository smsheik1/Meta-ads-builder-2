import path from "node:path";
import { mkdir } from "node:fs/promises";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import { talkingFishNewsProofScene } from "../features/formats/talking-fish-news/fixture";
import { adSceneCompositionId } from "../remotion-entry/Root";

const outputDirectory = path.resolve("tmp");
const outputLocation = path.join(outputDirectory, "talking-fish-news-wiggly-proof.mp4");

await mkdir(outputDirectory, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("remotion-entry/index.ts") });
const compositions = await getCompositions(serveUrl, {
  inputProps: { scene: talkingFishNewsProofScene },
});
const composition = compositions.find((item) => item.id === adSceneCompositionId);
if (!composition) throw new Error(`Missing ${adSceneCompositionId} composition.`);

await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation,
  inputProps: { scene: talkingFishNewsProofScene },
  overwrite: true,
  logLevel: "warn",
});

console.log(outputLocation);
