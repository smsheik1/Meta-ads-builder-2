---
name: three-d-breakdown-format
description: Use the official Wiggly 3D Breakdown recipe to plan and prepare a 20-second evidence-backed 3D explainer.
---

# 3D Breakdown Format

Use this skill when a user asks an agent to make, inspect, or improve a Wiggly 3D Breakdown.

## Rules

- Read `requirements.json`, `inputs.json`, `pipeline.json`, `scene-contract.json`, `assets.json`, `goldens.json`, and `quality.json`.
- Watch the three videos in `goldens/` before planning. They show the creative bar; do not copy their brands, claims, shots, or wording.
- Use the packaged runner and the canonical Wiggly modules. Do not rebuild the renderer, timing model, prompt builders, or scene contract.
- Ask what the story should focus on: a product, the brand, a customer problem, or a custom idea.
- Product focus requires a catalog product with a usable image. Brand and customer-problem stories do not require a product.
- Treat website research as evidence. A custom brief changes the creative focus but does not authorize new factual claims.
- Show the five story directions before selecting one.
- Validate the selected plan before any image call.
- One explicit approval covers one image call only. Never batch the storyboard and video endpoints.
- Ask once before the two planned video clips. Submit one clip at a time and inspect clip 1 before spending on clip 2.
- Generate one explicitly approved Fish narration only after both clips pass inspection.
- Render the final MP4 locally through the packaged Remotion entry and `AdRenderSurface`. Never rebuild or replace the renderer.
- Never print secret values. Report only missing key names.
- Fail loudly. Do not switch providers, repair model output, retry automatically, or hide an error.

## Agent loop

1. Run `check --stage=plan`.
2. Run `init` with the exported Wiggly website research and the chosen story subject.
3. Ask once before the planning calls, then run `directions`.
4. Show all five directions and let the user choose.
5. Run `select`, then `validate`.
6. Compare the selected direction with the production references. State the concrete hook, the job of the blue explanation world, the visible transformation, the product or subject carried through the story, and the final payoff. If any answer is vague, revise before an image call.
7. Let the user inspect and edit the script, storyboard plan, image prompts, and CTA.
8. Ask before each `image` command.
9. Generate the storyboard first, then full-quality endpoint frames 1, 3, 4, and 6, one approved image call at a time. Frames 1-2 use the lifestyle setup, frames 3-4 use the Style B blue/cyan blueprint-grid explanation stage, and frames 5-6 return to the lifestyle setting for the payoff.
10. Run `inspect`.
11. After explicit approval, generate video clip 1, inspect it, then generate video clip 2.
    - If a clip is still processing, its Replicate prediction ID is saved. Run the same command again without new approval to check that job; never submit a replacement.
12. Run `inspect` again and review `video-contact-sheet.jpg`.
13. Run `voice --approve-voice`, then `render`.
14. Run `inspect`, watch the final MP4, and compare it with at least two production references. Technical completion alone is not a pass.
15. Use `finalize --approve-final` only if the creative result is genuinely usable, then return the finalized MP4 to the user.

## Good result

- The story is understandable without knowing the brand.
- The first two seconds show a concrete product, customer tension, or false assumption. An abstract brand fact is not enough.
- Every factual claim maps to the saved website evidence.
- The five beats sound spoken, not like production notes or AI copy.
- The six-frame plan shows different physical actions in one coherent CGI style across the fixed lifestyle-to-blue-to-lifestyle world sequence. Object-only frames do not invent people.
- The blue world explains an invisible mechanism or change. It is not a decorative background.
- Every major narration beat causes a visible action, object change, or result.
- The approved product or subject remains recognizable through the world change and returns in the payoff.
- All four video endpoints are sharp, use the approved recurring subjects, and show the exact intended start or end state.
- Storyboard panel crops guide endpoint generation but never become Seedance inputs.
- Both 480p clips use one continuous transformation, follow the approved physical action and world transition, and do not jump to another person, unapproved setting, or visual style.
- Narration ends before the 20-second video ends and is not clipped.
- The final MP4 is 1080×1920, 20 seconds, contains audio, and preserves the approved two-clip story.
- A finished file that cannot credibly sit beside the Kiala and Theragun production references must not be finalized.
