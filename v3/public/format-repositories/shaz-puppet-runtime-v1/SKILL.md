---
name: shaz-puppet-runtime
description: Render repeatable 2D Shaz puppet animation sequences from the recovered Toon Boom rig, verified pose recipes, and one Harmony-free runtime.
---

# Shaz Puppet Runtime

Use this kit when the user wants a video assembled from the registered Shaz actions in `poses/index.json`. The kit is fully local, makes no provider calls, and costs $0.

## Required workflow

1. Read `README.md`, `input-contract.json`, `composition-contract.json`, `output-contract.json`, `quality.json`, and `content-boundary.json`.
2. Run `npm install` once, then `npm run check` and `npm run smoke`.
3. Write an input JSON that uses only registered `poseId` values. Use explicit `holdFrames` and `gapFrames`; the last action must use `gapFrames: 0`.
4. Start a new run with an absolute input path:

   `npm run init -- --run=my-run --input=/absolute/path/input.json`

5. Run, in order:

   - `npm run validate -- --run=my-run`
   - `npm run render -- --run=my-run`
   - `npm run inspect -- --run=my-run`

6. Watch `agent-runs/my-run/final.mp4` completely. Inspect `contact-sheet.jpg` and `quality-report.json`. Do not approve a video you did not watch.
7. Edit only `agent-runs/my-run/human-review.json`: set `status` to `approved` or `rejected`, keep the exact `reviewedOutputSha256`, name the reviewer, and add concise notes.
8. Run `npm run finalize -- --run=my-run`. Delivery is blocked when validation, inspection, checksums, or human review do not pass.

## Important boundaries

- `runtime/rig-v2-renderer.mjs#renderRigFrame` is the only renderer for smoke, proof, and final output.
- Never use finished artist-rendered frames as sprites, motion references, or pose-generation inputs.
- Never bypass `poses/index.json` with arbitrary recipe paths.
- Do not weaken per-frame clipping, joint continuity, layer order, prop, facial-pop, or provenance gates to make a run pass.
- Up to three render attempts are allowed per run. Fix the input or recipe between attempts; do not create shadow runs to evade the limit.
- Adding a genuinely new action is an authoring task, not a sequence-input change. Follow `poses/README.md`, validate the recipe independently, register its checksum, and add evidence before using it.

## Return to the user

Return the absolute path to `final.mp4`, the video checksum from `delivery.json`, the ordered action list, and whether any limitations remain. Never claim delivery if `delivery.json` is absent.
