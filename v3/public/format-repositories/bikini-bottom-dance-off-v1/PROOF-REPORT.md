# Bikini Bottom Dance Off Wiggly Repo proof

Format version: `0.9.0`
Current rubric: `1.1.0`

## What is packaged

- The official character renderer and retargeter, four verified character profiles, 25 normalized starter motions, local motion import, the 9:16 compositor, four selectable outer backgrounds, the Fish News panel background, inspection, and delivery.
- The song, script, cast order, colors, outer background, and solo/finale/reaction assignments remain episode inputs.
- Fish Audio is the only runtime provider and remains approval-gated. Mixamo is an operator-time source for local Collada import, not a runtime API.

The machine-readable boundary is `content-boundary.json`.

## Two independent format fixtures

1. `fixtures/smoke/input.json` uses the original choreography and `deep-ocean` outer canvas.
2. `fixtures/alternate/input.json` replaces every solo and finale motion, changes reactions, colors, title, and outer canvas without changing runtime code.

The alternate run validated twelve explicit motion assignments with zero Mixamo calls and reused its approved local dialogue cache with zero Fish Audio calls.

## Finished-video evaluation

The public proof at `examples/wiggle-proof/evidence/final.mp4` has:

- all 16 deterministic technical gates passing;
- a hash-bound blind-review packet and preserved raw submission;
- seven independently scored creative dimensions with time-coded evidence;
- a rubric `1.0.0` pilot result of `B · 85/100`, with every dimension rated `3 — Ready`;
- a matching `delivery.json`, readable `eval-report.md`, machine-readable `eval-report.json`, and normalized `blind-review.json`.

Rubric `1.1.0` adds criterion-specific anchors, playback qualification, an inconclusive outcome for missing reviewer capability, and mandatory independent agreement for near-threshold or critical-floor passes. The older public proof remains labeled with the exact rubric version that judged it; it is not silently regraded.

## Calibration evidence

- **Frozen finale:** a controlled 34–43 second freeze failed only `finaleMotionContinuity`; all four panel detectors reported a freeze event. Failed inspections now preserve their quality and eval reports before stopping.
- **Missing audio:** a video-only copy failed the audio, countdown-beep, dance-music, and dialogue gates while preserving the other twelve results.
- **Hidden captions:** an opaque caption-lane obstruction passed all deterministic gates, then a blind review dropped Reels composition from `3` to `0`, edit flow from `3` to `2`, and the total from `85` to `72.75`. Unrelated dimensions stayed unchanged, proving why audiovisual judgment is required.
- **Tampered or stale evidence:** packet content, packet ID, video hash, rubric version, timestamp, criterion set, confidence, and time ranges are validated before a score is accepted.
- **Unqualified judges:** reviewers without moving-video or audio perception are recorded as inconclusive and replaced; their limitation is never counted as a video defect.
- **Near-threshold disagreement:** the runtime requires a second independent reviewer from 85–90 or at a critical floor, records exact/within-one agreement and mean absolute rating difference, never averages scores, and blocks unresolved disagreement for adjudication.

The detailed protocol, acceptance thresholds, and primary research are in `EVALUATION-FRAMEWORK.md`.

## Runtime and clean-room proof

- `npm run check` runs the Dance Off contracts and the bundled motion-foundation contracts through the same package boundary.
- `npm run smoke` renders a real 1080 × 1920, 47-second H.264/AAC MP4, then measures timing, audio windows, motion continuity, closing motion, and the replay seam.
- `npm run build:kit` ships both official Repos as one npm workspace and records the ZIP SHA-256 beside the artifact.
- Clean extraction must install without the source workspace, pass both test suites, render the smoke MP4, and expose the review packet before the artifact is considered releasable.

## Delivery rule

`inspect` must pass all technical gates and create the hash-bound blind packet. `finalize` accepts only a complete compatible blind review. It delivers `final.mp4` only when the blind score reaches 85, no critical floor fails, reviewer capability is complete, and any required second review agrees. Otherwise it preserves evidence and stops.
