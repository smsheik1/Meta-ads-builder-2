# Point action certification

Status: **approved and certified**.

## Approved action

- Action: `point`
- Intended meaning: a complete pointing performance with a raised-finger Ah-ha accent inside it
- Source Xstage frames: 189–264
- Phase-aligned artist-reference frames: 154–229
- Duration: 76 frames / 3.166667 seconds at 24 fps
- Registry file SHA-256: `fcc7f489498683514104d7612dc4fbf5be22243b1f867b6190db74c8e9225a39`
- Runtime semantic recipe SHA-256: `82dde0723d1d283dba4470f0a1874f8e3f57048197f6b82c76774e1effae4f02`
- Runtime MP4 SHA-256: `bae1e529eed24ca852be1db5030b865fe3fffe701f6854e6191eeed69feb2bd4`
- Normal-speed human-versus-runtime comparison SHA-256: `9f4770960f669a0bc8356c1be1d56b874fb803a85a7d91dc06d3ea59b5ebf388`
- Real-time-plus-4x-slow approval artifact SHA-256: `37ef0723a61feaeb55ed9eae5baba4739ad7c4422f8453bdb640fedae56e6ce4`
- Automatic inspection SHA-256: `76f9aa4de24342c9c760e4a827d637cadf49b0e83f4bfbaaf0f26ff2b9174886`
- Drive approval artifact: `https://drive.google.com/file/d/1pNGx1CzB5umohOtJsemXskvGppSINsQm/view?usp=drivesdk`
- Artist-rendered pixels embedded, copied, or used as deformation data: **false**

## Acceptance criteria

- Preserve the opening sideways point rather than beginning halfway through the action.
- Snap upward into the approved Ah-ha accent, including the open mouth and opposite hand-on-hip brace.
- Return to the horizontal point with the artist's arm extension, grin, head drag, and rebound.
- Keep the whole character registered without changing the relationships among torso, head, arms, and hands.
- Match the artist's stepped exposure timing, including animation on twos and the intentional 26-frame Ah-ha hold.
- Keep the fingertip visible and the complete frame uncropped.
- Preserve finished sleeve silhouettes, fingers, teeth, hairline, collar, eyes, and hip-side hand through both direction changes.

## Failure chronology and root cause

The first candidate inherited a linear `Shaz_Rig-P.position.x` change from `-0.147145` to `-0.956496`. That channel includes Xstage demo-shot placement rather than intended body acting. Holding `Shaz_Rig-P` still reduced torso drift, but it split the torso from independently animated head and limb branches.

The next correction cancelled that demo-shot motion at `Shaz_Master-P`, the shared ancestor of every body branch. That solved global registration, but normal-speed playback still looked like the body, head, and hands were crawling sideways. Slow playback obscured the defect. The remaining cause was temporal, not spatial: the runtime linearly interpolated controls and deformations during frames the artist presented as stepped exposures and deliberate holds.

The approved recipe retains the shared-master registration and applies the artist's observed presentation cadence to every runtime control and deformation exposure. Its exact change frames are `1, 3, 5, 7, 9, 11, 37, 39, 40, 42, 44, 46, 56, 58, 60, 62, 64, 68, 70, 72, 74, 76`. The approved holds are frames 11–36 and 46–55. All authored controls use hold interpolation between those changes; no generic in-betweens are invented.

The artist render was used to measure phase, cadence, and acceptance only. No reference pixels, sprites, or deformation samples are part of the recipe or runtime output.

## Evidence

- Mean frame change during artist hold windows fell from `1.5458` in the smooth-tween candidate to `0.0045` in the approved stepped candidate.
- Worst branch-relative tracking error fell from `22.52 px` to `2.60 px` for hair, `18.62 px` to `2.85 px` for the left hand, and `9.79 px` to `1.68 px` for the right hand.
- Pocket motion matches the artist with `0.259 px` mean absolute error and `1.187 px` maximum error.
- Temporal frame-difference mean error fell from `1.3536` to `0.0982`.
- Automatic inspection passed all 76 frames with zero failures. The longest identical-frame run is the approved 26-frame Ah-ha hold.
- The user approved the exact Drive artifact on 2026-08-18 after reviewing both normal-speed and 4x-slow playback.

## Retro decision

The recipe, skill, playbook, and focused contract test are updated. The renderer did not need a new branch: the existing recipe format already supports hold interpolation and repeated deformation exposures. Adding another runtime abstraction would not improve the result.
