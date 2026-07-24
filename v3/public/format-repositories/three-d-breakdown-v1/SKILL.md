---
name: three-d-breakdown-format
description: Use the official Wiggly 3D Breakdown recipe to plan and prepare a 20-second evidence-backed 3D explainer.
---

# 3D Breakdown Format

Use this skill when a user asks an agent to make, inspect, or improve a Wiggly 3D Breakdown.

## Rules

- Read `requirements.json`, `inputs.json`, `pipeline.json`, `scene-contract.json`, `assets.json`, and `quality.json`.
- Use the packaged runner and the canonical Wiggly modules. Do not rebuild the renderer, timing model, prompt builders, or scene contract.
- Ask what the story should focus on: a product, the brand, a customer problem, or a custom idea.
- Product focus requires a catalog product with a usable image. Brand and customer-problem stories do not require a product.
- Treat website research as evidence. A custom brief changes the creative focus but does not authorize new factual claims.
- Show the five story directions before selecting one.
- Validate the selected plan before any image call.
- One explicit approval covers one image call only. Never batch the storyboard and anchors.
- This Repo version stops after the storyboard and two production anchors. Do not generate video or voice.
- Never print secret values. Report only missing key names.
- Fail loudly. Do not switch providers, repair model output, retry automatically, or hide an error.

## Agent loop

1. Run `check --stage=plan`.
2. Run `init` with the exported Wiggly website research and the chosen story subject.
3. Ask once before the planning calls, then run `directions`.
4. Show all five directions and let the user choose.
5. Run `select`, then `validate`.
6. Let the user inspect and edit the script, storyboard plan, image prompts, and CTA.
7. Ask before each `image` command.
8. Generate the storyboard first, then anchor frame 1, then anchor frame 4.
9. Run `inspect`.
10. Stop at `ready-for-video` and explain that paid video remains locked for the next approved phase.

## Good result

- The story is understandable without knowing the brand.
- Every factual claim maps to the saved website evidence.
- The five beats sound spoken, not like production notes or AI copy.
- The six frames show different physical actions while preserving the same world, demonstrator, and product category.
- The two anchors are clean enough to become the first frames of the two later clips.
- No video or voice asset exists yet.
