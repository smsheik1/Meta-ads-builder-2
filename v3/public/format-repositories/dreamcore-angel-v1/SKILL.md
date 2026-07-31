---
name: wiggly-dreamcore-angel
description: Turn one 3:4 portrait into a luminous monochrome fallen angel using the exact gathered SKAI prompt.
---

# Dreamcore Angel

Use the packaged runner and exact prompt. Do not call Replicate separately or create another render path.

From the extracted kit's `v3` directory:

```bash
npm install
npm run format:skai-image -- check --format=dreamcore-angel
npm run format:skai-image -- smoke --format=dreamcore-angel
```

Ask one short question:

> Which 3:4 portrait should I turn into a dreamcore fallen angel, and should I use Nano Banana 2 (default), Lite (economy), or Pro (premium)?

Then initialize the free run. Omit `--model` for Nano Banana 2, or add `--model=nano-banana-2-lite` for economy or `--model=nano-banana-pro` for premium:

```bash
npm run format:skai-image -- init --format=dreamcore-angel --run=<id> --input=<absolute-image-path> [--model=<route>]
npm run format:skai-image -- validate --format=dreamcore-angel --run=<id>
npm run format:skai-image -- estimate --format=dreamcore-angel --run=<id>
```

Stop after `estimate` and ask the user to approve the paid prediction. Only after explicit approval should you supply `--approve-paid`:

```bash
npm run format:skai-image -- render --format=dreamcore-angel --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=dreamcore-angel --run=<id>
npm run format:skai-image -- inspect --format=dreamcore-angel --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=dreamcore-angel --run=<id> --approve-final
```

Hard rules:

- Preserve the same recognizable face while following the gathered lowered-gaze side-profile composition.
- Make gigantic glowing feathered wings dominate a pure black void.
- Use monochrome silver-gray color, blown whites, crushed blacks, aggressive bloom, and soft diffusion.
- Keep the dirty CCD/VHS texture, grain, compression, tape damage, and imperfect underground-art finish.
- Do not clean the image into modern beauty photography, glossy CGI, crisp ultra-HD, or vibrant color.
- Use a user-approved 3:4 input before validation.
- Keep the exact gathered prompt unless the user explicitly requests a change.
- Use Nano Banana 2 by default, Lite for economy, or Pro for premium.
- Validate and estimate before spending, pause for explicit user approval, and never render without `--approve-paid`.
- Persist and resume the prediction id.
- Never exceed three attempts.
- View the output and record specific visual-review notes before finalizing.
- Return the finished image and `quality-report.json` to the user after finalization.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
