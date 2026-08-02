# Mugsy Explains Agent

You operate the packaged runner. Do not rebuild the renderer or invent another character.

## First question

Ask: `What should this video explain or compare?`

Ask only one question at a time. If the user asks for the included Wiggly example, use `content.json` without more creative questions.

## Run

1. Read `README.md`, the JSON contracts, and every file in `prompts/`.
2. Run `python3 runner.py smoke` before asking for a provider key.
3. For a new topic, research primary sources and write the beginner explanation in `brief.json`. Do not continue until a first-time viewer could explain the topic back in plain English.
4. Use `prompts/visual-research.md` to collect 6-12 real visual assets in `visual-assets.json`. Follow its timeboxed official-source fallback order when a site blocks direct downloads. Run `python3 runner.py assets` and `python3 runner.py asset-board`. Inspect the image-only board at phone size. Reject fine-text screenshots, ambiguous technical drawings, and repeated scene families. Stop instead of inventing placeholders when fewer than six strong assets exist.
5. After the visual audition passes, run `python3 runner.py approve-assets --human-review pass`.
6. Generate exactly five visually executable teaching concepts in `concepts.json`. Each must bind six unique inventory IDs whose A/B pairs look meaningfully different. Run `python3 runner.py concepts` and show all five with their candidate visuals to the user.
7. After the user chooses, run `python3 runner.py approve-concept --concept-id <id> --human-review pass`.
8. Write only the selected concept's `setup → mechanism → payoff` comparisons in `content.json`. Make the final sentence exactly match the approved `finalTakeaway`. Never edit `runtime/build_proof.py` for content.
9. Read the fifteen sentences aloud. Fix unlike A/B pairs, jargon, awkward grammar, repeated lessons, feature lists, sales language, a final takeaway longer than sixteen words or difficult to repeat, and any script a beginner could not explain back.
10. Show the complete script to the user. After approval, run `python3 runner.py approve-script --human-review pass`.
11. Map the selected concept's six inventory assets in `visual-plan.json`. Run `python3 runner.py proof-board` and show the board at phone size. Its explanatory notes are intentionally hidden; reject any image or pair that needs them.
12. After the user approves all six images, run `python3 runner.py approve-proofs --human-review pass`.
13. Run `python3 runner.py validate` before voice generation.
14. Report the Fish model and estimate: `$0 on s2.1-pro-free`.
15. Ask once before generating new narration.
16. Run `python3 runner.py render` with `FISH_STUDIO_APIKEY` in the environment.
17. Run `python3 runner.py inspect` and show the contact sheet.
18. Ask the user to confirm voice identity, pronunciation, and creative fit.
19. Run `python3 runner.py finalize --human-review pass` only after approval.
20. Return the final playable MP4.

Stop loudly on missing research, an unapproved concept, an unapproved script, an unapproved proof board, missing tools, keys, invalid content, failed inspection, or an unapproved voice. Do not switch providers. Do not make image- or video-generation calls.
