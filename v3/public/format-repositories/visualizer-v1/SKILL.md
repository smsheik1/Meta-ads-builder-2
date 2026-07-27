---
name: wiggly-visualizer
description: Turn one website into an evidence-backed two-person conversation ad with branded audio bars and captions.
---

# Wiggly Visualizer

Use this skill when someone wants a voice-led social ad that feels like a real conversation.

## Start

If the user already gave you a website, start the run.

If they only sent this Format, ask:

`What website is this conversation ad for?`

Ask one question at a time.
Do not ask about budget.
Do not ask the user to pick a model.
Do not ask for colors, a script, or a visualizer preset when the site already answers those.

Turbo is the default:

- Research the site.
- Write five options.
- Select the strongest one.
- Stop before the voice call.

Guide mode shows the five options and asks the user to choose one.

## Progress

Always show:

`Research -> Dialogue -> Voice -> Render -> Deliver`

Start every update with the current step:

- `Step 1 of 5: Research`
- `Step 2 of 5: Dialogue`
- `Step 3 of 5: Voice`
- `Step 4 of 5: Render`
- `Step 5 of 5: Deliver`

Keep updates short.

## Run

Run all commands from the downloaded kit's `v3` directory.

1. Run `npm run format:visualizer -- check`.
2. Run `init --run=<id> --url=<url>`.
3. Read `prompts/research.md`.
4. Research the site with your own web tools and fill `research.json`.
5. Run `prompt --run=<id>`.
6. Use the exact generated `dialogue-prompt.txt` yourself.
7. Save all five options in `dialogue-options.json`.
8. In Turbo, select the strongest option in `selection.json`. In Guide mode, show the five short titles and let the user choose.
9. Read `prompts/selection.md`.
10. Run `validate --run=<id>`.
11. Run `estimate --run=<id>`.
12. Show the selected six-line conversation and the estimate.
13. Ask: `Ready to make the two voices?`
14. Wait for a clear yes.
15. Run `generate --run=<id> --approve-voice` once.
16. Run `render --run=<id>`.
17. Run `inspect --run=<id>`.
18. Let the user watch the whole MP4.
19. If it is good, run `finalize --run=<id> --approve-final`.

## Estimate

Before the voice call, show:

```text
Run estimate

- Research: $0 Wiggly provider cost
- Five dialogue options: $0 separate provider cost
- Two-speaker voice: Gemini 3.1 Flash TTS, usually about $0.01-$0.02 on paid pricing; free-tier usage may be $0
- MP4 render: $0 provider cost

One voice attempt.
```

Use the runner's exact estimate for the current script.

## Dialogue Rules

- Make exactly five options before selection.
- Each option is exactly six lines.
- Speakers alternate Ava, Sam, Ava, Sam, Ava, Sam.
- Every option uses a different buyer angle, setting, and relationship.
- Line 1 starts with a specific moment, number, time, place, tab, meeting, metric, or customer quote.
- Line 2 reacts like a friend or operator and does not pitch.
- Line 3 asks what changed or calls out the claim.
- Line 4 drops one supported proof point casually.
- Line 5 asks for the name, link, or next step.
- Line 6 answers plainly. It does not pitch or recap.
- Never invent a claim, number, review, result, or testimonial.
- If proof is weak, stay human and modest.

## Provider Rules

- The only provider call is Gemini two-speaker voice.
- Never call it without the user's clear yes.
- Never retry automatically.
- Never switch providers.
- Never hide an error.
- A replacement voice needs a new estimate and a new yes.
- Never print a secret value. Only name a missing key.
- Never call Replicate, an image model, a video model, or a music model.

## Good Result

- The first line makes sense on mute.
- The conversation sounds overheard, not scripted by a brand.
- The proof comes from saved website evidence.
- The two speakers sound distinct.
- Six captions exactly match the six spoken lines.
- The waveform moves with the saved audio analysis.
- The final MP4 is 1080x1350 with one audio stream.
- The user watches the finished MP4 before final approval.
