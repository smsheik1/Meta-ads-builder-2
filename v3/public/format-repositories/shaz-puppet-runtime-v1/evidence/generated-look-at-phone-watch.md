# Generated action watch: look at phone

- Recipe: `poses/generated/look-at-phone.json`
- Recipe SHA-256: `7a8b8d57fccfa6ae9a8469be7b34af6f7b0ea3df25103710bf35e36a07822ec2`
- Render SHA-256: `2825fcd569085a73605cb1b381e6fffeaa9f5031eb8ea5ab78558fe323fa5d1c`
- Receipt SHA-256: `b239d2e8b6a6ad884792dca877ead222a2282cc82bf41e7020873eeec0fd6297`
- Inspection SHA-256: `b69d311f69442b4eb6c548d422a20e2fdbc83666b3d164e6b9546fe40de5e9fb`
- Automated inspection: PASS, 55/55 frames, zero failures
- Visual inspection: `/watch-video` on a 4x slowed render, all 12 extracted frames read

## Visual result

The action begins in the neutral pose, brings in a verified phone prop without a translucent ghost, carries the authored hand-to-face mechanics into a focused tap/point, and settles with head, hair, torso, and free arm overlapping naturally. The eyes remain open and track toward the phone. No detached joints, clipping, paint-order errors, facial pops, or prop duplication were visible.

## Rejected iteration

Version 2 linearly faded the phone through the character during the anticipation. Version 3 keeps it fully hidden through frame 6 and reveals it on the physical pickup beat.
