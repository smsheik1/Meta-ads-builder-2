# Candidate 11: pose-first Present screen-right

Status: mechanically clean `recipe-candidate`; destination-hold creative review pending. It is not registered, sequence-approved, or packet-eligible.

## Why the first approach missed

The old candidate copied a complete Shrug-derived 31-frame action because its open hand pointed in roughly the right direction. That also imported Shrug's torso deformation, cadence, and release. It never measured the artist's shoulder, elbow, wrist, or palm, so the result was a semantic approximation rather than a reconstruction.

The isolated 0826 clip also contains two different held silhouettes: Hold A at frames 6–60, a counter-shift at 61–70, and Hold B at 71–103. There is no release. The corrected candidate chooses settled Hold B, frame 80, as the canonical `present-screen-right` destination. Hold A remains a separate possible lean-in variant.

## Corrected method

1. Segment the reference into entry, stable holds, and counter-shifts before authoring.
2. Choose one stable gold frame and describe the missing boundaries honestly.
3. Start from a complete native shoulder-to-hand chain, not a similar action's full recipe.
4. Keep the neutral body deformation and omit all face tracks.
5. Fit shoulder, elbow, wrist, palm center, palm angle, and torso line independently.
6. Store the normalized artist targets in `candidate-11-present-screen-right-target.json` and gate them in `tests/candidate-11-present-screen-right.test.mjs`.
7. Review the exact destination hold before authoring neutral entry and release connectors.

The final native control deltas from authored Shrug frame 82 are intentionally small and scoped: `Right_Arm_MOVE-P` position `[0.10,-0.51,0]`, `Right_Forearm_Pivot-P` rotation `-14°`, and `Right_Hand-P` rotation `+18°`. The hand and sleeve drawings remain registered native drawings. Shrug's body deformation, face, timing, and release are not used.

Reference normalization is reproducible rather than eyeballed: the resized artist hair span is 362 px and the runtime span is 274 px, so the uniform scale is exactly `137/181`. The scaled artist face centroid is then translated onto the runtime face centroid. The focused test recomputes that transform and every stored landmark, including a palette-measurable upper cuff-envelope proxy for the wrist; native wrist connectivity remains the unchanged inspector's responsibility.

## Exact result

- Recipe file SHA-256: `6fb4a6ae1d5f4c72055675e23c5af6c1c8003c402ea46896c9393848c6bd39f8`
- Semantic recipe SHA-256: `5d2d5546d5d05c119ace4e40f3d58345d3f3930ebebf09664802b95a46e1ddb3`
- Official lossless frame SHA-256: `2a8f8ad8e5f56d697a982f210e28124deb49504d98e76adbeb1a4a44c0f6cdd8`
- Inspector: 1/1 frame, zero failures, unchanged gates
- Shoulder error: 0.47 px
- Elbow error: 2.48 px
- Upper wrist-anchor error: 3.50 px
- Palm-centroid error: 2.11 px
- Palm-axis error: 0.21°
- Sleeve-centroid error: 6.15 px
- Torso-band error: 0.73°

The review comparison SHA-256 is `8b70c891ebed13639c1016fdd362773f910ec582359c2ea3cf3ac1cb04f456ee`. Its receipt remains pending. Even if the destination is approved, separate neutral connectors and their own normal-speed review are required before registration.
