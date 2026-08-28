# Generated action watch: Facepalm / Frustrated

> **Status: HISTORICAL AND USER-REJECTED.** The hashes below predate the later cuff-ownership repair. That repair appeared in `anatomy-v8-release`, whose visible poses the user later rejected. Keep this page as engineering history, not current creative approval.

## Exact accepted artifacts

- Storyboard SHA-256: `93b6fd07d9134c69a89418c3c5896f6a225b53a91eb7eb781287aa65ef1c0c1`
- Source generator SHA-256: `4e3efd2cb47755e2ccceca49fdf0115ac046dbc304191a427b598de052703516`
- Recipe file SHA-256: `d3652f649191cc22e7e467302cbd7a1e7e22a6bab2cd7d5365da8853a8a2c9c1`
- Canonical recipe SHA-256: `1e032c368b47754c1ce6e09bcffe676e0478cb1b04dbeb16eacab1b4b03dd356`
- Official render SHA-256: `02e491c6b446d66c7ed27615dea4bc0c29258a753ff6b9f876bf112f13bc9ed4`
- Validation receipt SHA-256: `24dcebb05136f303545196feaa36f03bcce37fa16793590a6426f962e66ac6be`
- Render report SHA-256: `88334c2c64dc5951834e01ca3b6385888a5522cfd5c9c5bdb5bec465c860089b`
- Quality report SHA-256: `826c27bb3e1105a2a92986b166ea3375f9bf21c77f9951850be0fc7fcd77fb69`
- Dense contact sheet SHA-256: `6716f33b3300e4318ba14e81920ec3748a4300332bcd1ad1b0e27c905cd6c6eb`
- Close-up video SHA-256: `f57cb455bb62eb3bae0e873bac02aaac1b073b03de213a39810ca486554febe4`
- Close-up contact sheet SHA-256: `8ff5945e8a5f4376b290e489f48a53d3769ebc00c3d93c61d43909d8d88decb6`
- Delivery receipt SHA-256: `5136c8664e9e2333505cab59f8f82f0c4c1067c9e22fe3c5c7547e66971b60c0`
- Official run: `agent-runs/facepalm-frustrated-certification`

## Watch and inspection result

The exact 1.833008-second official output and its synchronized close-up were watched from start through `ended=true` at normal speed under the user's explicit delegated authorization. The dense sheet covers all 44 output frames. Automatic inspection passed all 36 recipe frames with zero failures and a longest identical-frame run no greater than two.

The accepted action reads as a complete sequence: open-mouth realization, fingertip contact, broad-palm facepalm, overshoot, settle, and living hold. The ordinary body hand disappears before the front palm arrives, so there is no doubled hand. The palm covers the eye region, stays visually connected to the raised sleeve, remains fully colored and on-model, and introduces no prop, clipping, construction seam, detached fragment, facial pop, or frozen hold.

The reviewer is recorded as `Codex visual audit under user-delegated authorization`. This does not claim that the user personally watched this checksum.

## Three-attempt record

1. Candidate one reused the ordinary hand channel. The motion reached the face, but the broad palm painted behind the head and disappeared. It also retained an accidental seven-frame identical opening.
2. Candidate two proved the correct front-layer channel but exposed uncalibrated model registration: the aliased palm rendered oversized and off-screen.
3. Candidate three reused the existing right-hand drawing 11 through `OL_Hand` drawing 2, preserved the source asset registration and checksums, calibrated only the overlay control, added the open-mouth setup and living opening, and passed both visual and mechanical review.

## Post-action retro

**What did this teach us, and does the skill, runtime, or test suite need updating?**

- Reusable judgment: front-of-face gestures are paint-layer ownership problems before they are transform problems. The playbook now requires the dedicated `OL_Hand` channel when an ordinary hand would paint behind the face.
- Runtime asset capability: the recovered overlay element now registers drawing 2 as a provenance-preserving alias of existing `Right_Hand` drawing 11. No artist-rendered storyboard pixels, new prop, global paint reorder, or pose-specific renderer branch was introduced.
- Mechanical invariant: regressions now prove the overlay drawing's source, checksums, canvas, model origin, facepalm substitution sequence, size/orientation envelope, and exact generator reproducibility.
- Pose-specific calibration: the overlay position, rotation, scale, and overshoot values remain in the Facepalm source generator; they are not promoted as universal coordinates.
