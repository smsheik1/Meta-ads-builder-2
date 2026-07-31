---
name: wiggly-2000s-effect
description: Turn one 3:4 photo into an authentic early-2000s digicam image with the exact gathered SKAI prompt.
---

# 2000s Effect

Use the packaged runner and exact prompt. Do not call Replicate separately or create another render path.

From the extracted kit's `v3` directory:

```bash
npm install
npm run format:skai-image -- check --format=2000s-effect
npm run format:skai-image -- smoke --format=2000s-effect
```

Ask one short question:

> Which 3:4 photo should I turn into an authentic 2000s digicam shot, and should I use Nano Banana 2 (default), Lite (economy), or Pro (premium)?

Then initialize the free run. Omit `--model` for Nano Banana 2, or add `--model=nano-banana-2-lite` for economy or `--model=nano-banana-pro` for premium:

```bash
npm run format:skai-image -- init --format=2000s-effect --run=<id> --input=<absolute-image-path> [--model=<route>]
npm run format:skai-image -- validate --format=2000s-effect --run=<id>
npm run format:skai-image -- estimate --format=2000s-effect --run=<id>
```

Stop after `estimate` and ask the user to approve the paid prediction. Only after explicit approval should you supply `--approve-paid`:

```bash
npm run format:skai-image -- render --format=2000s-effect --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=2000s-effect --run=<id>
npm run format:skai-image -- inspect --format=2000s-effect --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=2000s-effect --run=<id> --approve-final
```

Hard rules:

- Preserve the same person, pose, scene, composition, and natural identity.
- Use harsh direct flash, flat shadows, blown highlights, soft focus, low-end CCD noise, compression artifacts, and imperfect autofocus.
- Keep slightly green-yellow dated color, uneven white balance, washed contrast, crushed blacks, and blown whites.
- Add mild bloom, halation, chromatic aberration, edge softness, and candid imperfection.
- Do not make a polished modern editorial image, illustration, generic global filter, or malformed subject.
- Use a user-approved 3:4 input before validation.
- Keep the exact gathered prompt unless the user explicitly requests a change.
- Use Nano Banana 2 by default, Lite for economy, or Pro for premium.
- Validate and estimate before spending, pause for explicit user approval, and never render without `--approve-paid`.
- Persist and resume the prediction id.
- Never exceed three attempts.
- View the output and record specific visual-review notes before finalizing.
- Return the finished image and `quality-report.json` to the user after finalization.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
