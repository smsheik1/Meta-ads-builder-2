# Review-only pose candidates

Files here are exact rig-native recipe bytes recovered or authored for the promotion pipeline in `../../POSE-PROMOTION.md`. They are deliberately absent from `../index.json`.

That distinction is a gate, not bookkeeping:

- a file here may be rendered and inspected through the official rig runtime;
- it may not be selected by `runner.mjs` or a blind agent;
- it is not sequence-approved merely because inspection passes; and
- it cannot become a motion packet until its entry, hold, and release pass their own exact-output review.

| Candidate | Recipe | File SHA-256 | Semantic recipe SHA-256 | Status |
| --- | --- | --- | --- | --- |
| 09 — Low side-present / explain | `low-side-present.json` | `53fd11c8850ec7514b01ecee6627adc2cd357e2d00132d6a95e3120bcfb77447` | `e0bbd203cddc26966e8555ee0c3ac3d36f4103c8e2797a1080195683ab5a339e` | `recipe-candidate`; mechanically clean, creative review pending |
