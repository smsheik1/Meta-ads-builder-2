# Candidate 09 low-side present recovery

**Status:** `recipe-candidate`. Mechanically clean. Creative review pending. Not registered, not safe-listed, and not packet-eligible.

## What was recovered

The ignored machine-local run `agent-runs/low-side-present-candidate-v2` contained an exact `shaz-pose-recipe-v1` recipe whose Xstage source checksum still matches the packaged rig. Those recipe bytes were copied without modification to `poses/candidates/low-side-present.json`.

- recipe file SHA-256: `53fd11c8850ec7514b01ecee6627adc2cd357e2d00132d6a95e3120bcfb77447`
- canonical semantic recipe SHA-256: `e0bbd203cddc26966e8555ee0c3ac3d36f4103c8e2797a1080195683ab5a339e`
- source Xstage SHA-256: `507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca`
- recipe source range: Xstage frames 37–43, based at frame 32
- recipe duration: 7 frames at 24 fps
- artist-rendered runtime pixels used: false

Fresh rendering through `runtime/rig-v2-renderer.mjs#renderRigFrame` reproduced the old inspection report byte-for-byte: inspection SHA-256 `8d6189dea87afdf553bfc088e5ec14a86ee5b6a47dfabae92aa9ec60d8a7418a`, status `pass`, 17 gates, zero failures, and a maximum identical-frame run of 1.

One recovered metadata sentence is stale: its bottom-edge exception says the performance stage restores the neutral fingertips, while the current close performance crop intentionally leaves those fingertips below frame, just as the 0826 reference does during its neutral setup. The edge contact is visually intentional, but the sentence must be corrected before registration. Because quality metadata participates in the semantic recipe checksum, that correction requires a new exact render, inspection, and review receipt rather than an in-place approval of this checksum.

## Why the old videos are not evidence

The old `candidate.mp4` is 66 frames / 2.750 seconds, while the stored recipe is 7 frames / 0.292 seconds. It has no checksum-bound render receipt. Its SHA-256 is `9010102ba277a4605c77ba1ac94a78c42bbf0e5e66959a0f12207a156f08dde0`; it is historical context only.

The old `human-reference.mp4` is a 98-frame, 960×540 proxy with SHA-256 `7ab40aa27ebb84884779dbabb4087c2b341fbdd756593a2435cdefc441c59cc2`. It is not the frozen Candidate 09 clip and has no source-binding receipt, so the new comparison uses the frozen selection clip directly.

## Frozen 0826 binding

- source: `0826.mov`
- source SHA-256: `237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127`
- selected range: 76.300–79.633 seconds
- isolated clip: `artifacts/shaz-0826-pose-selection-2026-08-26/clips/09-low-side-present-explain.mp4`
- isolated clip SHA-256: `4e0552b1ea4b4f30228522f0a5bdd2dfedc2d38f132926143ba27b6d0aeccfae`
- isolated clip: 100 frames at 30 fps, 3.333 seconds

The artist motion contains neutral setup, a quick screen-left open-palm entry, a long hold, then a smaller hand-angle afterbeat. It does not return to neutral inside the selected range. The recovered candidate contains only a 7-frame entry to a lower, more bent-elbow palm. It has no authored internal hold, afterbeat, or release.

## Fresh exact evidence

The authoring review bundle is at `shaz-primary-pose-promotion-2026-08-29/09-low-side-present-explain` in the persistent visualization workspace.

- unmodified official range render: `runtime-exact-entry.mp4`, SHA-256 `4a8cbd0ac5c6dd7baf9566a2014f8f38a77677e869e34d56c486c2eb39088ad3`
- exact recipe under the official performance stage and Sisters Room compositor: `runtime-performance-stage-entry.mp4`, SHA-256 `8f2bdd7c796d3ef8311ca09289bae5e73c7c475e8a38f35e75ea0e56f5e6ce6a`
- normal-speed three-pass comparison: `source-vs-runtime-1x-three-passes.mp4`, SHA-256 `41f75e5266a88363010689fa4b506a34d3dfde8991e524fdba7074630c6ff2c2`
- dense source-versus-runtime boundary sheet: `dense-boundary-sheet.jpg`, SHA-256 `723cd3d7570f06864ad5c16e965e53198ff9157ca08b126ceb213f51cbe7648c`

The comparison pads the candidate with frozen first and last frames only to align its 7-frame entry with the 100-frame source. That padding is review presentation, not recipe motion.

## Remaining decision

The mechanical recovery succeeded, but creative equivalence is intentionally unresolved. A reviewer must decide whether to:

1. promote the current lower, bent-elbow microgesture as Candidate 09;
2. keep it as a different low-side gesture and rebuild Candidate 09 closer to the artist's straighter arm and two-stage hand angle; or
3. rebuild it and discard this candidate.

No option grants packet readiness. The source has no neutral release, and the recovered recipe has no authored hold or release.
