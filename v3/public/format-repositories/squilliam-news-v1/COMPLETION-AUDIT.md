# Squilliam News completion audit

This audit maps the active Wiggly Repo objective to current, reviewable evidence. A row is complete only when the named artifact or executable check directly proves it.

| Objective requirement | Status | Authoritative evidence |
| --- | --- | --- |
| Work on a fresh, isolated branch | Pass | Branch `codex/feat/squilliam-news-repo`; all branch changes are under this Format root. |
| Do not integrate into `/create`, `/builder`, or `/share` | Pass | `git diff --name-only origin/main...HEAD` contains only `v3/public/format-repositories/squilliam-news-v1/**`. |
| Preserve one official renderer | Pass | `format.json` names `runtime/renderer/app.js`; `composition-contract.json` records the invariant; the test suite asserts that `runtime/renderer/` contains only `app.js` and `index.html`. |
| Separate replaceable promotion content from fixed character/studio mechanics | Pass | The boundary table in `README.md`, `input-contract.json`, `composition-contract.json`, `assets.json`, and the renderer fact-leak test. |
| Package Format-specific agent instructions | Pass | `SKILL.md` gives a complete ordered loop and explicitly forbids rebuilding the renderer. |
| Package input, output, and composition contracts | Pass | `input-contract.json`, `output-contract.json`, and `composition-contract.json`. |
| Declare tools, providers, key names, cost, and approval policy without secret values | Pass | `requirements.json`, `.env.example`, `runner.mjs check`, and the secret scan recorded in `evidence/package-smoke.json`. |
| Preserve assets and provenance | Pass | Fixed assets are listed in `assets.json`; each example and fixture has `asset-sources.json`; generated-provider evidence is sanitized. |
| Support voice and pronunciation configuration | Pass | `SQUILLIAM_VOICE_ID` remains environment-only; each `content.json` carries explicit pronunciation overrides; Fish input is phoneme encoded by the runner. |
| Provide semantic `smoke/check/init/validate/render/inspect/finalize` commands | Pass | `package.json`, `runner.mjs`, and the command-contract test; `package` is included as the archive command. |
| Provide a free local smoke test through the official renderer | Pass | Synthetic fixture plus `npm run smoke`; a clean extracted archive passed in `evidence/package-smoke.json`. |
| Prevent provider calls before validation and approval | Pass | Tests prove `--approve-provider` cannot bypass validation, missing approval cannot create a receipt, and either rejection consumes zero attempts. |
| Limit and preserve attempts | Pass | `input-contract.json` caps attempts at three; run `state.json` records attempt history; the blind proof finished on attempt one. |
| Create two meaningfully different promotional proofs through the same runtime | Pass | We The Artists uses event photography and venue facts; Wiggly Format Lab uses synthetic software-workflow diagrams. Their quality reports share runtime hash `cc7fe1bfb8dd651063b247399f2103530bfe988f02a04149a8250c0fb2394558` while content and video hashes differ. |
| Inspect real rendered media | Pass | Both proofs have playable MP4s, contact sheets, FFprobe data, silence/black/volume checks, and passing `quality-report.json` evidence. |
| Reject failed, stale, or unapproved finalization | Pass | Tests prove human approval cannot override failed inspection, stale runtime evidence is rejected, and the explicit human-review flag is mandatory. |
| Finalize human-approved real media | Pass for approved proof | We The Artists has matching `final.mp4`, `quality-report.json`, and `finalization.json`; the blind package run independently finalized the same video hash. |
| Finalize the second creative proof | Pending human review | Wiggly Format Lab passes automatic inspection and is stored as `evidence/review.mp4`; only the user's voice/pronunciation/motion/lip-sync/joke/CTA approval remains. No fourth render is permitted; approval can finalize attempt three as-is, while requested creative changes require a new run ID. |
| Run a blind-agent handoff | Pass | `evidence/blind-handoff/` shows a fresh agent used only the ZIP, made zero provider calls, did not edit the renderer, passed on attempt one, and returned a byte-identical final MP4. |
| Record failures, fixes, and scope of lessons | Pass | `lessons.json` records frame-cache bloat, content leakage, text clipping, audio-duration mismatch, and blind-handoff friction with evidence and scope. |
| Remove needless machinery | Pass | Ponytail review removed unused renderer debug/rest-pose state and replaced the custom env parser with Node's native `process.loadEnvFile`; no database, marketplace, workflow engine, MCP server, or app integration was added. |
| Produce a downloadable, reviewable runnable kit | Pass | `npm run package` creates a ZIP, SHA-256 sidecar, and in-archive `KIT-MANIFEST.json`, excluding secrets, dependencies, run caches, frames, and older downloads. |

The full goal remains active solely for the pending second-proof creative approval and resulting finalization receipt.
