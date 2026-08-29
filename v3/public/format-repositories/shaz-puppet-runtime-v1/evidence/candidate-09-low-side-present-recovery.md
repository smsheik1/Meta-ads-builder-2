# Candidate 09 low-side present recovery

**Status:** `recipe-candidate`. Mechanically clean. Creative review pending. Not registered, not safe-listed, and not packet-eligible.

## What was recovered

The ignored machine-local run `agent-runs/low-side-present-candidate-v2` contained a `shaz-pose-recipe-v1` recipe whose Xstage source checksum still matches the packaged rig. Its controls, drawings, source range, and timing are preserved at `poses/candidates/low-side-present.json`. One false metadata claim—that the performance crop restored the opposite fingertips—was replaced with the accurate fixed-waist-up-crop description. No motion data changed.

- recipe file SHA-256: `661fc3138f63218f0131effdac83197dcc2502d04ce3753486caac4cf0f9fdc2`
- canonical semantic recipe SHA-256: `2ac1b39b00692303414f5407ca075529b096f45ed8dd8d4140c056c8687d2aca`
- source Xstage SHA-256: `507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca`
- recipe source range: Xstage frames 37–43, based at frame 32
- recipe duration: 7 frames at 24 fps
- artist-rendered runtime pixels used: false

Fresh rendering through `runtime/rig-v2-renderer.mjs#renderRigFrame` produced inspection SHA-256 `b33880252dfda9e53553ac02f3f246fe65f38c5beff6c61f902d904c39691681`, status `pass`, 17 gates, zero failures, and a maximum identical-frame run of 1.

The corrected exception says exactly what the output shows: the source-authored opposite hand intentionally continues below the bottom edge in the fixed waist-up crop, while its native cuff/wrist chain remains intact. The new semantic checksum, render receipts, inspection, videos, comparisons, sheets, and pending-review binding were regenerated together. This correction does not register or approve the action.

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
- exact recipe under the official performance stage and Sisters Room compositor: `runtime-performance-stage-entry.mp4`, SHA-256 `1037775c1c198f1ef1117e9cc0fa0de02cab41411fdfd65b693611593ad6c1df`
- normal-speed three-pass comparison: `source-vs-runtime-1x-three-passes.mp4`, SHA-256 `4b32ee6d7de48f951f4f627bc94b2ad5d9f2663a62e25904b1c3e35cda58f148`
- dense source-versus-runtime boundary sheet: `dense-boundary-sheet.jpg`, SHA-256 `a93768019eda0d8da6317dd72c9fb77531c81899c0b4d58e63447fb73ef7b9b1`

The comparison pads the candidate with frozen first and last frames only to align its 7-frame entry with the 100-frame source. That padding is review presentation, not recipe motion.

## Remaining decision

The mechanical recovery succeeded, but creative equivalence is intentionally unresolved. A reviewer must decide whether to:

1. promote the current lower, bent-elbow microgesture as Candidate 09;
2. keep it as a different low-side gesture and rebuild Candidate 09 closer to the artist's straighter arm and two-stage hand angle; or
3. rebuild it and discard this candidate.

No option grants packet readiness. The source has no neutral release, and the recovered recipe has no authored hold or release.
