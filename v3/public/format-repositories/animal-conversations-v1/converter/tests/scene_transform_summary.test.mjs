import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { toolExecutable } from "../../runtime/common.mjs";

const converterRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test("transform summary accepts compact frame ranges", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "harmony-transform-summary-"));
  const scene = path.join(directory, "fixture.xstage");
  await writeFile(scene, `
<project>
  <scenes><scene><columns>
    <column name="rotation"><points><pt x="1,35,95-96" y="12.5"/></points></column>
  </columns><rootgroup><nodeslist>
    <module type="PEG" name="Head-P"><attrs>
      <position/><scale><x val="1"/><y val="1"/></scale>
      <rotation><anglez col="rotation"/></rotation><skew val="0"/>
      <pivot><x val="0"/><y val="0"/></pivot>
    </attrs></module>
  </nodeslist></rootgroup></scene></scenes>
</project>`);

  const result = spawnSync(toolExecutable("python3"), [path.join(converterRoot, "scene_transform_summary.py"), scene, "Head-P"], {
    encoding: "utf8",
  });
  await rm(directory, { recursive: true });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout)[0].rotation, 12.5);
});
