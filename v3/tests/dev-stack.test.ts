import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rootPackage = JSON.parse(readFileSync("../package.json", "utf8"));
const v3Package = JSON.parse(readFileSync("package.json", "utf8"));
const devAll = readFileSync("../scripts/dev-all.mjs", "utf8");

assert.equal(rootPackage.scripts.dev, "node scripts/dev-all.mjs");
assert.equal(v3Package.scripts.dev, "node ../scripts/dev-all.mjs");
assert.equal(v3Package.scripts["dev:next"], "next dev -p 3020");
assert.ok(devAll.includes('args: ["run", "dev:next", "-w", "@wiggly/v3"]'));
assert.ok(devAll.includes('args: ["run", "convex:dev", "-w", "@wiggly/v3"]'));
assert.ok(devAll.includes('args: ["run", "render-worker:watch", "-w", "@wiggly/v3"]'));
assert.ok(devAll.includes("const repoRoot ="));

console.log("dev-stack tests passed");
