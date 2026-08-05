---
name: squilliam-news-format
description: Turn a real event, launch, or promotion into a reusable thirty-second Squilliam News bulletin with a verified selectable presenter using the packaged renderer and runner.
---

# Squilliam News agent loop

Operate this runnable Format Kit. Do not rebuild, imitate, or replace the renderer.

## First question

Ask: `What event, launch, or promotion should the Squilliam News desk declare an emergency over, and which verified presenter should anchor it?`

Use only `squilliam`, `squidward`, `spongebob`, or `mr-krabs` as `content.characterId`. Squilliam remains the default. Do not add a model to this list until the same official renderer passes character-pack smoke QA.

Ask one question at a time. If the user requests the packaged We The Artists proof, initialize from that example without additional creative questions.

## Required loop

1. Read `README.md`, `requirements.json`, `input-contract.json`, `output-contract.json`, `composition-contract.json`, `quality.json`, `assets.json`, and `prompts/script.md`.
2. Run `npm install`, then `npm run smoke`, then `npm run check`.
3. Run `node runner.mjs init --run=<run-id> --from=we-the-artists` or `--from=smoke`.
4. Change only the new run's `content.json`, `assets/story/*`, `asset-sources.json`, and optional approved `audio/source.wav`.
5. Read the script aloud and inspect every story image at phone size.
6. Run `node runner.mjs validate --run=<run-id>` before any provider call.
7. If narration is missing, report the Fish model and current cost, then ask once when the call may charge or consume a limited quota.
8. Run `node runner.mjs render --run=<run-id> --approve-provider` only after approval. Omit the flag when approved narration already exists.
9. Run `node runner.mjs inspect --run=<run-id>`, then use the host environment's media viewer to show the emitted contact-sheet and playable-video paths. If the GUI viewer is unavailable, use packaged Playwright with installed Chrome to play the actual MP4; do not create a preview renderer.
10. Ask the user to confirm factual accuracy, voice identity, pronunciation, body language, lip sync, joke, and CTA.
11. Run `node runner.mjs finalize --run=<run-id> --human-review=pass` only after approval.
12. Return the final playable MP4.

Stop on missing tools, invalid content, absent assets, unapproved provider use, failed inspection, or attempt three. Never print or store secret values. A content change that requires editing `runtime/renderer/app.js` is a portability failure, not permission to patch the renderer.
