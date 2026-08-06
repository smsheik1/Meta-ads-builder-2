# Mixamo Character Motion

This Wiggly Repo turns a user-downloaded Mixamo Collada animation into a deterministic, full-body character clip. It keeps every source frame, scales root travel from actual leg-chain lengths, maps Mixamo leg direction and extension onto physically reachable target poses, grounds each foot with a deterministic FABRIK constraint, maps fingers when the character supports them, and resets protected face and eye bones every frame.

The first proof character is SpongeBob. The same runtime accepts another verified character by adding one character pack with a semantic bone map; renderer code must not change for a content or character swap.

## Command loop

```bash
npm install
npm run check
npm run smoke
node runner.mjs init --run=my-motion --motion=pointing-taunt
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

## Format boundary

| Fixed mechanics | Replaceable inputs |
|---|---|
| Official renderer, retargeter, timing, root scaling, contact grounding, quality gates | Verified character ID, normalized motion ID, title, background |

## What good means

- The output contains every source frame exactly once.
- Major body, hand, and finger poses retain the Mixamo motion's identity.
- Root travel remains proportional rather than being silently removed.
- Feet follow their normalized source trajectories without exceeding target-leg reach; contact feet do not sink into the floor and jump frames may leave it.
- Eye, lid, mouth, and facial overlay bones retain their authored local transforms.
- Automatic checks pass and a human approves the resulting movement before finalization.
