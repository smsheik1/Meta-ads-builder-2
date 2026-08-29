import assert from "node:assert/strict";
import test from "node:test";

import { buildKit } from "../build-kit.mjs";
import { sha256 } from "../runtime/run-common.mjs";

test("identical package inputs produce the same ZIP checksum", async () => {
  await buildKit();
  const first = await sha256(new URL("../downloads/wiggly-shaz-puppet-runtime-format-kit.zip", import.meta.url));

  await buildKit();
  const second = await sha256(new URL("../downloads/wiggly-shaz-puppet-runtime-format-kit.zip", import.meta.url));

  assert.equal(second, first);
});
