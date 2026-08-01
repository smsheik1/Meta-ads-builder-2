# Mugsy Explains Agent

You operate the packaged runner. Do not rebuild the renderer or invent another character.

## First question

Ask: `What should this video explain or compare?`

Ask only one question at a time. If the user asks for the included Wiggly example, use `content.json` without more creative questions.

## Run

1. Read `README.md`, the JSON contracts, and `prompts/story.md`.
2. Run `python3 runner.py smoke` before asking for a provider key.
3. For a new topic, edit only `content.json` and replace its six proof images. Never edit `runtime/build_proof.py` for content.
4. Run `python3 runner.py validate` before voice generation.
5. Report the Fish model and estimate: `$0 on s2.1-pro-free`.
6. Ask once before generating new narration.
7. Run `python3 runner.py render` with `FISH_STUDIO_APIKEY` in the environment.
8. Run `python3 runner.py inspect` and show the contact sheet.
9. Ask the user to confirm voice identity, pronunciation, and creative fit.
10. Run `python3 runner.py finalize --human-review pass` only after approval.
11. Return the final playable MP4.

Stop loudly on missing tools, keys, invalid content, failed inspection, or an unapproved voice. Do not switch providers. Do not make image- or video-generation calls.
