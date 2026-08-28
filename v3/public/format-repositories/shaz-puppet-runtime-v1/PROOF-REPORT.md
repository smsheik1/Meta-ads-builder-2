# Shaz Puppet Runtime proof

Format version: 0.2.0

## Runtime proof

- Source Xstage SHA-256: `507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca`
- Compiled rig assets verified: 210
- Registered pose recipes: 14
- Automated tests: 105 passing, including bundled-engine parity, cue provenance, tamper rejection, audio-backed rendering, and fixed-stage framing
- Registry-wide inspection: all 14 registered actions, 461 recipe frames, zero failures
- Official smoke: 58 frames, 2.416667 seconds, validation/render/inspection/finalization passing
- Current audio-backed talking proof: 288 frames, 12.0 seconds, 1280 × 720, H.264 + AAC, exact output SHA-256 `59cef6b0910a9d7f8dfe342c0602e8f1921ec6c837fe0fb26c8d5510fd1d2edf`
- Talking-proof lip-sync: 100 bundled Cherry WASI cues mapped to five recovered mouth drawings; source audio SHA-256 `37648e2e0b4c37d22ec529b4301c8abd9435f92ce641c804e521e5b3bdd23f1b`; cue SHA-256 `6a6d5604461dfe9aadc40ab3bf5f7b5171c64e674c95384c58275294ee32820d`
- Talking-proof inspection: all six used pose recipes passed, full-stream audio/video decode passed, fixed Sisters Room background, zero camera motion, zero provider calls
- Five recreated artist-authored actions: 242 frames, 10.083333 seconds, output SHA-256 `8a5183154aaefb9a844d3bd8be48170e7576986f0d0717de5243057c2ea435ae`
- Five-action mechanical inspection: Present, Think, Ah-ha, Point, and Confident passed all 170 recipe frames with zero failures
- Legacy Format 0.1.0 ten-action golden: 504 frames, 21.0 seconds, 1280 × 720, H.264, yuv420p, 24 fps; retained as pending-review history rather than current certification
- Current ten-action fixture: 512 frames, 21.333333 seconds under the pre-Cherry 0.1.2 runtime; it is not represented by the legacy golden
- Current alternate fixture: 191 frames, 7.958333 seconds, four actions in a different order and with different holds
- Historical blind ZIP-only proof: 334 frames, 13.916667 seconds, seven independently chosen actions; it proves an older archive could operate independently, but does not certify the current 0.2.0 ZIP
- Historical structural anatomy run: `anatomy-v8-release`, 173 frames, 7.208008 seconds, exact output SHA-256 `bcf3556ffde53beb7e9efe989bd7e26655b0a2f3a23a5e80ed63f334d0edc9f9`. Its mechanical checks passed, but the user later rejected its visible poses; it is not the public showcase or current creative proof.
- Provider calls: 0
- Cost: $0
- Finished artist-rendered frames used by runtime or generation: false

## Format 0.2.0 bundled Cherry 0.1.0 proof boundary

Audio-backed `shaz-sequence-input-v1` initialization now generates Cherry 0.1.0 cues locally through the bundled, checksum-verified WASI module by default. A supplied exact-audio TSV remains accepted, and `--lipsync=off` is the explicit audio-without-mouth-motion path. The package includes no native Cherry executable and makes no provider call. The cue-only entrypoint and sequence initializer use the same bundled engine; the existing `renderRigFrame` implementation remains the only character renderer.

The separate `shaz-body-language-performance-v1` semantic performance path remains body-language-only in Format 0.2.0. Its audio determines duration and event scheduling but does not auto-generate or apply mouth cues.

Fresh-package proof passed from a sealed extraction with no supplied cue TSV. Install, all tests, `check`, registry inspection, and smoke passed before two meaningfully different speech inputs completed `init → validate → render → inspect` through the bundled WASI engine. Both videos decoded completely and reported zero mechanical failures. The exact run receipts are recorded in `evidence/bundled-cherry-wasi-proof.md`; creative approval remains intentionally separate from this mechanical package certification.

## Creative review status

The user selected the exact 12-second audio-backed result for the main Repo-page video after describing it as very good for a first draft. That is positive first-draft feedback, not a claim of final perfection. The persisted checksum-bound `human-review.json` remains `pending`, so the page presents the clip as a working talking proof and does not claim final creative certification.

Present, Think, Ah-ha, and Point each have checksum-bound direct user approval. After Confident passed synchronized frame-level comparison and a fresh-package render/inspection audit, the user explicitly delegated autonomous visual acceptance and instructed the agent to finish without pausing while the user slept. The agent replayed both the exact Confident approval artifact and the complete five-action runtime video from their starts through `ended=true`. The authorization record does not claim that the user personally watched Confident.

For `anatomy-v8-release`, Codex previously acted under standing delegation and recorded a review under its own name. The user's later direct visual rejection supersedes that delegated acceptance for public-showcase purposes.

The rich Repo page remains testable but intentionally stays off the main Discovery shelf until the current talking proof receives exact-checksum final creative approval. That publication gate is independent of this completed, reusable package.

The ZIP does not bundle the source archive, finished artist renders, agent runs, downloads, or `node_modules`.
