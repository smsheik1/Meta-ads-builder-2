# Wiggly Repo learnings

## What this proof answered

The Otaku Wiggly Repo is more than a page of files. Its instructions and contracts gave an agent enough context to make a new lesson and add Danny Phantom without the user explaining the Format again.

The portability test passed without story-world code in the renderer. Danny Phantom required one world JSON file, three character images, three backgrounds, and a scene plan. The existing runner, layouts, validation, renderer, audio pipeline, and quality gate stayed unchanged.

## What the Repo taught successfully

- Which local tools and key names are needed, and when to ask for them.
- The fixed order: check, research, plan, validate, approve, render, inspect, and finalize.
- The three lesson roles and how a world maps characters and voices onto them.
- The allowed layouts, scene count, dialogue size, callouts, and background rules.
- How to add a world with web research, Fish voice search, Serper assets, and local transparency cleanup.
- When to stop instead of adding world-specific renderer or schema code.
- How to leave provenance and attempt history behind.

## What the agent still had to judge

- The strongest analogy: the Fenton Portal became the controlled doorway between separate systems.
- Which lore details were useful and which would distract from the lesson.
- Which public voices and images were the best matches.
- Whether cutouts looked clean and characters appeared grounded.
- Whether dialogue sounded natural and the finished video was worth keeping.

The Repo should guide these decisions and require evidence. It should not try to replace judgment with a large world-building framework.

## Was the new-world playbook enough?

Yes for this proof. It led to a complete Danny world and passing video on the first render attempt. The agent did not need an `add-world` command, a new service, or an image-generation fallback.

The playbook would be stronger with examples of good and bad asset choices, especially for backgrounds with a visible ground plane and character art with real transparency. That can remain documentation until repeated failures prove code is needed.

## What belongs in every Wiggly Repo

1. A short `SKILL.md` that tells an agent what to do, what requires approval, how to fail, and what “good” means.
2. A requirements file containing key names and tool names, never secret values.
3. A small input and scene contract with validation before paid work.
4. Fixed assets with source provenance.
5. Reusable layouts or other format-specific composition rules.
6. A deterministic renderer and named model or voice dependencies.
7. A render-attempt ceiling and a quality report that mixes technical checks with honest creative review.
8. Final output, contact sheet, and run provenance that survive a fresh checkout.

## What remains specific to Otaku Explainer

- Learner, guide, and challenger roles.
- Anime character cutouts and story-world lore.
- Speech bubbles, moving backgrounds, callout props, and the active-speaker treatment.
- Two- and three-character layouts.
- The rule that a technical lesson must map cleanly to events from the selected show.

These belong inside this Repo, not in Wiggly's global renderer or app shell.

## Three highest-value root improvements

1. Define a small standard Wiggly Repo checklist around instructions, requirements, inputs, assets, renderer, validation, evidence, and final outputs.
2. Reuse the existing run-evidence panel pattern so every Repo can show attempts, contact sheets, quality checks, and final video after refresh.
3. Give authors a concise asset-review checklist before rendering: transparent characters, grounded backgrounds, recorded sources, and no leftover identity from another world.

Do not build a generic world-creation framework yet. One clean agent-operated success is evidence for a package convention, not proof that Wiggly needs another platform layer.
