# Otaku Explainer

Turn a technical lesson into a short anime conversation. A curious lead asks the obvious questions, an expert explains the idea through the story world, and a third character adds tension or a joke.

This package is the first Wiggly Format repository experiment. It contains the instructions, inputs, assets, prompts, scene slots, renderer, audio rules, quality checks, and exact run records needed to recreate its outputs.

## Formula

1. Open with a question that names the confusing idea.
2. Explain the first side of the comparison with a story-world object.
3. Explain the second side with a contrasting story-world object.
4. Show when each approach is useful.
5. End with the lead character saying the lesson back in one simple line.

Each scene uses the same visual grammar: a slowly panning anime background, two or three grounded character cutouts, one visible speaker, one speech bubble, and an optional prop or effect.

## Proof runs

- Naruto explains compilers versus interpreters.
- Naruto explains MCP through Naruto lore.
- Yu-Gi-Oh explains compilers versus interpreters through Yu-Gi-Oh lore.

All three runs use the same scene contract and `renderer/OtakuFormatRenderer.tsx`.

## Editing

Assets and deterministic scene values can be replaced without regenerating the script. Changing a prompt or instruction marks the package **Needs rerun**, because an old output must never pretend to reflect a new prompt.
