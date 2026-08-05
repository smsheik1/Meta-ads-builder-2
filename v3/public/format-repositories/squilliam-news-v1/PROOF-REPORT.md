# Squilliam News proof report

## Format boundary

The fixed Format is the rigged anchor, studio, camera, presenter-derived gesture system, desk-safe arm retargeting, mouth-bone lip sync, ten monitor layouts, 30-second timeline, renderer, and quality gates. Replaceable content is the promotion script, facts, ticker, slide copy, story images, pronunciation overrides, provenance, and approved narration.

## Proof 1 — We The Artists

- Input: a live-art, music, visual-art, and spoken-word event in Indianapolis.
- Output: `examples/we-the-artists/evidence/final.mp4`.
- Result: finalized after automatic inspection and the user's earlier creative approval.
- Automatic evidence: exact 30.000 seconds, 1280×720, 30 fps, one AAC stream, no detected black segment, no interior silence over 0.6 seconds, and a 0.899-second intentional final hold.
- Runtime fingerprint: recorded in `examples/we-the-artists/evidence/quality-report.json` and `finalization.json`.

## Proof 2 — Wiggly Format Lab

- Input: a software-format promotion with synthetic instruction, renderer, and evidence graphics; no event imagery or Indianapolis facts.
- Output: generated and mechanically inspected in `agent-runs/wiggly-format-lab-proof`.
- Result: automatic checks pass; human creative review is still required before finalization.
- Portability failure found: a longer monitor eyebrow clipped in attempt one. A shared measured-text fitting rule fixed it, and attempt two passed visual and automatic inspection without proof-specific renderer code.

## Attempt and provider record

- Each run is capped at three render attempts and records its state.
- The We The Artists narration was supplied as approved audio, so its Repo runs made no provider call.
- Wiggly Format Lab used one explicitly authorized Fish Audio `s2.1-pro-free` call. The run stores a sanitized receipt with model, timestamp, content hash, output byte count, and a one-way voice-reference fingerprint; it stores no API key or private voice model ID.
- Fish Audio's official published free window was checked on August 4, 2026 and is recorded in `requirements.json`; later users must recheck it.

## Shared-standard decision

No new universal Wiggly rule is proposed. The general lessons—separate content from runtime, inspect final media, and derive timing from actual audio—already exist in the shared standard. Text fitting and resumable browser-frame caches remain Format-specific evidence.
