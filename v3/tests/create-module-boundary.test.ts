import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const createDir = join(process.cwd(), "app/create");
const maxExtractedModuleLines = 400;
const allowedLargeCreateFiles = new Set([
  "CreateResearchClient.tsx",
]);

const createFiles = readdirSync(createDir)
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .filter((file) => !allowedLargeCreateFiles.has(file));

const oversizedFiles = createFiles
  .map((file) => {
    const source = readFileSync(join(createDir, file), "utf8");
    return {
      file,
      lines: source.split(/\r?\n/).length,
    };
  })
  .filter(({ lines }) => lines > maxExtractedModuleLines);

assert.deepEqual(
  oversizedFiles,
  [],
  `Extracted /create modules must stay at or below ${maxExtractedModuleLines} lines.`,
);

console.log("create-module-boundary tests passed");
