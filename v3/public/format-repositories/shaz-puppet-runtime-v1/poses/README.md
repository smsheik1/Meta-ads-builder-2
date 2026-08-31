# Writing Shaz pose recipes

A pose recipe tells the recovered rig what to do. It names real PEG and READ controls, adds a small set of keyframes, and changes drawings only when needed. Every recipe renders through `renderRigFrame`.

A recipe does not contain finished artist-animation frames, a generic full-character sprite, or its own renderer.

## Before you animate

Read the lifecycle in `../POSE-PROMOTION.md`, the author-and-learn loop in `../SKILL.md`, and all of `../references/rig-animation-playbook.md`. Work on one unapproved action at a time.

Use compiled Xstage drawings and complete native limb chains whenever possible. If bounded native-rig attempts prove that the recovered controls cannot make an essential destination, one coherent part-specific drawing may replace the complete corresponding native parts under the strict rule in `../SKILL.md`:

- lock the exact asset, transform, and paint layer;
- hide all corresponding native parts on the same frame;
- keep unrelated regions, including the head and body, rig-rendered;
- pass independent inspection and complete exact-output review.

Independently positioned limb fragments remain forbidden.

## Reconstructing a pose from video

Do not begin by copying a vaguely similar action. First split the reference into setup, authentic source entry, each distinct hold, any edit or counter-shift, afterbeat, and release when one is actually visible. Pick one stable gold frame for one destination silhouette.

Build that destination as a one-frame, body-only candidate through the official renderer. Pose-first is the authoring order, not permission to stop at a still. Use a study-specific ID such as `<action>-destination-study`, never the canonical full-action ID. Normalize reference and runtime character scale, then fit the complete native chain in joint order: shoulder, elbow, wrist, palm center, palm angle, and torso line. Store the target measurements and tolerances in a focused regression. Keep eyes, eyebrows, pupils, and Mouth out of the recipe unless they are truly part of the body-language contract.

A correct hold is not yet a reusable action. If the frozen reference contains body motion, reconstruct every observed phase before full-action review; its authentic non-neutral entry belongs to the action. A one-frame study cannot satisfy full-action inspection, review, or registration. If the source has no release, end the action at the last observed source state and never borrow a generic reverse or another action's exit. Neutral boundary connectors are separate packet-readiness work and receive their own review after the source action is complete.

## Minimal recipe

```json
{
  "schemaVersion": "shaz-pose-recipe-v1",
  "id": "small-head-nod",
  "fps": 24,
  "durationFrames": 16,
  "baseFrame": 1,
  "sourceXstageSha256": "507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca",
  "artistRenderedFramesUsed": false,
  "controls": {
    "Head_Movement-P": [
      { "frame": 1, "rotation": 0 },
      { "frame": 5, "rotation": 7 },
      { "frame": 8, "rotation": -2 },
      { "frame": 12, "rotation": 0 }
    ]
  },
  "drawings": {}
}
```

Each key inherits omitted values from the previous key. The first key inherits from `baseFrame`. Segments are `linear` unless the left key sets `"interpolation": "hold"`. An overshoot is simply another explicit key, as shown at frame 8.

Supported numeric controls are:

- `position`: `[x,y,z]`
- `rotation`
- `scale`: `[x,y]`
- `skew`
- `opacity`

`flipHorizontal` and `flipVertical` are step-held booleans. Drawing keys name a READ node and use `{ "frame": N, "drawing": "drawing-id" }`; use `null` to hide that drawing.

## Importing an action from a compatible Xstage

When a second Harmony scene contains the same component rig, do not copy its shot framing into the package and do not pretend its frames belong to the base Xstage. Prove path-and-type compatibility first, render the source action directly, then retarget the character-local controls to the current runtime.

A compatible-source recipe keeps `sourceXstageSha256` pinned to the packaged runtime. Its `sourceAction` records the external Xstage and archive hashes plus exact frame range. Every deformation node is carried in `deformationSamples` as deduplicated source samples with one `frameSamples` index per local frame; `deformationFrames` keeps the original source-frame timing as evidence. A missing drawing is declared in `drawingSources` and remains bound to the external Xstage hash.

External drawings are compiled from TVG, normalized to the canonical palette before rasterization, stored below `rig-v2/assets/sources/<xstage-sha256>/`, and recorded per asset in the v3 receipt. Never overwrite an existing base filename or source-bind a drawing already present in the canonical rig. The palette transform must first reproduce shared canonical drawings byte-for-byte.

Use `runtime/compile-tvg-assets.mjs --drawings ... --outline-source-color ... --outline-color ...` to compile only missing drawings, then register the exact source and every candidate that uses it:

```sh
node runtime/register-compatible-tvg-assets.mjs \
  --manifest rig-v2/runtime.json \
  --base-assets rig-v2/assets \
  --compatible-assets /absolute/path/to/compiled-assets \
  --source-xstage-sha256 <xstage-sha256> \
  --source-xstage-name scene.xstage \
  --source-archive-sha256 <archive-sha256> \
  --source-archive-name source.zip \
  --recipe poses/candidates/action.json
```

The command verifies the base receipt, manifest, recipe provenance, recorded TVG-source checksums, compiled PNG checksums, exact asset filenames, and hash namespace before a journaled replacement of that source's registered asset set. The external journal restores interrupted work on the next authoring invocation; the multi-file update is deliberately not described as atomic. The compiler is the step that reads and hashes the TVGs; registration validates that recorded provenance and re-hashes every compiled output. Pass every recipe that uses the source on each rerun so removed candidates cannot leave orphaned packaged assets. Both authoring tools and their journal namespace are excluded from the downloadable runtime kit.

## Render one recipe

```sh
node runtime/render-xstage-range.mjs \
  --manifest rig-v2/runtime.json \
  --assets rig-v2/assets \
  --prop-assets assets/props \
  --recipe poses/my-pose.json \
  --output output.mp4 \
  --receipt output-receipt.json
```

The command rejects the wrong rig SHA, unknown controls, unknown drawings, invalid frames, unsupported interpolation, and any recipe that does not explicitly exclude artist-rendered frames.

## Preserve authored timing

The dense recipes under `authored/` are lossless calibration references extracted from the supplied Xstage animation. A new semantic pose should be sparse: include only controls and drawing substitutions that truly change.

When a synchronized artist reference proves stepped timing, give the extractor the local change frames instead of smoothing the Xstage channels:

```sh
node runtime/extract-pose-recipe.mjs \
  --manifest rig-v2/runtime.json \
  --id confident \
  --start 287 \
  --end 299 \
  --base-frame 1 \
  --exposure-change-frames 1,3,5,7,9,11,13 \
  --output poses/authored/confident.json
```

This writes held control keys, repeats matching deformation exposures, and records the measured cadence. Use only change frames proven by the reference. Do not guess them from control curves.

## Inspect, review, then register

Run `runtime/inspect-pose.mjs` with the same manifest, asset, prop, and recipe paths. Watch the exact output completely at normal speed as well; an automatic pass does not decide whether the pose looks right.

Do not add a recipe to `poses/index.json` until inspection passes and the registry stores the exact file SHA-256. Once registered, all user-facing sequence renders must go through `runner.mjs`.

Registration makes a recipe runnable. Creative approval still requires a fresh review of that exact current recipe and output.
