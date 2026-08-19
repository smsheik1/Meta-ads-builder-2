# Think action certification

Status: **certified; user-approved**.

## Candidate

- Action: `think`
- Source Xstage frames: 117–165
- Registered artist-reference frames: 83–131, using the established 34-frame export offset
- Duration: 49 frames / 2.041667 seconds at 24 fps
- Registry file SHA-256: `6fc21c25dd49a6bf18eae49886c6ebb95a41367461a792655d450377ddb16d12`
- Runtime semantic recipe SHA-256: `8f260f187de082b1cf0ce4f0b0b8cb78dcb808e9f04662ba0630298e503e800f`
- Runtime MP4 SHA-256: `60a25276e88ec11c3f082026c93424319e1d39f5dc643c0bd553a222cd596767`
- Human-versus-runtime comparison SHA-256: `88bf5f80bfa508e3695728e882f21e08ab1bd764076357c783a3b5160aa18582`
- Close-up real-time-plus-slow review SHA-256: `d3eca168749f24f5df840375649b012a2e28d458c8e6b2e16f3db2cfd1c29d59`
- Automatic inspection SHA-256: `5e3b87ed6c8911e871460932061a7182767a015bc403f64aa88cde8fa001bf09`
- Artist-rendered frames used by runtime or generation: **false**

## Review completed

- Extracted and aligned all 49 artist-reference frames against the 49-frame runtime replay.
- The user rejected v1 because the front hair visually covered the eye during the head-tilt transition. v1 is not an acceptable candidate.
- Rejected v3 after a tighter aligned crop proved its contour-only cleanup still left brown hair fill visible through the transparent upper half of the viewer-left eye. v3 is not an acceptable candidate.
- Traced the failure to a missing Harmony-style semantic eye matte, rather than Think timing, head controls, layer order, or front-bang registration. Drawing 4 contains only the visible half-eye, so its raw alpha is not the complete region the eye owns.
- The v4 runtime infers a full round eye envelope from each partial eye drawing and clips the front bang behind that invisible envelope before painting the visible eye. It removes both hair fill and outline without moving the bang or creating a visible skin notch.
- Played the complete corrected v4 close-up comparison at normal speed and 4x slow in the in-app browser. The exact 10.166667-second candidate was allowed to run for 11.5 seconds; the final native-player screenshot showed `0:10 / 0:10` at the end of the timeline.
- Inspected a dense 49-frame contact sheet and nine full comparison phases: setup, arm anticipation, hand substitution, face contact, first eyelid change, contemplative settle, second eyelid change, release accent, and final hold.
- Automatic pose inspection passed every frame for provenance, layer order, finished arm composite, hair composite, eye occlusion, collar fill, mouth color ownership, clipping, joint continuity, facial pop, prop presence, and temporal motion. Every frame measured zero opaque front-bang pixels inside either eye envelope.
- The longest identical-frame run is one frame. The action preserves live drift rather than freezing its contemplative hold.
- Encoded full-frame comparison measured mean SSIM 0.871457. Compression, global registration, and minor rasterization differences make SSIM supporting evidence, not the creative acceptance gate; the rejected eye-boundary defect was assessed in aligned close-up frames.
- `npm test` passed all 44 tests and `npm run check` passed.

## Visual findings

The unchanged recovered recipe preserves the artist action's neutral setup, arm sweep across the chest, normal-hand-to-over-line-face-hand substitution, fingers-to-chin contact, opposite hand-on-hip brace, head drag, torso counter-motion, repeated eyelid and pupil changes, mouth change, asymmetrical settle, and living hold. Corrected v4 keeps both partial eyes readable and prevents the front-bang fill or contour from entering their full semantic envelopes. No missing color, construction seam, detached hand, clipping, frozen hold, or new facial pop was found in the dense review.

The first inspection attempt incorrectly rejected frames 7–49 because it required the hidden normal left hand to remain visible after the authored `OL_Hand` face-contact substitution. The gate now accepts `OL_Hand` as the intentional finished substitute for the left hand while still rejecting visible upper-arm construction artwork. A focused regression protects this behavior. Two additional regressions now require partial eye drawings to recover a full invisible envelope and require artwork behind that envelope to lose both its fill and outline while preserving unrelated hair.

## Human approval

- Reviewer: user
- Decision: approved
- Approved on: 2026-08-18
- Approved artifact: `shaz-think-closeup-review-v4.mp4`
- Approved SHA-256: `d3eca168749f24f5df840375649b012a2e28d458c8e6b2e16f3db2cfd1c29d59`

## Promoted learning

**What did this teach us, and does the skill, runtime, or test suite need updating?** Yes, but only one durable rule emerged. The visible alpha of a partial substitution is not necessarily the complete region it owns. In Think, the half-eye drawing left its upper region transparent, allowing the front-bang fill to appear inside the eye even though paint order and geometry were otherwise correct. The renderer now infers the full round eye envelope and clips the front bang behind it; the concise skill and detailed playbook now require semantic ownership mattes instead of coordinate nudges or contour-only cleanup; unit regressions protect envelope construction and clipping; and the independent per-frame inspector rejects missing envelope receipts or any opaque bang overlap. The exact `-4/-3` offset, contour radius, Think frame number, and unchanged Think timing were rejected as pose-specific or failed tactics and were not promoted.

Think is now certified and the loop may advance to the raised-finger Ah-ha gesture.
