import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensureWorktreeEnv,
  hasConfiguredConvexUrl,
  parseWorktreePaths,
} from "../../scripts/sync-worktree-env.mjs";

const fixtureRoot = mkdtempSync(join(tmpdir(), "wiggly-worktree-env-"));
const sourceRoot = join(fixtureRoot, "primary", "v3");
const targetRoot = join(fixtureRoot, "worktree");
const targetV3 = join(targetRoot, "v3");
mkdirSync(sourceRoot, { recursive: true });
mkdirSync(targetV3, { recursive: true });

const source = join(sourceRoot, ".env.local");
writeFileSync(
  source,
  "NEXT_PUBLIC_V3_CONVEX_URL=https://example.convex.cloud\nOTHER_SECRET=not-printed\n",
);

const messages = [];
const linked = ensureWorktreeEnv({
  repoRoot: targetRoot,
  sourcePath: source,
  log: (message) => messages.push(message),
});
assert.equal(linked.status, "linked");
assert.equal(readlinkSync(join(targetV3, ".env.local")), realpathSync(source));
assert.equal(hasConfiguredConvexUrl(join(targetV3, ".env.local")), true);
assert.equal(
  messages.some((message) => message.includes("OTHER_SECRET")),
  false,
);

const existing = ensureWorktreeEnv({
  repoRoot: targetRoot,
  sourcePath: source,
  log: () => undefined,
});
assert.equal(existing.status, "existing");

const overrideRoot = join(fixtureRoot, "override");
mkdirSync(join(overrideRoot, "v3"), { recursive: true });
writeFileSync(join(overrideRoot, "v3", ".env.local"), "CUSTOM_ENV=true\n");
const untouched = ensureWorktreeEnv({
  repoRoot: overrideRoot,
  sourcePath: source,
  optional: true,
  log: () => undefined,
});
assert.equal(untouched.status, "missing");
assert.equal(
  hasConfiguredConvexUrl(join(overrideRoot, "v3", ".env.local")),
  false,
);
assert.throws(
  () =>
    ensureWorktreeEnv({
      repoRoot: overrideRoot,
      sourcePath: source,
      log: () => undefined,
    }),
  /leaving it untouched/,
);
assert.equal(
  readFileSync(join(overrideRoot, "v3", ".env.local"), "utf8"),
  "CUSTOM_ENV=true\n",
);

assert.deepEqual(
  parseWorktreePaths("worktree /one\nHEAD abc\n\nworktree /two\nHEAD def\n"),
  ["/one", "/two"],
);

console.log("worktree environment tests passed");
