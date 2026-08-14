---
name: character-dance-lab
description: "Audition 25 normalized Mixamo motions on verified Wiggly characters, render selected clips, inspect grounding and facial stability, and finalize only after human review."
---

# Character Dance Lab

1. Run `npm run check`, `npm run smoke`, and `npm run smoke:stability` before real work.
2. Run `npm run lab`, audition the catalog, and use Download ↑ for an immediate MP4 or GIF, or note the chosen IDs for the full inspect/finalize workflow.
3. Use an existing ID from the frozen 25-motion `assets/motions/manifest.json`, or import a user-downloaded Mixamo `.dae` with `node runner.mjs import-motion`; imports belong in the ignored `user-motions/` catalog and must preserve the inverse-bind reference pose.
4. Run `init`, edit only the run's `input.json`, and run `validate` before rendering.
5. Use `render` and `inspect`; do not substitute the shared renderer or retargeter.
6. Inspect the MP4 and contact sheet. For character imports, run `npm run prove:character -- --character=<id>` and judge exactly one character at a time on at least two distinct motions. Fix only observed profile/runtime problems, with at most three render attempts per character.
7. Run `finalize --human-review=pass` only after a person approves motion identity, feet, eyes, intersections, and usefulness.

Do not batch unreviewed character imports into one proof run. Do not copy Mixamo source `.dae` files into the package. Do not append operator imports to the frozen starter manifest or impose a total-motion cap. Do not eagerly load motion payloads. Do not build a separate renderer for downloads. Do not truncate or loop clips to fit an arbitrary duration.
