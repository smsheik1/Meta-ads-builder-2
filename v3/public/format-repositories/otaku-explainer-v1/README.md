# Otaku Explainer

Turn a technical lesson into a short anime conversation. A curious lead asks the obvious questions, an expert explains the idea through the story world, and a third character adds tension or a joke.

This package is the first Wiggly Format repository experiment. It contains the instructions, inputs, assets, prompts, scene slots, renderer, audio rules, quality checks, and exact run records needed to recreate its outputs.

An agent can operate the package without an OpenRouter planning call. Start with `SKILL.md`; it explains how to check requirements, create and validate a scene plan, request one render-loop approval, inspect the result, and stop after three attempts.

## Formula

1. Open with a question that names the confusing idea.
2. Explain the first side of the comparison with a story-world object.
3. Explain the second side with a contrasting story-world object.
4. Show when each approach is useful.
5. End with the lead character saying the lesson back in one simple line.

Each scene uses the same visual grammar: a slowly panning anime background, two or three grounded character cutouts, one visible speaker, one speech bubble, and an optional short callout.

Scene writers choose lesson roles and an approved layout. `worlds/*.json` maps the roles to characters and voices, while `layouts.json` owns the coordinates. This keeps a new topic from inventing a new renderer.

## Agent commands

From `v3`:

```bash
npm run prototype:otaku -- check
npm run prototype:otaku -- init --run=<run-id> --topic="<topic>" --world=naruto
npm run prototype:otaku -- validate --run=<run-id>
npm run prototype:otaku -- render --run=<run-id> --approve-loop
npm run prototype:otaku -- inspect --run=<run-id>
npm run prototype:otaku -- finalize --run=<run-id>
```

The Fish key stays in `v3/.env.local`. Serper is needed only when an approved run adds a new story world. `SKILL.md` tells the agent how to research lore, choose voices, source and inspect assets, and create the world pack without adding another command or changing the renderer. The package never needs OpenRouter, Replicate, a GPU, image generation, or video generation.

## Proof runs

- Naruto explains compilers versus interpreters.
- Naruto explains MCP through Naruto lore.
- Yu-Gi-Oh explains compilers versus interpreters through Yu-Gi-Oh lore.
- Naruto explains APIs in the agent-operated control run.
- Danny Phantom explains the same API lesson after the agent researches and packages that world.

All five runs use the same scene contract and `renderer/OtakuFormatRenderer.tsx`. The two API videos and their quality reports are tracked proof that the agent loop works across story worlds.

## Editing

Assets and deterministic scene values can be replaced without regenerating the script. Changing a prompt or instruction marks the package **Needs rerun**, because an old output must never pretend to reflect a new prompt.
