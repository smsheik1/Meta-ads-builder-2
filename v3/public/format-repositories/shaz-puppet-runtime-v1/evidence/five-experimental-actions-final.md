# Five storyboard-directed actions: final integration

> **Status: REJECTED AND SUPERSEDED.** This historical integration includes the fragmented crossed-arm substitution later rejected by the anatomy audit. The later `anatomy-v8-release` poses were also rejected by the user after public-page review. Keep this as engineering history only. The current `point-at-screen` and `look-at-phone` recipes still need fresh visual review.

## Historical sequence

1. `point-at-screen`
2. `facepalm-frustrated`
3. `arms-crossed-skeptical`
4. `excited-celebration`
5. `look-at-phone`

The historical integration run is `agent-runs/five-experimental-certified-final`.

- Input SHA-256: `cc440eed466261d97f6e2748721d1b8d0e3a4e011c1b15c3b36ce1ed10f1e6ad`
- Exact final video SHA-256: `402466e7c8b076fe4e1e3b4be06bdfa8bb7e302582459f424184e3eb9b034ca4`
- Validation receipt SHA-256: `1c00b71b6a3a2a5a7ccd3bfa9a32b76b712a9072a1b7a35e48c06598bfcb0551`
- Quality report SHA-256: `1e3c02a674e97fe96c83e681f3415f5079864042408102d2d39e03cb80990fdc`
- Human review SHA-256: `5edef0f9585a23ddbe35cbfda6ccaafdff78c45e71df906e74ec1944b628a653`
- Delivery receipt SHA-256: `3891b27b08dd8afca02171d0233da337c5d655a9dadcbfcf83263ed0afe2ab7c`
- Dense 245-frame sheet SHA-256: `a6c7f9eed5097db8667389e0260d91b7b8d2020683662fcf6566ed8b07d5f940`
- Square-pixel close-up SHA-256: `e35b94b63024a09450f2a5da089f1863437e10ef8ad7b0d824921657f0532ecc`

## Historical watch and inspection

The exact 10.208333-second output and its 1280×720 square-pixel close-up were each watched completely at normal speed through `ended=true`. All 245 frames were inspected in one chronological dense sheet. The automatic run inspection passed every recipe with zero failures:

- Point at Screen: 36/36 frames; maximum identical run 2 frames
- Facepalm/Frustrated: 36/36 frames; maximum identical run 2 frames
- Arms Crossed/Skeptical: 19/19 frames; maximum identical run 1 frame
- Excited Celebration: 31/31 frames; maximum identical run 1 frame
- Look at Phone: 55/55 frames; maximum identical run 1 frame

The contemporaneous review reported that the sequence preserved each intended semantic silhouette, phase structure, character assembly, paint order, attachment, expression, and living hold. The later anatomy audit invalidated that acceptance because the crossed-arm replacement assembly did not preserve native limb topology. These hashes and observations remain failure provenance, not a current release gate.

## Superseded learning-loop record

This run was once treated as independent certification for all five actions. That conclusion is superseded. Anatomy v8 later repaired `facepalm-frustrated`, `arms-crossed-skeptical`, and `excited-celebration` plus the prop-free `phone-use-sequence`, but the user rejected those visible poses too. The current `point-at-screen` and `look-at-phone` recipes still need fresh visual review.

## Historical package audit

The rebuilt Format kit was extracted into a clean temporary directory. An offline dependency install succeeded, all 64 tests passed, `npm run check` passed, and the packaged smoke render inspected and finalized successfully. ZIP integrity passed. The 330-entry archive contained exactly one `KIT-MANIFEST.json` and zero `node_modules`, agent-run payloads, download payloads, nested archives, goldens, standalone video/audio files, excluded compiler files, absolute paths, traversal paths, `.DS_Store`, or `.git` entries. A clean extraction content scan found zero operator-home, task-temporary, private-temporary, or Windows operator path strings.
