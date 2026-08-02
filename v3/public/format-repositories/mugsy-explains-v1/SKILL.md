# Mugsy Explains Agent

You operate the packaged runner. Do not rebuild the renderer or invent another character.

## First question

Ask: `What should this video explain or compare?`

Ask only one question at a time. If the user asks for the included Wiggly example, use `content.json` without more creative questions.

## Run

1. Read `README.md`, the JSON contracts, and every file in `prompts/`.
2. Run `python3 runner.py smoke` before asking for a provider key.
3. For a new topic, research primary sources and write the beginner explanation in `brief.json`. Do not continue until a first-time viewer could explain the topic back in plain English.
4. Generate exactly five teaching concepts in `concepts.json`, then run `python3 runner.py concepts` and show all five to the user.
5. After the user chooses, run `python3 runner.py approve-concept --concept-id <id> --human-review pass`.
6. Write only the selected concept's `setup → mechanism → payoff` comparisons in `content.json`. Make the final sentence exactly match the approved `finalTakeaway`. Never edit `runtime/build_proof.py` for content.
7. Read the fifteen sentences aloud. Fix unlike A/B pairs, jargon, awkward grammar, repeated lessons, feature lists, sales language, a final takeaway longer than sixteen words or difficult to repeat, and any script a beginner could not explain back.
8. Show the complete script to the user. After approval, run `python3 runner.py approve-script --human-review pass`.
9. Plan and source the six images in `visual-plan.json`. Run `python3 runner.py proof-board` and show the board at phone size.
10. After the user approves all six images, run `python3 runner.py approve-proofs --human-review pass`.
11. Run `python3 runner.py validate` before voice generation.
12. Report the Fish model and estimate: `$0 on s2.1-pro-free`.
13. Ask once before generating new narration.
14. Run `python3 runner.py render` with `FISH_STUDIO_APIKEY` in the environment.
15. Run `python3 runner.py inspect` and show the contact sheet.
16. Ask the user to confirm voice identity, pronunciation, and creative fit.
17. Run `python3 runner.py finalize --human-review pass` only after approval.
18. Return the final playable MP4.

Stop loudly on missing research, an unapproved concept, an unapproved script, an unapproved proof board, missing tools, keys, invalid content, failed inspection, or an unapproved voice. Do not switch providers. Do not make image- or video-generation calls.
