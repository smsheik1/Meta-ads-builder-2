# Bikini Bottom Dance Off Wiggly Repo proof

Format version: `0.15.0`
Current rubric: `1.1.1`

## What is packaged

- The official character renderer and retargeter, 22 verified motion-ready character profiles, 25 normalized starter motions, local motion import, the 9:16 compositor, four selectable outer backgrounds, the Fish News panel background, inspection, and delivery. Nineteen characters have approved Fish Audio presets; Agent P, Man Ray, and Batman Beyond stay explicitly voice-pending because no credible model was found.
- The song, script, cast order, colors, outer background, and solo/finale/reaction assignments remain episode inputs.
- Fish Audio is the only runtime provider and remains approval-gated. Mixamo is an operator-time source for local Collada import, not a runtime API.

The machine-readable boundary is `content-boundary.json`.

Version `0.10.8` retains all four user-approved Fish Audio voice references and the package-owned cross-agent entrypoint. It enlarges the four-character stage, removes the crop-like handoff flash, uses maximum-compatibility H.264 delivery settings, holds the complete winner CTA for more than five seconds, and gives the replay countdown enough screen time to register. It also counts only completed videos against the render-attempt budget, uses deterministic single-threaded H.264 encoding to prevent isolated transition-frame corruption, and packages the proof render report used by the public page. The finished-video proof below remains the archived `0.9.1` calibration proof and is labeled accordingly.

Version `0.12.0` consumed the completed Character Dance Lab 51-archive, one-character-at-a-time audit. Eighteen new rigs passed two individually reviewed dances, producing 22 motion-ready characters total; 29 archives remain rejected with exact evidence. The discovery roster and its clean interactive previews are generated from that same shared catalog, so later accepted characters cannot silently fall back to a different card style.

Version `0.13.0` completes the separate Fish Audio discovery pass. It skips six voices already registered elsewhere in the project, searches the remaining 15 identities one at a time, records the user's ten explicit duplicate-model choices, accepts the two unambiguous matches, and preserves three honest no-match results. The curated audit ships; the raw API dump, API key, and local receipts do not.

Version `0.14.0` turns those approved references into fixed public card previews. Nineteen short Fish clips and one original nonverbal Agent P cue are packaged with exact text, duration, bytes, and SHA-256 provenance. One shared browser player stops the previous card before starting another. Man Ray and Batman Beyond remain visibly disabled after follow-up actor-name searches also found no credible match; the page never invents a voice or calls the provider at playback time.

Version `0.15.0` repairs four character-card previews through the same
declarative character catalog and shared renderer. Sandy's eye and lash
materials use alpha cutouts; Mario's two alternate closed-lid meshes are
excluded after a rejected repositioning comparison; Sonic's existing facial
bones receive a protected open-eye rest pose; and Larry's Y-up source no longer
receives the shared Z-up pitch correction. The page also bounds vertical orbit
while preserving horizontal rotation. Committed before/after images and
Larry's default/rotated browser proof live in the motion Repo's
`evidence/character-preview-repairs/` directory.

## Two independent format fixtures

1. `fixtures/smoke/input.json` uses the original choreography and `deep-ocean` outer canvas.
2. `fixtures/alternate/input.json` replaces every solo and finale motion, changes reactions, colors, title, and outer canvas without changing runtime code.

The alternate run validated twelve explicit motion assignments with zero Mixamo calls and reused its approved local dialogue cache with zero Fish Audio calls.

## Finished-video evaluation

The public proof at `examples/wiggle-proof/evidence/final.mp4` has:

- all 16 deterministic technical gates passing;
- a hash-bound blind-review packet and preserved raw submission;
- seven independently scored creative dimensions with time-coded evidence;
- an archived rubric `1.0.0` pilot result of `B · 85/100`, with every dimension rated `3 — Ready`; this visual/caption-assisted pilot predates direct-audio qualification and is not a current shipping judgment;
- a matching `delivery.json`, readable `eval-report.md`, machine-readable `eval-report.json`, and normalized `blind-review.json`.

Rubric `1.1.1` adds criterion-specific anchors, explicit direct-perception attestation, an inconclusive outcome for missing reviewer capability, and mandatory independent agreement for near-threshold or critical-floor passes. The older public proof remains labeled with the exact rubric version and limitation of that pilot; it is not silently promoted to a current qualified judgment.

## Calibration evidence

- **Frozen finale:** a controlled 34–43 second freeze failed only `finaleMotionContinuity`; all four panel detectors reported a freeze event. Failed inspections now preserve their quality and eval reports before stopping.
- **Missing audio:** a video-only copy failed the audio, countdown-beep, dance-music, and dialogue gates while preserving the other twelve results.
- **Hidden captions:** an opaque caption-lane obstruction passed all deterministic gates, then a blind review dropped Reels composition from `3` to `0`, edit flow from `3` to `2`, and the total from `85` to `72.75`. Unrelated dimensions stayed unchanged, proving why audiovisual judgment is required.
- **Tampered or stale evidence:** packet content, packet ID, video hash, rubric version, timestamp, criterion set, confidence, and time ranges are validated before a score is accepted.
- **Unqualified judges:** reviewers without direct moving-video or audio perception are recorded as inconclusive and replaced. Player state, captions, transcripts, waveforms, metadata, and inference cannot satisfy the audio gate; reviewer limitations are never counted as video defects.
- **Near-threshold disagreement:** the runtime requires a second independent reviewer from 85–90 or at a critical floor, records exact/within-one agreement and mean absolute rating difference, never averages scores, and blocks unresolved disagreement for adjudication.

The detailed protocol, acceptance thresholds, and primary research are in `EVALUATION-FRAMEWORK.md`.

## Runtime and clean-room proof

- `npm run check` runs the Dance Off contracts and the bundled motion-foundation contracts through the same package boundary.
- `npm run smoke` renders a real 1080 × 1920, 47-second H.264/AAC MP4, then measures timing, audio windows, motion continuity, closing motion, and the replay seam.
- `npm run build:kit` ships both official Repos as one npm workspace and records the ZIP SHA-256 beside the artifact.
- Clean extraction must install without the source workspace, pass both test suites, render the smoke MP4, and expose the review packet before the artifact is considered releasable.

## Delivery rule

`inspect` must pass all technical gates and create the hash-bound blind packet. `finalize` accepts only a complete compatible blind review. It delivers `final.mp4` only when the blind score reaches 85, no critical floor fails, reviewer capability is complete, and any required second review agrees. Otherwise it preserves evidence and stops.
