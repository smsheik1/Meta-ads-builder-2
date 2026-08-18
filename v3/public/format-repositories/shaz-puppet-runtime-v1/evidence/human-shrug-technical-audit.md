# Human-authored shrug technical audit

The supplied artist demo was audited end to end before revising any generated action. The audited action is the 31-frame shrug in the original Xstage source, frames 67–97. Normalized frame registration against the demo selects demo frames 33–63 as its matching segment.

## What makes it read as authored animation

1. **Specific timing, not generic smoothing.** Source frames 67–69 form the setup and palm-up anticipation. The largest visible change occurs from frame 69 to 70 in a single frame. Frames 71–76 settle that accent. Frames 76–86 hold the readable pose. Frames 87–95 add a smaller facial/body afterbeat, and frames 96–97 release.
2. **Asymmetric arcs.** The two hands do not mirror perfectly. One reaches farther outward while the other finishes higher; the head counter-rotates relative to the torso.
3. **Overlapping controls.** The master, head, arm master, individual arm pivots, forearms, and hands use distinct timing. The important chains contain up to 22 sampled states across 31 frames.
4. **Purposeful substitutions.** Palm-up hands appear at source frame 69. Transitional release hands appear at 95 and return to neutral at 96. Eyes/pupils change at 69, 91, and 95. The mouth remains unchanged.
5. **Non-rigid torso behavior.** At the one-frame accent on source frame 70, the second torso bone differs from rest by 16.715° and the pouch curve tangent differs from rest by 17.328°. These are deformation controls, not ordinary PEG transforms.
6. **Invisible construction.** The artist render contains no raw upper-arm guide capsules, duplicate overlay/color-art contours, open collar, or visible shoulder/elbow seams.

## Measured correction to the generated approach

The earlier Excited Celebration recipe sampled only selected shrug frames, linearly filled the gaps, and repeated the arm gesture twice in 30 frames. That changes the source timing grammar and removes its long readable hold. The corrected one-pose experiment must instead preserve the full 31-frame source cadence and control overlap, then apply only the semantic deltas needed to turn the shrug into a celebration.

No finished artist-rendered frame is a runtime or generation input. The demo frames were used only for offline visual measurement; the runtime inputs remain the recovered Xstage graph, compiled TVG drawings, pose controls, substitutions, and derived deformation values.
