# Present action certification

> **Status: HISTORICAL EXACT-HASH CERTIFICATION; USER-APPROVED.** The user approved the visual artifact below. Later quality metadata and inspector changes altered the current recipe bytes, so this page does not claim that its recipe hashes are current; `poses/index.json` is authoritative for current bytes.

## Candidate

- Action: `present`
- Source Xstage frames: 37–55
- Duration: 19 frames / 0.791667 seconds at 24 fps
- Registry file SHA-256: `b2f8e2066d30b7aadac1c11f1149940ac438ee08835e88caea4a380c5af81d2f`
- Runtime semantic recipe SHA-256: `0ca0a1a4620d6210d901402488b0ff2f96ed390819d098ba0264645092c1a5e7`
- Runtime MP4 SHA-256: `6975656f4a48f566e5c4fa4c4e168f15c2e441f6862783ff66d4bd06f3105bfa`
- Human-versus-runtime comparison SHA-256: `455eb4f391058ab8c6dabe5b7ffc85a4ca6afb13eb902ce7d9c1890de9ce1eae`
- Real-time-then-4x-slow review copy SHA-256: `792a3f65a300f5c14eaad0cc55ade3bdca1222615e34386b9c2c72b0ea86d257`
- Corrected Mouth-2 main asset SHA-256: `28fe71c9e1e1527b4fc939ce6fffec125a51b38decda3fa0d2b24c35b60401ac`
- Artist-rendered frames used by runtime or generation: **false**

## Review completed

- Registered the corresponding artist-demo segment and compared all 19 frames side by side.
- Inspected five full-size phase pairs covering setup, anticipation, raised-palm accent, settle, and final living hold.
- Automatic pose inspection passed every frame for provenance, layer order, finished arm composite, hair composite, collar fill, mouth color ownership, clipping, joint continuity, facial pop, prop presence, and temporal motion.
- The candidate contains one significant connected character component on every frame and no props.
- The longest identical-frame run is one frame. The recipe now declares `maximumIdenticalFrames: 1`, so a frozen hold cannot silently replace its secondary motion.
- Encoded full-frame comparison measured mean SSIM 0.903896 across 19 frames. The artist-demo export contains paired display frames while the recovered runtime renders every Xstage frame; SSIM is supporting registration evidence, not the creative acceptance gate.

## Visual findings

The runtime preserves the reference action's neutral setup, eyes-closed anticipation, open-palm presentation, opposite hand-on-hip placement, head/torso counter-angle, mouth and eye substitutions, settle, and live final hold. The global sleeve-union, shoulder-radius, collar-fill, back-bang filtering, and forehead-shade corrections remain intact throughout the action.

The first candidate was rejected after the user caught that the upper tooth region in Mouth-2 was skin-colored. The mouth substitution itself was correct: the source TVG contained a white paint seed, but the converter's recorded-side lookup resolved to no enclosed region and silently left the teeth unpainted. The converter now falls back to the opposite side only when the requested side resolves to nothing and the opposite side resolves to an enclosed region. All ten authored mouth drawings were recompiled in an isolated corpus audit; Mouth-2 was the only mouth output changed by this recovery.

The corrected candidate restores the authored white teeth. The kit now tests every tooth-bearing mouth asset and the pose inspector checks tooth color ownership on every frame that uses drawings 2, 4, 5, 7, 8, 9, or 10. Both the Shaz suite (42 tests) and the shared converter suite (46 Node tests plus 7 Rust tests) pass.

The exact corrected review copy was played completely in the in-app browser. Browser state reported `currentTime: 3.916667`, `duration: 3.916667`, and `ended: true`, covering the real-time pass and the 4x-slow pass. Dense all-frame and mouth close-up sheets were also inspected.

## Human approval

- Reviewer: user
- Decision: approved
- Approved on: 2026-08-18
- Approved artifact: `shaz-present-review-realtime-and-slow.mp4`
- Approved SHA-256: `792a3f65a300f5c14eaad0cc55ade3bdca1222615e34386b9c2c72b0ea86d257`

## Promoted learning

**What did this teach us, and does the skill, runtime, or test suite need updating?** Yes. A fully connected, opaque, correctly substituted drawing can still be semantically wrong when an internal palette region is lost. The converter now recovers the sole enclosed region when a recorded TVG paint side resolves to nothing; the skill and playbook now require direct palette ownership checks; the compiled-mouth regression covers every tooth-bearing drawing; and per-frame pose inspection now fails missing white tooth regions. This is a reusable mechanical invariant, not a Present-only patch.
