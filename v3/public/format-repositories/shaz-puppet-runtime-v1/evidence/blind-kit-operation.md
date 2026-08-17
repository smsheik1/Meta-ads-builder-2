# Blind packaged-kit operation

Date: 2026-08-17

The reviewer received only the downloadable ZIP and its expected checksum. It did not inspect the source worktree, git history, earlier runs, or prior proof outputs.

- ZIP SHA-256: `606b900051c9ee4a551bf07a877b2887155884b9cbc95f375eeb3cfc2bd99865`
- Install, check, smoke, and all 20 tests: pass
- Fresh sequence: `look-at-phone → confident → facepalm-frustrated → point-at-screen → shrug → arms-crossed-skeptical → excited-celebration`
- Input SHA-256: `f3879aedf235230f170b10aef23aeaa51d0cc746772a5a1e1a98853cf9b37e22`
- Output SHA-256: `c52dfa421ddfc876f1052134d96905e9d552ab54817a4c76fcf9330cf8937840`
- Contact-sheet SHA-256: `b36a615abed9d7c30d0c1f7f5562884c4f742457a44132322f599ee1d86215c7`
- Output: 334 frames, 13.916667 seconds, 1280 × 720, H.264, yuv420p, 24 fps
- All seven independent pose inspections: pass
- Provider calls: 0
- Cost: $0
- `artistRenderedFramesUsed`: false

The reviewer left `human-review.json` pending because the exact output still requires the user's continuous-motion visual approval. Finalization correctly exited with a blocking error and did not create `delivery.json`.

The 300-entry archive passed integrity and exclusion audits with zero `node_modules`, run or download payloads, source archives, golden entries, proof media, standalone audio/video, excluded compiler files, git metadata, path traversal, or absolute/operator/temp paths. Empty `agent-runs/` and `downloads/` scaffolds remain intentionally.

Verdict: clean mechanical/package pass; correctly not finalized without legitimate full-motion creative review.
