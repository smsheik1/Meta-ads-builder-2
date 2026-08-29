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
| 04 — Open wide | `open-wide.json` | `b75de5d2367198174dd0dc035a1fd1777fd8717a05edd889a02447163a9231d7` | `750990adc52d4bcf8300610b9d613f1f9d70d6f841a3013c6f4d5e621091f63f` | `recipe-candidate`; mechanically clean, creative review pending; setup/release are not exact neutral boundaries |
| 06 — Present screen-left | `present-screen-left.json` | `b01a461b0b292533e3f02c9ecb60fce936ac279b8d82d71a1b417522f9df8635` | `eabcb4284ef53ef747bbcd33fab6d5c6e24ede69ddd7a4eda59fc1ba70072098` | `recipe-candidate`; neutral stage registration, native left-arm source action, mechanically clean, creative review pending; no authored release |
| 08 — Heartfelt chest-clasp hold | `heartfelt-chest-clasp-hold.json` | `2e83aad0b5cef792d0d6ad2e3101c19591677392d58c385c5f5a961ffd09a8fa` | `3cc65e5a1a59cdb0ec725b5d9e97ca1ba863a49e83a1280e2e9b614f16a670b7` | `recipe-candidate`; third bounded native-rig pass, mechanically clean, exact-output creative review pending; hold-only with no authored entry or release |
| 09 — Low side-present / explain | `low-side-present.json` | `53fd11c8850ec7514b01ecee6627adc2cd357e2d00132d6a95e3120bcfb77447` | `e0bbd203cddc26966e8555ee0c3ac3d36f4103c8e2797a1080195683ab5a339e` | `recipe-candidate`; mechanically clean, creative review pending |
| 10 — Big emphasis | `big-emphasis.json` | `215ee59e14b13489846f0905e9fa214409174ac8ecec52f325232a7c93cbc23f` | `24032ac06b54cedc3f7790ebdf1c09a5e4bd1480cbcab38a8af420b2899a7520` | `recipe-candidate`; third bounded native-rig silhouette pass, mechanically clean, creative review pending |
| 11 — Present screen-right | `present-screen-right.json` | `76f99ac7e90d678df5c87a2b0126a93b2d1a18934315f600cf42c96c5ac55525` | `8d6d883074e9d1f0da720ba1b6fc658c482a6afe18880e69c757a7793b948cbf` | `recipe-candidate`; native right-arm entry/hold/release, mechanically clean, creative review pending |
