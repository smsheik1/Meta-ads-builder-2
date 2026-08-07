import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bones = [
  "mixamorig_Hips",
  "mixamorig_LeftUpLeg", "mixamorig_LeftLeg", "mixamorig_LeftFoot",
  "mixamorig_RightUpLeg", "mixamorig_RightLeg", "mixamorig_RightFoot",
];
const localPositions = {
  mixamorig_Hips: [0, 1, 0],
  mixamorig_LeftUpLeg: [-0.2, -0.5, 0],
  mixamorig_LeftLeg: [0, -0.5, 0],
  mixamorig_LeftFoot: [0, -0.3, 0],
  mixamorig_RightUpLeg: [0.2, -0.5, 0],
  mixamorig_RightLeg: [0, -0.5, 0],
  mixamorig_RightFoot: [0, -0.3, 0],
};
const worldPositions = {
  mixamorig_Hips: [0, 1, 0],
  mixamorig_LeftUpLeg: [-0.2, 0.5, 0],
  mixamorig_LeftLeg: [-0.2, 0, 0],
  mixamorig_LeftFoot: [-0.2, -0.3, 0],
  mixamorig_RightUpLeg: [0.2, 0.5, 0],
  mixamorig_RightLeg: [0.2, 0, 0],
  mixamorig_RightFoot: [0.2, -0.3, 0],
};

function matrix([x, y, z], radians = 0) {
  const c = Math.cos(radians).toFixed(9);
  const s = Math.sin(radians).toFixed(9);
  return `${c} ${-s} 0 ${x} ${s} ${c} 0 ${y} 0 0 1 ${z} 0 0 0 1`;
}

function inverseTranslation([x, y, z]) {
  return `1 0 0 ${-x} 0 1 0 ${-y} 0 0 1 ${-z} 0 0 0 1`;
}

function syntheticMixamoDae() {
  const animationSources = bones.map((bone) => {
    const frames = [0.1, 0.2, 0.1].map((rotation, index) => matrix(localPositions[bone], bone === "mixamorig_Hips" ? rotation : rotation * 0.25 + index * 0.01));
    return `<source id="${bone}-Matrix-animation-output-transform"><float_array>${frames.join(" ")}</float_array></source><channel source="#${bone}-sampler" target="${bone}/matrix"/>`;
  }).join("");
  return `<COLLADA><asset><unit meter="1"/></asset><library_controllers><controller><skin source="#mesh"><source id="joints"><Name_array>${bones.join(" ")}</Name_array></source><source id="inverse-bind"><float_array>${bones.map((bone) => inverseTranslation(worldPositions[bone])).join(" ")}</float_array></source><joints><input semantic="JOINT" source="#joints"/><input semantic="INV_BIND_MATRIX" source="#inverse-bind"/></joints></skin></controller></library_controllers><library_animations><source id="mixamorig_Hips-Matrix-animation-input"><float_array>0 0.033333333 0.066666667</float_array></source>${animationSources}</library_animations><library_visual_scenes><visual_scene id="Scene"><node id="mixamorig_Hips" name="mixamorig_Hips"><node id="mixamorig_LeftUpLeg" name="mixamorig_LeftUpLeg"><node id="mixamorig_LeftLeg" name="mixamorig_LeftLeg"><node id="mixamorig_LeftFoot" name="mixamorig_LeftFoot"></node></node></node><node id="mixamorig_RightUpLeg" name="mixamorig_RightUpLeg"><node id="mixamorig_RightLeg" name="mixamorig_RightLeg"><node id="mixamorig_RightFoot" name="mixamorig_RightFoot"></node></node></node></node></visual_scene></library_visual_scenes></COLLADA>`;
}

test("the local import-motion command normalizes a user-supplied Mixamo clip and updates its catalog", async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), "wiggly-import-motion-"));
  try {
    await mkdir(path.join(temporary, "runtime/scripts"), { recursive: true });
    await mkdir(path.join(temporary, "assets/motions"), { recursive: true });
    await mkdir(path.join(temporary, "node_modules"), { recursive: true });
    await copyFile(path.join(root, "runner.mjs"), path.join(temporary, "runner.mjs"));
    await copyFile(path.join(root, "runtime/scripts/extract-mixamo.mjs"), path.join(temporary, "runtime/scripts/extract-mixamo.mjs"));
    const threeEntry = fileURLToPath(import.meta.resolve("three"));
    await symlink(path.resolve(path.dirname(threeEntry), ".."), path.join(temporary, "node_modules/three"), "dir");
    await writeFile(path.join(temporary, "assets/motions/manifest.json"), '{"schemaVersion":1,"motions":[]}\n');
    const source = path.join(temporary, "Operator Motion.dae");
    await writeFile(source, syntheticMixamoDae());

    await execute(process.execPath, ["runner.mjs", "import-motion", `--source=${source}`, "--id=operator-motion", "--label=Operator Motion"], { cwd: temporary });

    const manifest = JSON.parse(await readFile(path.join(temporary, "assets/motions/manifest.json"), "utf8"));
    const motion = JSON.parse(await readFile(path.join(temporary, "assets/motions/operator-motion.json"), "utf8"));
    assert.equal(manifest.motions.length, 1);
    assert.equal(manifest.motions[0].id, "operator-motion");
    assert.equal(motion.source.fileName, "Operator Motion.dae");
    assert.equal(motion.source.referencePose, "inverse-bind-matrices");
    assert.equal(motion.fps, 30);
    assert.equal(motion.frameCount, 3);
    assert.ok(motion.metrics.sourceLegLengthMeters > 0);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
