# Shaz pose recipes

A pose recipe is the only authoring surface above the recovered rig. It does not contain rendered artist frames, baked sprites, or a private renderer. It names real PEG/READ controls, adds sparse keyframes, switches existing drawings when needed, and renders through `renderRigFrame`.

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

Each key inherits omitted values from the previous key; the first key inherits from `baseFrame`. Segments are `linear` by default. Set `"interpolation": "hold"` on the left key for a held segment. Overshoot is an ordinary explicit key, as shown at frame 8.

Supported numeric controls are `position` (`[x,y,z]`), `rotation`, `scale` (`[x,y]`), `skew`, and `opacity`. `flipHorizontal` and `flipVertical` are step-held booleans. Drawing keys use a READ node name and `{ "frame": N, "drawing": "drawing-id" }`; `null` hides that drawing.

## Render

```sh
node runtime/render-xstage-range.mjs \
  --manifest rig-v2/runtime.json \
  --assets rig-v2/assets \
  --prop-assets assets/props \
  --recipe poses/my-pose.json \
  --output output.mp4 \
  --receipt output-receipt.json
```

The command rejects the wrong rig SHA, unknown control names, unknown drawings, invalid frames, unsupported interpolation modes, and recipes that do not explicitly exclude artist-rendered frames.

The dense recipes in `authored/` are lossless calibration goldens extracted from the supplied Xstage animation. New poses should be sparse and semantic; they should contain only controls and substitutions that actually change.

After authoring, run `runtime/inspect-pose.mjs` with the same manifest, asset, prop, and recipe paths. Do not add the recipe to `poses/index.json` until that inspection passes and the registry stores the exact file SHA-256. Once registered, all user-facing sequence renders must go through `runner.mjs`.
