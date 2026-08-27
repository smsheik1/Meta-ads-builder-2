---
name: shaz-puppet-runtime
description: Render, author, diagnose, and certify repeatable 2D Shaz puppet animation using the recovered Toon Boom rig, verified pose recipes, and one Harmony-free runtime. Use for assembling registered actions, recreating an artist-authored action, creating or refining a Shaz pose, fixing puppet seams or deformation defects, and promoting proven animation lessons into the skill, runtime, or regression tests.
---

# Shaz Puppet Runtime

Skill version: **1.6**.

Use this kit when the user wants a video assembled from the registered Shaz actions in `poses/index.json` or wants to author and certify one action through the recovered rig. The kit is fully local, makes no provider calls, and costs $0.

## Choose the mode

- **Sequence operation:** assemble already registered actions. Follow the required runtime workflow below.
- **Action authoring:** recreate, create, diagnose, or refine exactly one action. Read `references/rig-animation-playbook.md` completely, then follow the author-and-learn loop. Do not work on several uncertified actions at once.

## Required workflow

1. Read `README.md`, `input-contract.json`, `composition-contract.json`, `output-contract.json`, `quality.json`, and `content-boundary.json`.
   When planning new capabilities, evaluating completeness, or changing the Format, also read `ROADMAP.md`; it is the canonical backlog and build order.
2. Run `npm install` once, then `npm run check`, `npm run inspect:registry`, and `npm run smoke`.
3. Write an input JSON that uses only registered `poseId` values. Use explicit `holdFrames` and `gapFrames`; the last action must use `gapFrames: 0`.
4. Start a new run with an absolute input path:

   `npm run init -- --run=my-run --input=/absolute/path/input.json`

   For an audio-backed `shaz-sequence-input-v1`, also supply `--audio=/absolute/path/audio`. The bundled Cherry 0.1.0 WASI engine generates and checksum-binds speech cues by default. Add `--lipsync-cues=/absolute/path/cherry.tsv` only when supplying a real Cherry TSV for that exact audio, or add `--lipsync=off` when the user explicitly wants audio without mouth animation. Never generate cyclic placeholder cues or reuse a cue file from another audio checksum.

   The separate `shaz-body-language-performance-v1` semantic performance mode remains body-language-only in Format 0.2.0. Its audio controls duration and gesture scheduling, not mouth drawings.

5. Run, in order:

   - `npm run validate -- --run=my-run`
   - `npm run render -- --run=my-run`
   - `npm run inspect -- --run=my-run`

6. Watch `agent-runs/my-run/final.mp4` completely. Inspect `contact-sheet.jpg` and `quality-report.json`. Do not approve a video you did not watch.
7. Edit only `agent-runs/my-run/human-review.json`: set `status` to `approved` or `rejected`, keep the exact `reviewedOutputSha256`, name the reviewer, and add concise notes.
8. Run `npm run finalize -- --run=my-run`. Delivery is blocked when validation, inspection, checksums, or human review do not pass.

## Author-and-learn loop

1. Select exactly one action and define the reference segment, intended meaning, duration, and visible acceptance criteria. Audit contextual frames before and after the proposed cut: include setup through release, or explicitly certify a narrower microgesture under an honest semantic name. Never let a preexisting filename define the action boundary.
2. Audit the complete reference at normal speed, then inspect dense decoded frames and consecutive-frame differences. When source controls exist, inspect their timing, hierarchy, drawing substitutions, deformation channels, and asymmetry. Detect intentional stepped exposures and holds before choosing interpolation; do not infer motion from a single destination frame.
3. Render the authored calibration through the official runtime before changing its semantics. Fix renderer-wide silhouette, deformation, masking, fill, or paint-order defects before adjusting timing.
4. Author through real rig controls and existing drawing substitutions. Preserve secondary controls and living holds; apply the smallest semantic delta that produces the intended action.
5. Run focused tests and independent per-frame pose inspection. Compare synchronized full-frame and close-up playback against the reference where one exists.
6. Watch the exact candidate completely at normal speed; slow motion is diagnostic evidence, never the sole approval view. A successful command, contact sheet, or sparse frame sample is not visual approval.
7. Permit at most three candidate attempts. Fix only observed causes. Stop and report the blocker instead of weakening a gate.
8. After the action is genuinely approved, ask exactly: **“What did this teach us, and does the skill, runtime, or test suite need updating?”**
9. Record the behavior, root cause, smallest reusable correction, and evidence. Promote the lesson according to the rules in `references/rig-animation-playbook.md`; update the recipe checksum only after the accepted file is final.
10. Register and sequence the action only after inspection and checksum-bound human approval pass.

## 80/20 rules

- Protect the finished silhouette and character assembly before polishing motion. Visible seams, detached joints, missing fills, or construction artwork invalidate timing judgments.
- Reproduce timing grammar rather than applying generic smoothing: anticipation, accent, overshoot, settle, readable living hold, afterbeat, and release.
- Preserve authored presentation cadence. If the reference intentionally animates on twos or holds an exposure, encode those steps instead of inventing smooth in-betweens.
- Preserve the whole control choreography. Major arm and head keys alone are rarely sufficient.
- Treat drawing substitutions, visibility, AutoPatch-style masking, and paint order as animation controls.
- Distinguish visible alpha from semantic ownership. A partial eye, hand, or facial drawing may own a larger matte than its painted pixels; reconstruct that envelope and clip occluders behind it instead of shifting artwork or erasing only an outline.
- Treat internal palette ownership as content: shape, opacity, and connectivity can all pass while teeth, eye whites, tongues, or skin are painted incorrectly. Add direct color-presence gates for stable semantic regions.
- Prefer limbs animated through their common rig ancestor, with one continuous native shoulder-to-finished-sleeve-to-hand chain per side. Independent screen-space pieces and multi-fragment limb assemblies are forbidden. If three bounded native-rig attempts prove that the recovered drawings and pivots cannot form an essential destination, one coherent, part-specific registered pose drawing may replace the complete corresponding native parts. It must be user-supplied or explicitly authored for the pose, exact-hash and exact-transform locked, use a declared paint layer, preserve the runtime-rendered head and body, and never overlap visible native counterparts. This is a substitution drawing, not permission for a generic full-character sprite.
- A front overlay hand recipe may record its recovered native sleeve owner as descriptive, validated metadata, but that declaration does not create ownership. The renderer must derive the actual cuff owner from rig topology, matte the overlay at that derived finished cuff, and enforce the rendered hand role's geometry limits; recipe metadata cannot relax those limits. Inspect the semantic wrist joint because overlap with the face or torso is not attachment evidence.
- When reusing an authored gesture, keep its authored wrist states with the substituted hand drawings. Do not import wrist transforms from an unrelated frame range or inflate hand scale to force contact.
- Establish handheld props before contact and keep the hand inside the native rig hierarchy. A prop cannot masquerade as a hand, finger, fist, sleeve, or arm; matching coordinates do not create a joint. A prop-free alias removes the prop while leaving the native gesture controls and drawings unchanged. The registered pose-drawing exception above is allowed only as a complete, mutually exclusive semantic substitution and never as a prop-interaction shortcut.
- Reject a candidate when dense transition frames or normal-speed playback show a detached, duplicated, missing, scale-popping, undersized, oversized, or independently drifting limb. Whole-character connectivity is insufficient. An asset ID alone is not proof: package only registered assets; verify native semantic shoulder/cuff/wrist joints and proportions directly; and for a registered pose drawing verify its exact asset bytes, transform, paint layer, complete native-part suppression, and preserved body/head pixels. Structural checks never replace complete normal-speed playback.
- Diagnose by failure layer: assembly first, deformation second, substitution/expression third, timing fourth, polish last.
- Turn repeated mechanical failures into tests or inspection gates; do not rely on an agent remembering prose forever.

## Important boundaries

- `runtime/rig-v2-renderer.mjs#renderRigFrame` is the only renderer for smoke, proof, and final output.
- Lip-sync may override only the registered `Mouth` drawing at each output frame. It must not change body controls, pose order, hold length, deformation, props, framing, or any other face drawing. The bundled Cherry 0.1.0 WebAssembly engine runs locally through Node WASI; it is a cue generator, never a second renderer. Validation must bind the exact engine artifact, cue file, and audio checksums.
- Do not download, invoke, or require a native `cherrylipsync` executable. Use `npm run lipsync -- --audio=/absolute/path/audio --output=/absolute/path/cues.tsv` for cue-only generation, or let audio-backed sequence initialization call the same bundled engine automatically.
- Treat the waist-up crop as part of the composition contract: the hoodie must continue below the bottom edge throughout every used action, while hands and pointing gestures retain clear horizontal margins. Never reveal the rounded lower hoodie boundary or invent legs.
- Finished artist-rendered animation frames may define phase, presentation cadence, and acceptance criteria, but never become runtime sprites, deformation data, or generated pose artwork. A user-supplied pose-design drawing may be registered transparently as destination artwork under the strict substitution contract above; disclose it separately from the recovered Xstage drawings.
- Never bypass `poses/index.json` with arbitrary recipe paths.
- Do not weaken per-frame clipping, joint continuity, layer order, prop, facial-pop, or provenance gates to make a run pass.
- Up to three render attempts are allowed per run. Fix the input or recipe between attempts; do not create shadow runs to evade the limit.
- Do not use a generic crossfade, whole-character bounce, or uniform interpolation as a substitute for body mechanics.
- Do not copy only obvious controls, approve from sparse screenshots, or patch several poses simultaneously.
- Adding a genuinely new action is an authoring task, not a sequence-input change. Follow `references/rig-animation-playbook.md` and `poses/README.md`, validate the recipe independently, register its checksum, and add evidence before using it.

## Return to the user

Return the absolute path to `final.mp4`, the video checksum from `delivery.json`, the ordered action list, and whether any limitations remain. Never claim delivery if `delivery.json` is absent.
