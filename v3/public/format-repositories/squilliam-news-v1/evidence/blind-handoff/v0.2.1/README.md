# Blind-agent handoff — version 0.2.1

A fresh agent received only archive `d6526546e1cbdc95f26c3268419ca643f2c3d3bba5eaec68a93551138016fdfa` and the desired outcome: reproduce the packaged We The Artists thirty-second review through the official runtime, inspect Squilliam's repaired eye art closely, and stop at the human-review gate.

The agent installed the declared dependencies, ran all 14 contract tests, smoke and requirement checks, initialized from the packaged example, validated, rendered, automatically inspected, and played the actual MP4 in packaged Chrome/Playwright. It used attempt 1 of 3, made zero provider calls, and did not change the renderer or run `finalize`.

The agent sampled 3.90, 4.00, 4.10, 28.85, 28.95, and 29.05 seconds plus one sample per second across the full video. Both yellow eye fields and both red pupils remained visible; no opaque cutout appeared. Mouth shapes varied, arms stayed desk-safe, and the monitor, ticker, CTA, and sign-off remained readable.

The returned review video and contact sheet are byte-for-byte identical to:

- `../../../examples/we-the-artists/evidence/review.mp4`
- `../../../examples/we-the-artists/evidence/contact-sheet.png`

They are not stored twice. `handoff-receipt.json`, `state.json`, `validation.json`, and `quality-report.json` preserve the archive identity, gates, attempt, hashes, and inspection result.
