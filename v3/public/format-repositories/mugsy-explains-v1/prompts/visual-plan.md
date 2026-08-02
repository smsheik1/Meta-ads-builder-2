# Visual Proof Prompt

Map the selected concept's six inventoried assets into the final proof board after the concept and script are approved, but before generating narration.

For each side of each comparison, define in `visual-plan.json`:

- the one fact the image proves;
- the object, number, diagram, or tight text crop a viewer should recognize;
- the visual type;
- the exact crop instruction;
- its `assetId` from `visual-assets.json`;
- the image path used by `content.json`.

Use exactly the six assets approved with the selected concept in its locked order: `setup A`, `setup B`, `mechanism A`, `mechanism B`, `payoff A`, `payoff B`. The image path must match the inventoried local file. Never use a whole webpage, newly invented diagram, long paragraph, generic stock image, illegible interface, or visual that merely came from the company without proving the narration.

A and B should use comparable framing and scale. Each image must communicate one point at phone size in under one second.

Run:

```bash
python3 runner.py proof-board
```

Show the six-image board to the user. Do not generate narration until the user approves it and the runner records approval with:

```bash
python3 runner.py approve-proofs --human-review pass
```
