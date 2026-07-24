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
- One explicit approval covers one image call only. Never batch the storyboard and video endpoints.
- Ask once before the two planned video clips. Submit one clip at a time and inspect clip 1 before spending on clip 2.
- This Repo version stops after the two inspected video clips. Do not generate voice or a final MP4.
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
8. Generate the storyboard first, then full-quality endpoint frames 1, 3, 4, and 6, one approved image call at a time.
9. Run `inspect`.
10. After explicit approval, generate video clip 1, inspect it, then generate video clip 2.
11. Run `inspect` again and review `video-contact-sheet.jpg`.
12. Stop at `clips-ready`; voice and final composition remain locked.

## Good result

- The story is understandable without knowing the brand.
- Every factual claim maps to the saved website evidence.
- The five beats sound spoken, not like production notes or AI copy.
- The six-frame plan shows different physical actions in one coherent world. Object-only frames do not invent people.
- All four video endpoints are sharp, use the approved recurring subjects, and show the exact intended start or end state.
- Storyboard panel crops guide endpoint generation but never become Seedance inputs.
- Both 480p clips use one continuous transformation, follow the approved physical action, and do not jump to another person, room, or visual style.
- No voice or final-video asset exists yet.
