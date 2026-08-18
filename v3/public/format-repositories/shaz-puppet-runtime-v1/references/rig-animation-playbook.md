# Shaz rig animation playbook

Read this file completely before recreating, creating, diagnosing, or certifying a Shaz action. Keep `SKILL.md` concise; store rig-specific techniques and proven failure patterns here.

## Definition of done

An action is certified only when:

- the complete candidate has been watched at normal speed;
- dense frames and relevant close-ups have been inspected;
- the character remains on-model with continuous finished silhouettes;
- deformation, substitutions, expression, timing, and framing read correctly;
- automatic pose inspection and focused regression tests pass;
- synchronized reference comparison passes when an artist reference exists;
- human approval names the exact output checksum; and
- the post-pose learning question has been answered.

## Analyze before authoring

Use the smallest combination that answers the current uncertainty:

1. Watch the complete reference and candidate at normal speed to judge rhythm, weight, and readability.
2. Decode every frame or create a dense chronological sheet to find one-frame accents, holds, pops, and substitution changes.
3. Align reference and candidate by action phase, not merely by equal timestamps.
4. Inspect close crops of shoulders, elbows, hands, face, mouth, hairline, collar, and any changing silhouette.
5. Measure frame differences and longest identical-frame runs to distinguish a living hold from a freeze.
6. Inspect alpha bounds and connected components for detached fragments, missing fill, or clipping.
7. Inspect the Xstage hierarchy, PEG controls, deformation channels, drawings, and source substitutions when visual evidence does not identify the cause.

Rendered artist frames are evaluation evidence only. Never use them as runtime sprites, pose-generation inputs, or copied motion data.

## Author in the right order

### 1. Assembly and silhouette

Make the character look like one finished drawing before judging the animation. Hide construction artwork, join intended sleeve components, preserve collar and skin fills, remove stray drawing components, and respect recovered paint order.

Useful techniques:

- Composite upper-arm construction fill beneath the finished sleeve and outline the visible union rather than drawing the overlap seam.
- Reconstruct AutoPatch and Overlay/Colour Art behavior where Harmony concealed elbow or shoulder seams.
- Use component filtering or masks when a drawing contains both intended artwork and a stray fragment.
- Preserve artist-authored flat shading as a separately masked color region when ordinary layer order replaces it incorrectly.

### 2. Deformation and attachment

Confirm that shoulders, sleeves, torso, hands, hair, and face remain attached across the entire range.

Useful techniques:

- Preserve along-chain progress and perpendicular distance when inverse-mapping a bone deformation.
- Extrapolate beyond deformation endpoints instead of clamping pixels to the final bone.
- Apply animated bone-radius changes to transverse mapping; ignoring radius creates white gaps and pinched shoulders.
- Treat curve and bone deformation values as primary motion controls, not optional polish.

### 3. Substitutions and expression

Use the rig's authored drawings when the silhouette or expression changes. Do not force a single hand, eye, or mouth drawing to imitate a different view through rotation and scale.

Check hand orientation, transitional drawings, pupils, eyelids, mouth/teeth, fingers, visibility, and the exact frame on which each substitution changes.

### 4. Timing grammar

Recover the action's phases before editing curves:

- neutral or setup;
- anticipation;
- primary accent;
- overshoot;
- settle;
- readable living hold;
- secondary afterbeat; and
- release or neutral reset.

Preserve asymmetry and overlap. Head, torso, arm master, individual arm pivots, forearms, hands, eyes, pupils, mouth, and hair should not all change on one shared key. A hold may contain secondary drift, eye changes, or a smaller counter-settle.

### 5. Semantic change

For a new expression, begin from the nearest certified motion grammar only when it genuinely matches the desired mechanics. Preserve its complete secondary choreography, then change the fewest controls and substitutions necessary to alter meaning. Do not merely relabel an existing action.

## Failure signatures

| Visible failure | Diagnose first | Common correction |
| --- | --- | --- |
| Black capsule seams across sleeves | Construction art and composite order | Hide construction outlines; synthesize the finished sleeve union |
| White shoulder-to-torso split | Deformation-radius mapping | Apply animated transverse radius |
| Body stretches into a stem | Bone inverse-map endpoint behavior | Extrapolate rather than clamp |
| Hairline has a dark wedge or stray crescent | Component masking and shade ownership | Filter the stray component; restore the artist shade mask |
| Missing finger, teeth, eye, or mouth color | Drawing substitution and fill extraction | Use the intended drawing and verify its color/line layers |
| Pose reads correctly but feels choppy | Phase timing and secondary controls | Recover accents, overlaps, living hold, afterbeat, and release |
| Long frozen hold | Omitted secondary source controls | Preserve the complete control choreography; add a temporal gate |
| Motion is smooth but generic | Uniform interpolation | Use explicit asymmetric accents, overshoot, settle, and rebound |
| Several defects move between poses | Work scope is too broad | Stop and perfect one action end to end |

## Things to avoid

- Do not start with a polished destination pose and fill the gap with generic interpolation.
- Do not sample a few source frames and assume linear in-betweens preserve the artist's cadence.
- Do not copy only the largest PEG controls.
- Do not animate multiple uncertified actions in one iteration.
- Do not diagnose timing while the silhouette is structurally broken.
- Do not accept passing code, a successful render, or three screenshots as evidence that the animation works.
- Do not weaken inspection thresholds to accommodate an observed defect.
- Do not add pose-specific renderer branches when a recipe or existing substitution can express the action.

## Post-pose learning policy

After approval, answer: **“What did this teach us, and does the skill, runtime, or test suite need updating?”**

Classify each lesson:

- **Pose-specific:** keep it in that action's evidence or recipe source.
- **Reusable judgment:** update this playbook or the concise rules in `SKILL.md`.
- **Mechanical invariant:** update the renderer and add a regression test or inspection gate.
- **Unproven hypothesis:** record it in evidence, but do not promote it yet.

For every promoted lesson, record:

1. the visible behavior;
2. the root cause;
3. the smallest reusable correction;
4. the exact evidence that proved the correction; and
5. the file or gate that now prevents recurrence.

If the same lesson recurs, escalate it instead of repeating prose: strengthen the instruction on the second occurrence and automate a mechanical gate whenever the failure can be detected reliably.

## Proven baseline from Shrug

The held-out Shrug established the first standard:

- Preserve a complete 31-frame cadence rather than resampling a few poses.
- Retain asymmetric hands and counter-rotation between head and torso.
- Preserve distinct timing across master, head, arm master, arm pivots, forearms, hands, eyes, and pupils.
- Use purposeful hand and eye substitutions at their authored frames.
- Preserve non-rigid torso deformation and pouch-curve behavior.
- Hide upper-arm guides, duplicate contours, collar gaps, and shoulder/elbow seams.
- Copy secondary controls to keep the hold alive.

See `evidence/human-shrug-technical-audit.md` and `evidence/excited-celebration-one-pose-review.md` for the measured evidence.
