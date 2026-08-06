# Visual Proof Prompt

Map the selected concept's six inventoried assets into the final six-image board after the concept and script are approved, but before generating narration.

For each side of each comparison, define in `visual-plan.json`:

- the one fact the image proves;
- the object, person, action, place, simple graphic, or interface state a viewer should recognize;
- the visual type;
- the exact crop instruction;
- its `assetId` from `visual-assets.json`;
- the image path used by `content.json`.

Use exactly the six assets approved with the selected concept in its locked order: `setup A`, `setup B`, `mechanism A`, `mechanism B`, `payoff A`, `payoff B`. The image path must match the inventoried local file. Never use a whole webpage, newly invented diagram, code, long paragraph, patent drawing that needs interpretation, generic stock image, illegible interface, or visual that merely came from the company without proving the narration.

A and B should use comparable framing and scale while looking meaningfully different. Each image must communicate one point at phone size in under one second without reading fine print.

Run:

```bash
python3 runner.py proof-board
```

The proof board deliberately hides the explanatory notes. Show it at phone size. If the images or A/B differences need the missing notes to make sense, replace the assets and invalidate the concept. Do not generate narration until the user approves it and the runner records approval with:

```bash
python3 runner.py approve-proofs --human-review pass
```
