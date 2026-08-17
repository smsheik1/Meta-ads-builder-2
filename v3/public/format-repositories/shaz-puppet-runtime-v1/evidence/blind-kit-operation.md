# Blind packaged-kit operation

Date: 2026-08-17

The reviewer received only the downloadable ZIP and its expected checksum. It did not inspect the source worktree, git history, earlier runs, or prior proof outputs.

- ZIP SHA-256: `53ea3af10285b7beed2ff4f7f2cdcdd4184e00b808bc0eb60fc93c711781155a`
- Install, check, smoke, and all 20 tests: pass
- Fresh sequence: `confident → look-at-phone → think → facepalm-frustrated → idea → excited-celebration`
- Input SHA-256: `55f1f55579fb8749e7e8a8994620bba16a8bc156f1cecd76ce02e54f01a55e31`
- Output SHA-256: `13a9f2ba0580d9308a62247982f620fe1ac86f686ecf246d19f1e9f34c8f55c3`
- Output: 302 frames, 12.583 seconds, 1280 × 720, H.264, yuv420p, 24 fps
- All six independent pose inspections: pass
- Provider calls: 0
- Cost: $0
- `artistRenderedFramesUsed`: false

The reviewer could inspect the packaged contact sheet and a denser two-frame-per-second sheet but could not honestly perceive the entire animation continuously. It left `human-review.json` pending. Finalization correctly exited with a blocking error and did not create `delivery.json`.

Archive audit found no `node_modules`, run payloads, download payloads, source archives, video/audio payloads, or absolute operator/temp paths. Empty `agent-runs/` and `downloads/` scaffolds remain intentionally.

Verdict: clean mechanical/package pass; correctly not finalized without legitimate full-motion creative review.
