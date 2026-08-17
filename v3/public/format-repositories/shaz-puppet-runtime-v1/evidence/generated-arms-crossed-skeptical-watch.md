# Generated action watch: arms crossed / skeptical

- Recipe: `poses/generated/arms-crossed-skeptical.json`
- Recipe SHA-256: `a5a56f6d36742c4a0a43fd0003d05a6c0b634c94d3e4948ebc8fe59fbda00103`
- Render SHA-256: `ab9da6f39d99d63efdfaa1627235a7a6fd663eb9f179f01691e66f0e5d36d96d`
- Receipt SHA-256: `891651ccf25e2bf920b72a6f281d999400a419c6b343d183074a6a1781b1a1d8`
- Inspection SHA-256: `86b791ac08ee9584c0988d623f2854b6ee061b49b1c49bba9b89bab6f70ddda6`
- Automated inspection: PASS, 19/19 frames, zero failures
- Visual inspection: `/watch-video` on a 6x slowed render, all 10 extracted frames read

## Visual result

The two arms remain attached at the shoulders in neutral, anticipate outward, lead with the hands, overshoot into a high cross, and settle lower across the chest while the head, torso, eyebrows, eyes, and mouth counter-settle into skepticism. The crossover is continuous rather than a pose pop. No detached limbs, clipping, translucent substitutions, paint-order errors, facial pops, or choppy holds were visible.

## Why a minimal substitution was required

The recovered source rig permanently paints the left arm behind the torso and the right arm in front, so its original arm drawings cannot exchange depth at the crossover. A checksum-verified, rig-colored arm substitution is used only for this action. Each arm remains independently animated by ordinary recipe keys; no finished artist-rendered frame is used.

## Rejected iterations

- Versions 1–5 attempted the crossover using only the fixed-depth source limbs; they could bend but could not exchange depth convincingly.
- Version 6 used a single crossed-arm overlay; the held pose read correctly, but the overlay popped into place.
- Versions 7–8 separated the arms and revealed shoulder tracking and proportion errors. Version 9 corrects both and is the accepted render.
