# Wiggly Mugsy Explains

This proof kit researches an unfamiliar topic, inventories real visual evidence, offers five visually executable teaching concepts, and turns one approved concept into a 25-35 second vertical explainer using an approved three-part `setup → mechanism → payoff` script, six approved proof images, the bundled recurring character poses, and an authorized Fish voice reference.

## What stays fixed

- Plain white 9:16 canvas.
- Exact bundled pose pack reused throughout.
- Proof images at the top.
- Handwritten labels and rolling captions.
- Hard cuts and continuous off-screen narration.
- One official runner and renderer.

## What changes

- The beginner brief and five teaching concepts.
- The 6-12 item sourced visual inventory.
- The three comparisons in `content.json`.
- The six-image visual plan.
- Six proof images referenced by `content.json`.
- The narration generated from those sentences.

## Commands

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python runner.py smoke
.venv/bin/python runner.py assets
.venv/bin/python runner.py asset-board
.venv/bin/python runner.py approve-assets --human-review pass
.venv/bin/python runner.py concepts
.venv/bin/python runner.py approve-concept --concept-id prompt-to-format --human-review pass
.venv/bin/python runner.py approve-script --human-review pass
.venv/bin/python runner.py proof-board
.venv/bin/python runner.py approve-proofs --human-review pass
.venv/bin/python runner.py validate
FISH_STUDIO_APIKEY=... .venv/bin/python runner.py render
.venv/bin/python runner.py inspect
.venv/bin/python runner.py finalize --human-review pass
.venv/bin/python tests/test_contracts.py
```

Research, asset review, concepts, script review, the proof board, `smoke`, `validate`, and `inspect` are local and free. Asset, concept, script, and proof approvals are hash-bound, so changing the brief, visual inventory, concept, script, plan, or images invalidates approval before narration. The included example reuses its approved cached narration, so rendering it makes zero provider calls. If the creative inputs change, the runner invalidates that cache and `render` requires explicit Fish access through `s2.1-pro-free`. It never makes image or video generation calls.

The included finished proof is at `examples/wiggly-proof.mp4`.

The package bundles Patrick Hand under the SIL Open Font License so rendering does not depend on macOS system fonts. The pose and voice-reference assets are included with the source owner's permission for use inside this Wiggly Format. Do not extract, resell, or redistribute them as standalone assets.
