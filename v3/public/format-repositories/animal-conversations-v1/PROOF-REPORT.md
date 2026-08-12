# Animal Conversations proof report

## Converter proof

The Harmony-free converter generated complete colored cat and bunny idle poses plus mouth-open and blink substitutions from the supplied Toon Boom projects. Converter tests assert the complete 12-layer order, exact palette recovery, source PEG placement, detached bunny fill nodes, expression drawing substitutions, transparent borders, and required opaque interior points. The six packaged character PNGs are checksum-bound in `assets.json`; each has a colocated conversion receipt.

## Character-fill failure and fix

- Observed failure: the bunny's dark-pink head shadow was transparent in every packaged pose. The close-up camera mirrors the pose, so the missing region appeared on the left side of the on-screen head and exposed the background curtain.
- Root cause: the `Head-1.tvg` dark-pink paint seed (`0b6d656fc8edfc85`) resolved from boundary 11 side 0 to no enclosed region. The only previous required opacity point sampled the torso, so conversion incorrectly passed.
- Smallest fix: bind that seed to boundary 11 side 1 in the bunny manifest and regenerate idle, blink, and mouth-open through the official converter. The recovered region contains 596,695 source-render pixels and the full pose's opaque coverage rises from 0.48925 to 0.49675.
- Guardrail: conversion now checks a point inside the repaired head shadow, and tests inspect every cat/dog and bunny pose at all manifest-required head/body/tail points. A bunny-specific assertion also locks the repaired point to RGBA `[213,122,122,255]`.
- Dog/cat inspection: idle, blink, and mouth-open were regenerated against expanded head/body/tail opacity points without changing their existing PNG hashes. High-contrast pose sheets, supplied-reference comparison, and two full-resolution rendered close-ups showed no analogous background leak.
- Render evidence: smoke and both 31.137-second supplied-audio proofs passed. Exact living-room close-ups at 3.0, 11.5, 17.0, and 25.0 seconds were inspected at full resolution; both bunny talking/idle frames have a complete head shadow and both blue dog/cat frames remain fully colored.

## Free smoke proof

- Run: `agent-runs/smoke-proof` (ignored local evidence)
- Input: 4.5-second locally synthesized tone and three timed beats
- Coverage: two-shot, cat-close, bunny-close; `both`, `cat`, and `bunny` speaker modes; generated per-beat review clips and an audio-bound assignment receipt
- Result: pass at 1080x1920, 24 fps, H.264/AAC, audible audio, confirmed speaker assignment, and visible captions
- Purpose: prove the explicit speaker-review gate, all camera layouts, speaker pose switching, muxing, inspection, and contact-sheet generation without a provider call

## Supplied-sample proof

- Run: `agent-runs/sample-living-room` (ignored local evidence)
- Input audio SHA-256: `226ffe78af88c77175c0358d4ab85360eb3eac43b185e29b1a92ff2e58517657`
- Measured input duration: 31.137007 seconds
- Timeline: 15 contiguous beats; all three approved cameras and all four speaker modes. Fourteen spoken beats were explicitly confirmed from the supplied reference video's speaker-colored captions and mouth motion; the silent reaction was confirmed separately.
- Output SHA-256: `d13750a91a2e37e1c8b54d15cf5f4342a6c9d58ef5b6aa85d918e775675bb5bb`
- Automated result: pass at 1080x1920, 24 fps, H.264/AAC, mean audio -18.5 dB, 14 captioned beats
- Direct visual review: the regenerated contact sheet was inspected at original resolution, the full 31-second render was scanned at one-second intervals, and dense transition sheets were inspected across 7.4-11.1 and 21.8-24.6 seconds. The disputed `No judging`, `We listen`, and `We're just listening` beats now use the cat caption color and cat mouth while the bunny remains a listener. The silent 27.9-28.8 reaction now uses the reference-matched cat close-up. Staging and bunny-only orientation remain correct.
- Audio evidence: codec, duration, stream presence, and mean level passed automated inspection. No claim of directly hearing or judging intelligibility is made from player controls or metadata.

## Variation proof

- Run: `agent-runs/sample-backyard` (ignored local evidence)
- Variation: identical user audio and timing with the packaged `backyard` background
- Output SHA-256: `25cef877fbc8d7014828b7b7df3356ff948a62616695fb93e78e80b81c63b86e`
- Result: every automated gate passed, including 15-of-15 confirmed speaker beats; direct contact-sheet inspection confirmed the corrected cat assignments and that the replaceable background flows through the same renderer without changing character, caption, or camera behavior

## Speaker-assignment failure and fix

- Observed failure: `No judging. No judging. No judging.` was assigned to the bunny, while `We listen.` and `We're just listening...` were assigned to both characters. The supplied reference identifies all three as cat lines, so the renderer animated the rabbit during cat dialogue.
- Root cause: the renderer correctly obeyed `timeline[].speaker`, but initialization and validation trusted provisional hand-authored values. No step forced the operator to check the actual user-audio beat, and no receipt proved that every assignment was current.
- Smallest robust fix: version 0.2.0 adds an explicit audio-first workflow. `init`/`review-speakers` extract one local WAV per beat; the operator records `confirmedSpeaker` and evidence; `apply-speakers` makes those values authoritative and writes a receipt bound to the user-audio SHA-256 and full speaker timeline. `validate`, `render`, `inspect`, and `finalize` reject missing or stale confirmation, and delivery also requires input-hash parity with the inspected render. Automatic diarization is deliberately not claimed.
- Guardrails: unit coverage rejects incomplete/stale reviews, verifies receipt hashes, and locks the three disputed lines to the cat. The integration proof shows an initialized but unapplied run failing validation with `Speaker assignment is unconfirmed`.
- Evidence: both supplied-audio proofs passed the new `speakerAssignmentConfirmed` inspection gate with 15 reviewed beats. Dense visual sheets show the cat talking throughout the corrected two-shot beats and the bunny remaining idle.

## Reference-aligned staging correction

- Observed failures: renderer version 3 made the two-shot characters oversized and overlapping, and the bunny-only camera retained the converted asset's left-facing orientation instead of the supplied sample's right-facing orientation.
- Root cause: the two-shot scale and positions were not calibrated against the supplied video, the bunny-only layout had no orientation override, and the regression test asserted only a two-shot flip flag rather than rendered spatial bounds.
- Smallest fix: reduce and reposition only the two-shot layouts, keep their inward-facing directions, and mirror the bunny in `bunny-close`. Cat layouts are unchanged.
- Guardrail: the runtime test calculates prepared widths from the packaged character pixels, requires at least 120 pixels between two-shot bounds, requires the cat to remain inside the canvas, and asserts the layout-specific bunny orientation. Composition and quality contracts require separation and the reference-matched bunny-only direction.
- Evidence: smoke, living-room, and backyard renders use renderer version 4. All automated gates pass. Original-resolution contact sheets show all three angles, while the one-second full visual scan and exact living-room frames confirm the correction throughout the 31-second output.

## Audio-first decision

The reference MP4 container reports 31.251202 seconds, while its extracted AAC stream measures 31.137007 seconds. The proof timeline intentionally ends at the measured audio duration because the reusable format accepts user audio, not source video. Validation rejects a timeline that follows container length instead of audio length by more than 0.08 seconds. Speaker identity is also bound to the extracted user-audio checksum, so replacing the file invalidates the assignment receipt.

## Packaged handoff

`npm run build:kit` produced a version 0.2.1 ZIP without `node_modules`, generated runs, Cargo targets, local audio, or speaker-review clips. A fresh extraction under `/private/tmp` completed `npm install`, all thirteen Node tests, the Rust decoder test, `npm run check`, and the full free smoke command successfully. The packaged smoke generated and applied a current speaker-assignment receipt before rendering; original-resolution contact-sheet inspection confirmed all three camera/character modes and the repaired bunny head. The final ponytail simplicity audit found no speculative abstraction or dependency to remove.
