import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const converterRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function withFixture(source, callback) {
  const directory = await mkdtemp(path.join(tmpdir(), "harmony-runtime-manifest-"));
  const scene = path.join(directory, "fixture.xstage");
  await writeFile(scene, source);
  try {
    const result = spawnSync("python3", [path.join(converterRoot, "scene_runtime_manifest.py"), scene], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    await callback(JSON.parse(result.stdout));
  } finally {
    await rm(directory, { recursive: true });
  }
}

test("runtime manifest preserves nested node paths, ports, and unknown module attrs", async () => {
  await withFixture(`
<project creator="harmony" source="Harmony Premium" version="2200" build="19000">
  <elements><element id="7" elementName="Arm" elementFolder="Arm" rootFolder="elements"><drawings><dwg name="1"/><dwg name="2"/></drawings></element></elements>
  <options><framerate val="24"/></options>
  <scenes><scene id="scene" name="Scene" nbframes="12" startFrame="1" stopFrame="12"><columns/>
    <rootgroup name="Top"><nodeslist><group name="Deform" pos="0,0,0"><options/>
      <nodeslist><module type="CurveModule" name="Curve" pos="0,0,0"><options/><attrs><length0 val="2" defaultValue="1" col="curve-length"/></attrs></module></nodeslist>
      <linkedlist><link out="Input" in="Curve" outport="1" inport="2"/></linkedlist>
    </group></nodeslist><linkedlist/></rootgroup>
  </scene></scenes>
</project>`, async (manifest) => {
    assert.equal(manifest.schemaVersion, "harmony-xstage-runtime-v1");
    assert.equal(manifest.elements[0].name, "Arm");
    assert.deepEqual(manifest.elements[0].drawings, ["1", "2"]);
    const scene = manifest.scenes[0];
    assert.equal(scene.nodes[0].path, "Top/Deform/Curve");
    assert.equal(scene.nodes[0].type, "CurveModule");
    assert.deepEqual(
      scene.nodes[0].attrs.children.length0[0].attributes,
      { col: "curve-length", defaultValue: "1", val: "2" },
    );
    assert.deepEqual(scene.links[0], {
      groupPath: "Top/Deform",
      from: "Top/Deform/Input",
      to: "Top/Deform/Curve",
      fromPort: 1,
      toPort: 2,
    });
  });
});

test("runtime manifest expands drawing exposures and scalar frame expressions", async () => {
  await withFixture(`
<project><elements/><options/><scenes><scene nbframes="20" startFrame="1" stopFrame="20"><columns>
    <column type="0" name="drawing" displayOrder="0" anonymous="false" id="7"><heldSeq exposures="4,6-7"/><elementSeq exposures="1-3,5" val="2" id="2"/></column>
    <column type="3" name="angle" displayOrder="1" anonymous="true"><points version="1"><pt constSeg="true" x="1,4-5" yLocal="10" y="10"/></points></column>
    <column type="2" name="position" displayOrder="2" anonymous="true"><path3D useVeloX="false"><points><pt val="1,2,3" lockedInTime="6"/></points></path3D></column>
  </columns><rootgroup name=""><nodeslist/><linkedlist/></rootgroup></scene></scenes></project>`, async (manifest) => {
    const [drawing, angle, position] = manifest.scenes[0].columns;
    assert.deepEqual(drawing.exposures[0].frames, [1, 2, 3, 5]);
    assert.deepEqual(drawing.heldFrames, [4, 6, 7]);
    assert.equal(drawing.exposures[0].drawing, "2");
    assert.deepEqual(angle.points[0].frames, [1, 4, 5]);
    assert.equal(angle.points[0].constantSegment, true);
    assert.deepEqual(position.path3d.points[0], { frame: 6, value: [1, 2, 3] });
    assert.equal(position.payload.children.path3D[0].children.points[0].children.pt[0].attributes.lockedInTime, "6");
  });
});
