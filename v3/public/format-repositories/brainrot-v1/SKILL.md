---
name: wiggly-brainrot
description: Turn one website into an evidence-backed two-character Brainrot ad over looping gameplay.
---

# Wiggly Brainrot

Use this skill when someone wants a fast fake-podcast ad over familiar gameplay.

## First question

If the user already gave you a website, start the run.

If they only sent this format, ask:

`What website should I use for this Brainrot ad?`

Ask one question at a time.
Do not ask about budget.
Do not ask the user to pick a model, gameplay clip, character, voice, or caption style.

Turbo is the default:

- Research the site.
- Write three options.
- Select the strongest one.
- Stop before the voice call.

Guide mode shows the three options and asks the user to choose.

## Progress

Always show:

`Research -> Script -> Voice -> Render -> Deliver`

Start every update with the current step:

- `Step 1 of 5: Research`
- `Step 2 of 5: Script`
- `Step 3 of 5: Voice`
- `Step 4 of 5: Render`
- `Step 5 of 5: Deliver`

Keep updates short.

## Run

Run commands from the downloaded kit's `v3` directory.

1. Run `npm run format:brainrot -- check`.
2. Run `init --run=<id> --url=<url>`.
3. Read `prompts/research.md`.
4. Research the site with your own web tools and fill `research.json`.
5. Run `prompt --run=<id>`.
6. Use the exact generated `brainrot-prompt.txt` yourself.
7. Save all three options in `script-options.json`.
8. In Turbo, select the strongest option in `selection.json`. In Guide mode, show the three angle names and let the user choose.
9. Read `prompts/selection.md`.
10. Run `validate --run=<id>`.
11. Run `estimate --run=<id>`.
12. Show the complete selected script and exact estimate.
13. Ask: `Ready to make the two voices?`
14. Wait for a clear yes.
15. Run `generate --run=<id> --approve-voice` once.
16. Run `render --run=<id>`.
17. Run `inspect --run=<id>`.
18. Let the user watch the whole MP4.
19. If it is good, run `finalize --run=<id> --approve-final`.

## Script rules

- Make exactly three options before selection.
- Each option uses one different supported buyer pain.
- Each option has 6-10 short beats.
- Both speakers appear and alternate naturally.
- Beat 1 opens a knowledge gap. It is not a greeting.
- The left character is stuck or asks the obvious question.
- The right character knows the fix.
- The brand enters after the problem is clear, never in beat 1 or 2.
- The final beat lands abruptly. No recap or sign-off.
- Cite exact saved evidence in every option.
- Never invent a fact, number, review, result, guarantee, or discount.

## Provider rules

- The only provider call is Fish S2.1 Pro Free voice.
- Never call it without the user's clear yes.
- Never retry automatically.
- Never switch providers.
- Never hide an error.
- A replacement voice needs a new run, estimate, and yes.
- Never print a secret value. Only name a missing key.
- Never call Replicate, an image model, a video model, or a music model.

## Good result

- The first line creates an immediate knowledge gap.
- The exchange sounds like banter, not brand copy.
- The product proof comes from saved website evidence.
- The two characters sound different.
- Every caption exactly matches one spoken beat.
- The active speaker stays visually clear.
- The final MP4 is 1080x1350 with one audio stream.
- The user watches the full MP4 before final approval.
