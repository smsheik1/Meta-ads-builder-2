import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const createDir = join(process.cwd(), "app/create");
const maxExtractedModuleLines = 400;
const knownLargeCreateFileBudgets = new Map([
  ["CreateResearchClient.tsx", 3800],
  ["CreateQuickActions.tsx", 850],
  ["CreateLeftColumn.tsx", 600],
  ["CreateBrickStoryboardSheet.tsx", 530],
  ["CreateProductPhotoshootSheet.tsx", 415],
]);

const createFiles = readdirSync(createDir)
  .filter((file) => /\.(ts|tsx)$/.test(file));

const oversizedFiles = createFiles
  .map((file) => {
    const source = readFileSync(join(createDir, file), "utf8");
    return {
      file,
      lines: source.split(/\r?\n/).length,
      budget: knownLargeCreateFileBudgets.get(file) ?? maxExtractedModuleLines,
    };
  })
  .filter(({ lines, budget }) => lines > budget);

assert.deepEqual(
  oversizedFiles,
  [],
  `Extracted /create modules must stay within their line budgets; default budget is ${maxExtractedModuleLines} lines.`,
);

console.log("create-module-boundary tests passed");
