# Squilliam News completion audit

This audit maps the active Wiggly Repo objective to current, reviewable evidence. A row is complete only when the named artifact or executable check directly proves it.

| Objective requirement | Status | Authoritative evidence |
| --- | --- | --- |
| Work on a fresh, isolated branch | Pass | Branch `codex/feat/squilliam-news-repo`; all branch changes are under this Format root. |
| Do not integrate into `/create`, `/builder`, or `/share` | Pass | `git diff --name-only origin/main...HEAD` contains only `v3/public/format-repositories/squilliam-news-v1/**`. |
| Preserve one official renderer | Pass | `format.json` names `runtime/renderer/app.js`; `composition-contract.json` records the invariant; the test suite asserts that `runtime/renderer/` contains only `app.js` and `index.html`. |
| Separate replaceable promotion content from fixed character-pack/studio mechanics | Pass | The boundary table in `README.md`, `input-contract.json`, `composition-contract.json`, `assets.json`, and the renderer fact-leak test. |
| Admit only render-tested character packs | Pass | `assets/character-packs.json`, `CHARACTER-AUDIT.md`, contract tests, and hashed media under `evidence/character-packs/`. |
| Package Format-specific agent instructions | Pass | `SKILL.md` gives a complete ordered loop and explicitly forbids rebuilding the renderer. |
| Package input, output, and composition contracts | Pass | `input-contract.json`, `output-contract.json`, and `composition-contract.json`. |
| Declare tools, providers, key names, cost, and approval policy without secret values | Pass | `requirements.json`, `.env.example`, `runner.mjs check`, and the secret scan recorded in `evidence/package-smoke.json`. |
| Preserve assets and provenance | Pass | Fixed assets are listed in `assets.json`; each example and fixture has `asset-sources.json`; generated-provider evidence is sanitized. |
| Support voice and pronunciation configuration | Pass | `SQUILLIAM_VOICE_ID` remains environment-only; each `content.json` carries explicit pronunciation overrides; Fish input is phoneme encoded by the runner. |
| Provide semantic `smoke/check/init/validate/render/inspect/finalize` commands | Pass | `package.json`, `runner.mjs`, and the command-contract test; `package` is included as the archive command. |
| Provide a free local smoke test through the official renderer | Pass | Synthetic fixture plus `npm run smoke`; a clean extracted archive passed in `evidence/package-smoke.json`. |
| Prevent provider calls before validation and approval | Pass | Tests prove `--approve-provider` cannot bypass validation, missing approval cannot create a receipt, and either rejection consumes zero attempts. |
| Limit and preserve attempts | Pass | `input-contract.json` caps attempts at three; run `state.json` records attempt history; the blind proof finished on attempt one. |
| Create two meaningfully different promotional proofs through the current runtime | Pass | Fresh We The Artists and Wiggly Format Lab v0.2 quality reports share runtime hash `6cfbc7b5fd32608dd4fe9afbc10bbc957f58a21d4c059c2788e2f53f25497dea` while recording different content and video hashes. Both exact 30-second videos are packaged under their current example evidence. |
| Inspect real rendered media | Pass | Both full v0.2 promotions passed automatic media inspection and browser playback review; current videos, contact sheets, validation receipts, run receipts, and quality reports are packaged. All four selectable presenters also have hashed visual smoke evidence under `evidence/character-packs/`. |
| Reject failed, stale, or unapproved finalization | Pass | Tests prove human approval cannot override failed inspection, stale runtime evidence is rejected, and the explicit human-review flag is mandatory. |
| Finalize human-approved real media | Pending current human review | The current We The Artists v0.2 review passes automatic checks. Historical v0.1 finalization remains archived, but it cannot authorize the changed v0.2 runtime. |
| Finalize the second creative proof | Pending current human review | The current Wiggly Format Lab v0.2 review passes automatic checks on attempt one and awaits creative approval. |
| Run a blind-agent handoff | Pass through required human gate | A fresh agent used only the v0.2 ZIP, clean-installed it, passed smoke/check/validate/render/inspect on attempt one, played the actual MP4, made zero provider calls, left the renderer unchanged, and correctly stopped before finalization. Receipts are under `evidence/blind-handoff/v0.2/`. |
| Record failures, fixes, and scope of lessons | Pass | `lessons.json` records frame-cache bloat, content leakage, text clipping, audio-duration mismatch, and blind-handoff friction with evidence and scope. |
| Remove needless machinery | Pass | Ponytail review removed unused renderer debug/rest-pose state and replaced the custom env parser with Node's native `process.loadEnvFile`; no database, marketplace, workflow engine, MCP server, or app integration was added. |
| Produce a downloadable, reviewable runnable kit | Pass | `npm run package` creates a ZIP, SHA-256 sidecar, and in-archive `KIT-MANIFEST.json`, excluding secrets, dependencies, run caches, frames, and older downloads. |

The character-import expansion, both fresh v0.2 full proofs, current archive-only blind handoff, and clean-package audit are complete. The broader full-Repo goal remains active only for human-approved v0.2 finalization and the post-approval final package checkpoint.
