# Mixamo Character Motion

This Wiggly Repo turns a user-downloaded Mixamo Collada animation into a deterministic, full-body character clip. It normalizes motion against Mixamo's inverse-bind matrices so the first and last animation samples do not collapse into the target model's T-pose. It keeps every source frame, scales root travel from actual leg-chain lengths, maps Mixamo leg direction and extension onto physically reachable target poses, grounds each foot with a deterministic FABRIK constraint, maps fingers when the character supports them, and resets protected face and eye bones every frame.

The verified characters are SpongeBob, Squilliam Fancyson, and Mr. Krabs. Squilliam's rear and front tentacles are paired per side so his animation reads as two joined legs, matching the show's visual shorthand. Mr. Krabs proves an ankle-ended, clawed rig. All three use the same renderer; character differences live in semantic motion profiles rather than proof-specific animation code.

## Command loop

```bash
npm install
npm run check
npm run smoke
node runner.mjs init --run=my-motion --motion=taunt
node runner.mjs validate --run=my-motion
node runner.mjs render --run=my-motion
node runner.mjs inspect --run=my-motion
node runner.mjs finalize --run=my-motion --human-review=pass
```

Import another Mixamo motion locally:

```bash
node runner.mjs import-motion --source=/absolute/path/to/Motion.dae --id=my-motion --label="My Motion"
```

The source `.dae` is read locally and is not copied into the Repo. The normalized motion preserves provenance through its filename and SHA-256.

For an already verified character, this is intentionally close to “select an animation and go”: download the standard Mixamo `.dae`, import it once, select its motion ID, and run the normal validate/render/inspect loop. Blender and manual keyframing are not required. The inspection step remains mandatory because an extreme motion can still expose character-specific intersections or grounding limits. A brand-new character still needs a one-time semantic bone profile and visual proof.

## Format boundary

| Fixed mechanics | Replaceable inputs |
|---|---|
| Official renderer, retargeter, timing, root scaling, contact grounding, quality gates | Verified character ID, normalized motion ID, title, background |

## Character profile contract

A character pack declares its root, mapped body bones, protected face bones, primary foot chains, mapping-specific fidelity tolerance, optional paired bone chains, and an optional bounded vertical-root grounding allowance. Paired chains let multiple modeled limbs move as one readable screen leg without motion-specific code. The grounding allowance handles short or ankle-ended legs without changing horizontal source travel, and its required/applied correction is recorded in the motion report. A new character must pass a full-clip render and human review before it is considered motion-ready.

## What good means

- The output contains every source frame exactly once.
- Major body, hand, and finger poses retain the Mixamo motion's identity.
- Root travel remains proportional rather than being silently removed.
- Feet follow their normalized source trajectories without exceeding target-leg reach; contact feet do not sink into the floor and jump frames may leave it.
- Eye, lid, mouth, and facial overlay bones retain their authored local transforms.
- Character-profile limb pairs stay joined for the full clip.
- Automatic checks pass and a human approves the resulting movement before finalization.
