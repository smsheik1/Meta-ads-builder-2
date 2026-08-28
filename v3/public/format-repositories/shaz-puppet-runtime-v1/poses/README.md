# Writing Shaz pose recipes

A pose recipe tells the recovered rig what to do. It names real PEG and READ controls, adds a small set of keyframes, and changes drawings only when needed. Every recipe renders through `renderRigFrame`.

A recipe does not contain finished artist-animation frames, a generic full-character sprite, or its own renderer.

## Before you animate

Read the author-and-learn loop in `../SKILL.md` and all of `../references/rig-animation-playbook.md`. Work on one unapproved action at a time.

Use compiled Xstage drawings and complete native limb chains whenever possible. If bounded native-rig attempts prove that the recovered controls cannot make an essential destination, one coherent part-specific drawing may replace the complete corresponding native parts under the strict rule in `../SKILL.md`:

- lock the exact asset, transform, and paint layer;
- hide all corresponding native parts on the same frame;
- keep unrelated regions, including the head and body, rig-rendered;
- pass independent inspection and complete exact-output review.

Independently positioned limb fragments remain forbidden.

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
