---
name: otaku-explainer-format
description: Use the Otaku Explainer Format to make a short anime-world lesson video without asking the user to explain how the Format works.
---

# Otaku Explainer Agent Loop

You are operating a complete Wiggly Format. The user supplies a topic and chooses a packaged story world. This folder supplies the cast, voices, backgrounds, layouts, renderer, audio rules, and quality checks.

## Commands

Run commands from `v3`:

```bash
npm run prototype:otaku -- check
npm run prototype:otaku -- init --run=<run-id> --topic="<topic>" --world=naruto
npm run prototype:otaku -- validate --run=<run-id>
npm run prototype:otaku -- render --run=<run-id> --approve-loop
npm run prototype:otaku -- inspect --run=<run-id>
npm run prototype:otaku -- finalize --run=<run-id>
```

`--approve-loop` may be used only after the user approves one initial render and up to two focused improvement renders. That approval is recorded without storing secrets.

## Required loop

1. Read this file, `requirements.json`, `worlds/<world>.json`, `layouts.json`, `scene-contract.json`, `prompts/script-system.md`, and `quality.json`.
2. Run `check`. If it reports a missing key, ask the user to add the named key to `v3/.env.local`. Never ask them to paste a secret into chat and never print its value.
3. Run `init`, then write 12–18 short scene records in the new run's `scene-plan.json`.
4. Use only packaged role names, backgrounds, layout IDs, and assets. Do not invent character coordinates.
5. Run `validate` before any media call. Fix every validation error first.
6. Show the user the scene plan, scene count, cast, and estimated duration. Ask once for approval covering no more than three total render attempts.
7. Run `render --approve-loop` for the first attempt. Later attempts use `render` without that flag.
8. Run `inspect`. Look at the full video and contact sheet. Record only concrete problems in `quality-report.json`.
9. Fix only the problems you found. Do not rewrite good scenes. Render and inspect again when needed.
10. Run `finalize` only when every automatic and human review check passes.

## Add a story world

When the user asks for a story world that is not packaged:

1. Run `check --needs-new-assets`. Ask for missing key names without exposing their values.
2. Research the show's characters, relationships, locations, and lore. Record the sources you used.
3. Map one character to each lesson role: learner, guide, and challenger. Keep the renderer, layouts, and scene contract unchanged.
4. Search Fish Audio's public models for each character, audition available samples, and record the chosen model IDs and why they fit.
5. Use Serper to find full-body character cutouts and wide backgrounds. Follow `prompts/image-search.md`; prefer existing transparent assets and use local cleanup when needed.
6. Add the inspected files and provenance to `assets.json`, then create `worlds/<world>.json` with the cast, voices, backgrounds, useful lore, and claims to avoid.
7. Validate the new world before rendering. If it requires special renderer, runner, layout, or schema code, stop: the Format is not portable yet.

Do not generate images unless the user separately approves it. Do not add an automated world-building workflow; the agent performs and documents this work.

## Good result

A passing result:

- teaches the topic accurately in language a nontechnical viewer can repeat;
- sounds like a natural conversation, not a lecture pasted into character mouths;
- uses a story-world analogy that stays consistent;
- keeps every visible character grounded;
- fits every line inside the speech bubble;
- assigns the right voice to the active speaker;
- keeps music below the dialogue; and
- leaves a clear final takeaway.

## Failure rules

- Never render an invalid plan.
- Never exceed three attempts for one run.
- Never silently change providers or generate replacement images or video.
- If the packaged world lacks an asset, stop and explain what is missing. Use Serper only after the user approves sourcing a new asset.
- If attempt three still fails, stop and explain the blocker. Do not mark the run finished.
- Do not expose, copy, log, or store API key values.
