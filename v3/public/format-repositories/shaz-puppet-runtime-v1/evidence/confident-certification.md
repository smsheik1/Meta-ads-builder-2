# Confident action certification

Status: **technical pass; awaiting user approval before promotion**.

## Candidate

- Action: `confident`
- Source Xstage frames: 287–299
- Phase-aligned artist-reference frames: 252–264
- Duration: 13 frames / 0.541667 seconds at 24 fps
- Candidate file SHA-256: `53496ec22e505fa44673260935ccaa4edc9ea87796b99a1c79031b825c804c1c`
- Candidate semantic recipe SHA-256: `8d64e77ca4ae2239ddb02bb66dc28d77584327940c45a188bc060c1e25baeedf`
- Fresh-package runtime MP4 SHA-256: `bfa0135a254a30ad01a2783cb13e0e91ccb09f91ff226cb5a4cee0a0086d1085`
- Normal-speed human-versus-runtime comparison SHA-256: `d7e541c537979625004397efb2f2620bc5ab1cd764aebe646c7746ac110efaea`
- Close-up comparison SHA-256: `86430f6ae9474f88cdcf2f211fb45e6409dd636d73b67b039f867a6cee484e2a`
- Real-time-plus-4x-slow approval artifact SHA-256: `042384e30f01d9d2982bdb222213727b6587c3d1d7773285cd47734dca485dd0`
- Fresh-package automatic inspection SHA-256: `a7905cb19b6fa2bb4d5ab460321b5c36c12966a2cb0e4d4ccd757d8be54b32b5`
- Five-action comparison candidate SHA-256: `12e848e7fc55191373c44a2a95ea9fe6266da583d94c829883564a42e7f0eacc`
- Artist-rendered pixels embedded, copied, or used as deformation data: **false**

## Finding and correction

The original recovered recipe sampled every Xstage frame and linearly interpolated its controls. The synchronized artist video proves that Confident is presented on twos: visible changes occur at local frames `1, 3, 5, 7, 9, 11, 13`, while the intervening frames repeat the preceding exposure. Smooth runtime in-betweens therefore added movement the artist never showed.

The candidate samples only the seven source-proven change frames, uses hold interpolation for every changing control, and repeats the matching Xstage deformation exposure on the in-between frames. It changes timing only; it does not introduce new drawings, redraw the character, or embed artist-rendered pixels.

## Evidence completed

- Aligned all 13 artist-reference frames against all 13 runtime frames.
- Inspected dense full-frame and face/body close-up sheets.
- Played the exact 3.75-second normal-speed-plus-slow approval artifact completely in the in-app browser.
- Played the complete 36.291667-second five-action comparison candidate to `ended: true`.
- Automatic inspection passed all 13 frames with zero failures and a maximum identical-frame run of two.
- The candidate temporal frame-difference mean error is `0.2846`, down from `1.7932` in the smooth-tween version.
- A ZIP rebuilt with the candidate installed cleanly offline, passed 48 tests, `npm run check`, `npm run smoke`, a fresh Confident validate/render/inspect run, ZIP integrity, and packaged-media exclusions.
- Fresh candidate ZIP SHA-256: `8b0b3cd1f55b748ff18e83e02b32430ffe7cfac93bf187c2210ee02b7197d6ee`

## Visual findings

The candidate preserves the artist's upward confident settle, head/body counter-motion, face registration, finished sleeve silhouettes, fingers, teeth, hairline, collar, eye clearance, and final pose. No construction seam, missing color, detached body part, stray prop, clipping, or facial pop was found.

## Promotion gate

The candidate is deliberately not registered as the official `confident` recipe yet. The exact approval artifact must be reviewed and approved by the user. Only then may the recipe and registry checksum be promoted, the focused registry regression be added, the final retro decide whether any additional learning belongs in the skill/playbook, and the release ZIP become official.
