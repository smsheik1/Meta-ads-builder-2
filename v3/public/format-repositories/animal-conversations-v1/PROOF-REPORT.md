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
- Output SHA-256: `133d87e1d4a83efbf7a245648f76027eb0ca46879dcd26169b357c30d0885593`
- Automated result: pass at 1080x1920, 24 fps, H.264/AAC, mean audio -18.5 dB, 14 captioned beats
- Direct visual review: the regenerated contact sheet was inspected at original resolution. In every two-shot the left-side bunny faces right and the right-side cat faces left; their faces converge toward the frame center. Complete colored characters, captions, unchanged close-ups, mouth states, and the reaction beat remain visible.
- Audio evidence: codec, duration, stream presence, and mean level passed automated inspection. No claim of directly hearing or judging intelligibility is made from player controls or metadata.

## Variation proof

- Run: `agent-runs/sample-backyard` (ignored local evidence)
- Variation: identical user audio and timing with the packaged `backyard` background
- Output SHA-256: `33dcf32e6880bc894e740d8547222936c100bf2b3551b7a6b75983843fb96b10`
- Result: every automated gate passed; direct contact-sheet inspection confirmed inward-facing two-shots and that the replaceable background flows through the same renderer without changing character, caption, or camera behavior

## Two-shot orientation fix

- Observed failure: both source poses retained their original left-facing orientation, so the bunny faced out of frame when placed on the left.
- Root cause: the two-shot layout encoded position and scale but no facing direction, and the original visual review did not include an explicit inward-facing criterion.
- Smallest fix: horizontally mirror the bunny only while preparing `two-shot` assets. Cat and bunny close-ups preserve their original orientation.
- Guardrail: the runtime test asserts that only the left-side two-shot bunny has `mirrorX` enabled; the composition and quality contracts now require inward-facing conversation staging.
- Evidence: smoke, living-room, and backyard renders use renderer version 3; all automated gates pass and all three regenerated contact sheets show the two-shot characters facing each other.

## Audio-first decision

The reference MP4 container reports 31.251202 seconds, while its extracted AAC stream measures 31.137007 seconds. The proof timeline intentionally ends at the measured audio duration because the reusable format accepts user audio, not source video. Validation rejects a timeline that follows container length instead of audio length by more than 0.08 seconds.

## Packaged handoff

`npm run build:kit` produced a ZIP without `node_modules`, generated runs, Cargo targets, or local audio. A fresh extraction under `/private/tmp` completed `npm install`, all eight Node tests, the Rust decoder test, `npm run check`, and the full free smoke command successfully. The final ponytail simplicity audit found no speculative abstraction or dependency to remove.
