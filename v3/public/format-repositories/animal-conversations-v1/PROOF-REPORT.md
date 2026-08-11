# Animal Conversations proof report

## Converter proof

The Harmony-free converter generated complete colored cat and bunny idle poses plus mouth-open and blink substitutions from the supplied Toon Boom projects. Converter tests assert the complete 12-layer order, exact palette recovery, source PEG placement, detached bunny fill nodes, expression drawing substitutions, transparent borders, and required opaque interior points. The six packaged character PNGs are checksum-bound in `assets.json`; each has a colocated conversion receipt.

## Free smoke proof

- Run: `agent-runs/smoke-proof` (ignored local evidence)
- Input: 4.5-second locally synthesized tone and three timed beats
- Coverage: two-shot, cat-close, bunny-close; `both`, `cat`, and `bunny` speaker modes
- Result: pass at 1080x1920, 24 fps, H.264/AAC, audible audio, visible captions
- Purpose: prove validation, all camera layouts, speaker pose switching, muxing, inspection, and contact-sheet generation without a provider call

## Supplied-sample proof

- Run: `agent-runs/sample-living-room` (ignored local evidence)
- Input audio SHA-256: `226ffe78af88c77175c0358d4ab85360eb3eac43b185e29b1a92ff2e58517657`
- Measured input duration: 31.137007 seconds
- Timeline: 15 contiguous beats inferred from the supplied sample's visible captions; all three approved cameras and all four speaker modes
- Output SHA-256: `116ee3bd2d01cedb982dfe266ea8d6d22ad724a272096a0c93cc0933a1dea22e`
- Automated result: pass at 1080x1920, 24 fps, H.264/AAC, mean audio -18.5 dB, 14 captioned beats
- Direct visual review: the regenerated contact sheet was inspected at original resolution, the full 31-second render was scanned at one-second intervals, and exact frames were inspected at 0.8, 6.9, and 24.5 seconds. Every two-shot has a clear gap with the bunny facing right and the cat facing left. Both bunny-only appearances face right with the tail on the left. Complete colored characters, captions, mouth states, and the reaction beat remain visible.
- Audio evidence: codec, duration, stream presence, and mean level passed automated inspection. No claim of directly hearing or judging intelligibility is made from player controls or metadata.

## Variation proof

- Run: `agent-runs/sample-backyard` (ignored local evidence)
- Variation: identical user audio and timing with the packaged `backyard` background
- Output SHA-256: `c6dba746eba7aadfc89fca47bd236905bc10aa5802ef86578b5d63d13ca28e2b`
- Result: every automated gate passed; direct contact-sheet inspection confirmed separated inward-facing two-shots, the corrected bunny-only orientation, and that the replaceable background flows through the same renderer without changing character, caption, or camera behavior

## Reference-aligned staging correction

- Observed failures: renderer version 3 made the two-shot characters oversized and overlapping, and the bunny-only camera retained the converted asset's left-facing orientation instead of the supplied sample's right-facing orientation.
- Root cause: the two-shot scale and positions were not calibrated against the supplied video, the bunny-only layout had no orientation override, and the regression test asserted only a two-shot flip flag rather than rendered spatial bounds.
- Smallest fix: reduce and reposition only the two-shot layouts, keep their inward-facing directions, and mirror the bunny in `bunny-close`. Cat layouts are unchanged.
- Guardrail: the runtime test calculates prepared widths from the packaged character pixels, requires at least 120 pixels between two-shot bounds, requires the cat to remain inside the canvas, and asserts the layout-specific bunny orientation. Composition and quality contracts require separation and the reference-matched bunny-only direction.
- Evidence: smoke, living-room, and backyard renders use renderer version 4. All automated gates pass. Original-resolution contact sheets show all three angles, while the one-second full visual scan and exact living-room frames confirm the correction throughout the 31-second output.

## Audio-first decision

The reference MP4 container reports 31.251202 seconds, while its extracted AAC stream measures 31.137007 seconds. The proof timeline intentionally ends at the measured audio duration because the reusable format accepts user audio, not source video. Validation rejects a timeline that follows container length instead of audio length by more than 0.08 seconds.

## Packaged handoff

`npm run build:kit` produced a version 0.1.2 ZIP without `node_modules`, generated runs, Cargo targets, or local audio. A fresh extraction under `/private/tmp` completed `npm install`, all eight Node tests, the Rust decoder test, `npm run check`, and the full free smoke command successfully. Original-resolution inspection of the fresh package contact sheet confirmed the separated two-shot and right-facing bunny-only view. The final ponytail simplicity audit found no speculative abstraction or dependency to remove.
