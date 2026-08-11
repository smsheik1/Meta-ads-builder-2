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
- Output SHA-256: `a0a43dfbe6a1cc36b62057e1e5f42688e56e5292c440348388d29560836769cc`
- Automated result: pass at 1080x1920, 24 fps, H.264/AAC, mean audio -18.5 dB, 14 captioned beats
- Direct review: contact sheet inspected at original resolution; complete colored characters, captions, close-ups, two-shots, mouths, and reaction beat are visible. A full QuickTime playback completed with sound enabled and volume at 1.0; the midpoint and final frames matched the expected active cat captions/cameras and playback reached 31.125 seconds without stalling.

## Variation proof

- Run: `agent-runs/sample-backyard` (ignored local evidence)
- Variation: identical user audio and timing with the packaged `backyard` background
- Output SHA-256: `e07e3139615f5460bfd82fe78bdf8cd335d9bcd12e7f42a62289c323746f1320`
- Result: every automated gate passed; direct contact-sheet inspection confirmed the replaceable background flows through the same renderer without changing character, caption, or camera behavior

## Audio-first decision

The reference MP4 container reports 31.251202 seconds, while its extracted AAC stream measures 31.137007 seconds. The proof timeline intentionally ends at the measured audio duration because the reusable format accepts user audio, not source video. Validation rejects a timeline that follows container length instead of audio length by more than 0.08 seconds.

## Packaged handoff

`npm run build:kit` produced a ZIP without `node_modules`, generated runs, Cargo targets, or local audio. A fresh extraction under `/private/tmp` completed `npm install`, all seven Node tests, the Rust decoder test, `npm run check`, and the full free smoke command successfully. The final ponytail simplicity audit found no speculative abstraction or dependency to remove.
