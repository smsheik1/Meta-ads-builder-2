# Squilliam News proof report

## Format boundary

The fixed Format is the verified character-pack contract, studio, camera, presenter-derived gesture system, desk-safe arm retargeting, mouth/jaw-bone lip sync, ten monitor layouts, 30-second timeline, renderer, and quality gates. Replaceable content includes the verified `characterId`, promotion script, facts, ticker, slide copy, story images, pronunciation overrides, provenance, and approved narration.

The two full promotional proofs below were freshly rendered and automatically inspected under version `0.2.0-proof`. They share current runtime fingerprint `6cfbc7b5fd32608dd4fe9afbc10bbc957f58a21d4c059c2788e2f53f25497dea` while carrying different content and video hashes. Historical v0.1 evidence remains available under each example's `evidence/history/v0.1/` directory.

## Proof 1 — We The Artists

- Input: a live-art, music, visual-art, and spoken-word event in Indianapolis.
- Current output: `examples/we-the-artists/evidence/review.mp4`.
- Result: current automatic checks pass on attempt one; fresh human creative approval is required before v0.2 finalization. The earlier finalized v0.1 output is preserved under `evidence/history/v0.1/`.
- Automatic evidence: exact 30.000 seconds, 1280×720, 30 fps, one AAC stream, no detected black segment, no interior silence over 0.6 seconds, and a 0.899-second intentional final hold.
- Runtime, content, audio, and video fingerprints are recorded in `examples/we-the-artists/evidence/quality-report.json`.

## Proof 2 — Wiggly Format Lab

- Input: a software-format promotion with synthetic instruction, renderer, and evidence graphics; no event imagery or Indianapolis facts.
- Current output: `examples/wiggly-format-lab/evidence/review.mp4`.
- Result: current automatic checks pass on attempt one; human creative review is still required before finalization.
- Historical portability failure: a longer monitor eyebrow clipped in the first v0.1 attempt. A shared measured-text fitting rule fixed it without proof-specific renderer code; the current v0.2 proof passed on its first attempt.

## Attempt and provider record

- Each run is capped at three render attempts and records its state.
- The We The Artists narration was supplied as previously approved audio, so the current run made no provider call.
- Wiggly Format Lab recovered its narration locally from the historical v0.1 review. The current run made no provider call. The earlier explicitly authorized Fish Audio `s2.1-pro-free` receipt is retained under `evidence/history/v0.1/` and stores no API key or private voice model ID.
- Each example's `narration-source.json` binds the packaged audio and current render audio to hashes and records zero provider calls for the v0.2 run.
- Fish Audio's official published free window was checked on August 4, 2026 and is recorded in `requirements.json`; later users must recheck it.

## Shared-standard decision

No new universal Wiggly rule is proposed. The general lessons—separate content from runtime, inspect final media, and derive timing from actual audio—already exist in the shared standard. Text fitting and resumable browser-frame caches remain Format-specific evidence.

## Character-pack proof — version 0.2

- Verified selectors: `squilliam`, `squidward`, `spongebob`, and `mr-krabs`.
- Every selector validated and rendered the same 900-frame motion plan through `runtime/renderer/app.js`.
- Nine representative source frames per character were encoded into a smoke video and contact sheet.
- Media hashes, content hashes, the current runtime hash, and admission checks are recorded in `evidence/character-packs/quality-report.json`.
- Patrick, Sandy, Larry, Man Ray, Announcer Fish, and Gary were deliberately excluded; `CHARACTER-AUDIT.md` records the reason for each.

## Historical blind-agent handoff — version 0.1

A fresh agent received only the packaged v0.1 ZIP and the desired We The Artists outcome. It installed dependencies, ran smoke and requirements checks, initialized the supplied example, validated, rendered, inspected, and finalized on attempt one of three without editing the renderer or calling a provider. Its final MP4 SHA-256 was `966b601ebc40e1fed8724fdcb7c843fb027c56d950eb8e4dabafe54d9757dcd8`, exactly matching the historical v0.1 final. Receipts are retained under `evidence/blind-handoff/history/v0.1/`.

## Current blind-agent handoff — version 0.2

A second fresh agent received only the current packaged ZIP and the desired We The Artists review outcome. It clean-installed dependencies, ran smoke and checks, initialized and validated the example, rendered and inspected all 900 frames, played the actual MP4 in Chrome, and stopped at the required human-review gate on attempt one of three. It made zero provider calls and its renderer hash was unchanged. Its returned video hash `75bdafa54f867ed1ce4e62de955f84b96b083c39384b89561aeea7265fcd138d` is byte-for-byte identical to the independently rendered current proof. Receipts are under `evidence/blind-handoff/v0.2/`; finalization correctly remains pending human approval.
