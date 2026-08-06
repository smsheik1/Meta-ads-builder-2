---
name: mixamo-character-motion
description: "Import a Mixamo Collada motion, retarget it onto a verified Wiggly character, render the exact clip, inspect grounding and facial stability, and finalize only after human motion review."
---

# Mixamo Character Motion

1. Run `npm run check` and `npm run smoke` before real work.
2. Use an existing ID from `assets/motions/manifest.json`, or import a user-downloaded Mixamo `.dae` with `node runner.mjs import-motion`.
3. Run `init`, edit only the run's `input.json`, then run `validate` before rendering.
4. Use `render` and `inspect`; never replace `runtime/renderer/app.js`, `runtime/renderer/mixamo-retarget.js`, or `runtime/render.mjs`.
5. Inspect the actual MP4 and contact sheet. Fix only observed character-profile or runtime problems, with at most three render attempts.
6. Run `finalize --human-review=pass` only after a person approves the motion identity, feet, eyes, intersections, and usefulness.

Do not copy Mixamo source `.dae` files into the package. Do not truncate or loop clips to fit an arbitrary duration.
