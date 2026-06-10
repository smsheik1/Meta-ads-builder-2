# Wiggly Agent Instructions

This repo is optimized for AI-assisted product work. Keep Wiggly boring internally and magical externally.

Before changing product code, read this file and `docs/wiggly-engineering-rules.md`.

## Active App

- Current product work lives in the v3 app unless the user explicitly says otherwise.
- Legacy `/create`, `/create-v2`, and `/builder` code may be used as visual or behavioral reference, but do not blend legacy implementation back into v3 without an explicit plan.
- Treat old code as reference material first. Port the recipe, contract, or visual behavior; avoid copying legacy state/rendering patterns that caused the rebuild.

## Product Boundaries

- `/create` generates and previews. It is for URL input, format choice, reroll, audio, download/share, and opening in builder.
- `/builder` edits. Advanced movement, resizing, layout tuning, colors, locks, captions, and detailed controls belong there.
- `/share` views and spreads. It should play, reroll when intended, and route people back to Wiggly.

Do not turn `/create` into a mini-builder. Movement, resizing, precision controls, and detailed editing belong in `/builder`. If a feature needs precise editing on `/create`, pause and explain why the boundary should change before implementing it.

## Product Manager Guardrail

The user may describe product ideas in broad product-manager language. Do not treat every idea as implementation approval.

If a request would violate these guardrails, pause before coding and explain which rule it risks breaking, what bug class it may reintroduce, the cleaner alternative, and whether the user explicitly wants to override the rule.

Do not override guardrails silently.

## Non-Negotiable Rules

1. Use one renderer. Preview, download, and share must render through `AdRenderSurface`.
2. Do not add fallback renderers, duplicate render surfaces, or "almost the same" preview/export components.
3. Keep `AdRenderSurface` passive. It paints an `AdScene`; it does not own product mutation logic.
4. Change scene data through complete `AdScene` payloads, not scattered page-level state.
5. Keep canvas interaction state in the dedicated interaction store. Do not recreate selection, locks, mode, or reroll state in local component state.
6. State changes should be semantic events, not random setters. Prefer names like `websiteSubmitted`, `sceneSelected`, `audioGenerated`, `renderQueued`, and `formatChanged`.
7. Formats are isolated modules. Adding a format should not require surgery in the core `/create` page.
8. No invisible interactivity. If a user can click it, they must be able to see it. Hidden hover zones, transparent buttons, and overlapping click traps are banned.
9. Download/share parity is mandatory. Canvas preview, Remotion export, and share pages must consume the same scene contract and renderer path.
10. Every fixed bug needs a guardrail test or an updated existing test for that bug class.

## Before You Edit

Ask these questions before writing code:

- Am I touching the correct surface: `/create`, `/builder`, or `/share`?
- Am I adding duplicate scene, render, audio, or interaction state?
- Am I creating another render path instead of using `AdRenderSurface`?
- Am I adding hidden or transparent interactivity?
- Can this be expressed as an `AdScene` or format-module change?
- If this touches render, reroll, audio, share, or download, what existing contract and test surface protects it?
- What regression test prevents this bug from returning?

## Working Style

- Prefer small, reversible changes.
- Keep page components thin; move format-specific behavior into format modules.
- Preserve the current product split unless the user explicitly approves changing it.
- When in doubt, keep `/create` simpler and move advanced editing to `/builder`.
- Do not delete legacy/reference code unless the user explicitly asks and the branch has a clear rollback path.

## Related Guardrails

- Human-readable rulebook: `docs/wiggly-engineering-rules.md`
- Local Codex skill: `wiggly-guardrails`
