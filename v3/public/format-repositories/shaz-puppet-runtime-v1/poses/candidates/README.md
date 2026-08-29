# Review-only pose candidates

Files here are exact rig-native recipe bytes recovered or authored for the promotion pipeline in `../../POSE-PROMOTION.md`. They are deliberately absent from `../index.json`.

That distinction is a gate, not bookkeeping:

- a file here may be rendered and inspected through the official rig runtime;
- it may not be selected by `runner.mjs` or a blind agent;
- it is not sequence-approved merely because inspection passes; and
- it cannot become a motion packet until its entry, hold, and release pass their own exact-output review.

| Candidate | Recipe | File SHA-256 | Semantic recipe SHA-256 | Status |
| --- | --- | --- | --- | --- |
| 02 — Hand to chest / self | `hand-to-chest-self.json` | `3267363d573ddd4264f94814f4995cdd9df7e5c1fb7f027eecd646626149a0a1` | `06ccfc1834b7978a9e2eef22be0397603f1af97d896c4a20b705e5882f370d64` | `blocked`; three-candidate ceiling reached, frames 3–27 fail the unchanged 0.56 hand/sleeve proportion gate; resume with an authorized exact 3% right-wrist scale reduction |
| 08 — Heartfelt chest-clasp hold | `heartfelt-chest-clasp-hold.json` | `41b5e2befdfd4c6ac47430503cc502cc9bf0c340edfddbc41d06fa1e283bbb8a` | `0291e18c3e7a848c0a5f6b8c432a470c7319f627451032958a289192d39d8dce` | `recipe-candidate`; third bounded native-rig pass, mechanically clean, exact-output creative review pending; hold-only with no authored entry or release |
| 09 — Low side-present / explain | `low-side-present.json` | `53fd11c8850ec7514b01ecee6627adc2cd357e2d00132d6a95e3120bcfb77447` | `e0bbd203cddc26966e8555ee0c3ac3d36f4103c8e2797a1080195683ab5a339e` | `recipe-candidate`; mechanically clean, creative review pending |
| 10 — Big emphasis | `big-emphasis.json` | `215ee59e14b13489846f0905e9fa214409174ac8ecec52f325232a7c93cbc23f` | `24032ac06b54cedc3f7790ebdf1c09a5e4bd1480cbcab38a8af420b2899a7520` | `recipe-candidate`; third bounded native-rig silhouette pass, mechanically clean, creative review pending |
