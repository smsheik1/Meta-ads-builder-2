# Ah-ha action certification

Status: **certified; user-approved**.

## Candidate

- Action: `aha`
- Intended meaning: a sideways point snaps upward into an enthusiastic realization
- Source Xstage frames: 189–201
- Phase-aligned artist-reference frames: 154–166; the supplied montage repeats one hold frame before this action, so Ah-ha uses a 35-frame local offset rather than Think's 34-frame offset
- Duration: 13 frames / 0.541667 seconds at 24 fps
- Registry file SHA-256: `e3ebc83fa6409be5ac66ce77189ff445bf38352f16ccaf5423756ae95174d654`
- Runtime semantic recipe SHA-256: `6bb1e4b5905c87015f5a21c7950ccebe4882907c82a8aecf861668eb17ac23a1`
- Runtime MP4 SHA-256: `8dafa158984a8915b63c41db048c5a39b696b1685153a7c76af570cd0eab954b`
- Human-versus-runtime comparison SHA-256: `64cceb27b943716a5a3af93c664b0d3ff99f57430a35c817ad1238aa7ddb12f1`
- Close-up real-time-plus-slow review SHA-256: `27abd1f593aca51f429d5ad8d2da62a00c54a6cc0f33b03743a2d8d9f6fa193c`
- Automatic inspection SHA-256: `6ba3fc540c1463d597ed621d4e871f8e2caecc372e7c6c0e7e1355a65901a250`
- Artist-rendered frames used by runtime or generation: **false**

## Acceptance criteria and review

- Preserve the low sideways-point setup for two frames, then reach the raised-finger accent on frame 3.
- Change to the open-mouth realization on frame 5 while keeping the opposite hand planted on the hip.
- Preserve the artist's intentional raised-finger contact with the top edge only on frames 5–8.
- Keep the raised sleeve, shoulder, finger, mouth, eyes, hairline, collar, and hip-side hand continuously assembled and correctly colored.
- Preserve live per-frame motion rather than freezing the final Ah-ha pose.

The phase-aligned dense 13-frame sheet and six full comparison phases show the same setup, anticipation, upward arm snap, mouth substitution, raised-finger silhouette, opposite-hand brace, and final hold. The complete 2.666667-second real-time-plus-4x-slow comparison was played in the in-app browser for 3.8 seconds; the final native-player screenshot showed `0:02 / 0:02` at the end of the timeline.

Automatic inspection passed all 13 frames for provenance, layer order, arm composite, hair composite, eye occlusion, collar fill, mouth color ownership, clipping, joint continuity, facial pop, prop presence, and temporal motion. The four top-edge contacts are exactly the source-approved frames 5–8, every eye-envelope overlap count is zero, and the longest identical-frame run is one frame. The aligned encoded comparison measured mean SSIM 0.853062; global registration and rasterization make this supporting evidence rather than the creative gate.

No renderer, control, drawing, or timing edit was made for Ah-ha. The only recipe change is its honest semantic ID. The supplied reference montage was aligned by action phase rather than imposing another pose's frame offset.

## Human approval

- Reviewer: user
- Decision: approved as a separate “Ah-ha!” body gesture
- Approved on: 2026-08-18
- Approved artifact: `shaz-aha-closeup-review.mp4`
- Approved SHA-256: `27abd1f593aca51f429d5ad8d2da62a00c54a6cc0f33b03743a2d8d9f6fa193c`

## Promoted learning

**What did this teach us, and does the skill, runtime, or test suite need updating?** Yes, but only as a reusable judgment rule. A polished destination and clean inspection do not prove that a source segment is the complete action. The user correctly identified that the pre-sliced `idea` clip omitted the continuation of the pointing performance, while also confirming that the segment works as a standalone Ah-ha gesture. The skill and playbook now require contextual frames on both sides of every proposed cut and require incomplete but useful subgestures to receive honest semantic names. No renderer or automated gate was added because semantic action completeness cannot be inferred reliably from pixels alone.

Ah-ha is certified. The loop may now rebuild Point from the full artist performance rather than the old second-half-only segment.
