---
name: wiggly-dark-aesthetic-filter
description: Remaster one 3:4 portrait with the exact gathered SKAI dark luxury-editorial prompt.
---

# Dark Aesthetic Filter

Use the packaged runner and exact prompt. Do not call Replicate separately or create another render path.

From the extracted kit's `v3` directory:

```bash
npm install
npm run format:skai-image -- check --format=dark-aesthetic-filter
npm run format:skai-image -- smoke --format=dark-aesthetic-filter
```

Ask one short question:

> Which 3:4 portrait should I remaster with the dark aesthetic filter, and should I use Nano Banana 2 (default), Lite (economy), or Pro (premium)?

Then initialize the free run. Omit `--model` for Nano Banana 2, or add `--model=nano-banana-2-lite` for economy or `--model=nano-banana-pro` for premium:

```bash
npm run format:skai-image -- init --format=dark-aesthetic-filter --run=<id> --input=<absolute-image-path> [--model=<route>]
npm run format:skai-image -- validate --format=dark-aesthetic-filter --run=<id>
npm run format:skai-image -- estimate --format=dark-aesthetic-filter --run=<id>
```

Stop after `estimate` and ask the user to approve the paid prediction. Only after explicit approval should you supply `--approve-paid`:

```bash
npm run format:skai-image -- render --format=dark-aesthetic-filter --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=dark-aesthetic-filter --run=<id>
npm run format:skai-image -- inspect --format=dark-aesthetic-filter --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=dark-aesthetic-filter --run=<id> --approve-final
```

Hard rules:

- Preserve the same recognizable person, pose, and outfit.
- Use strong directional studio light, deep shadows, hard contrast, and controlled highlight bloom.
- Make chains, pendants, metal, and skin catch bright but believable specular highlights.
- Keep dark desaturated tones, cool metallic shadows, visible pores and fabric, and slight cinematic grain.
- Do not smooth skin, flatten the lighting, turn it into an illustration, or produce a generic global filter.
- Use a user-approved 3:4 input before validation.
- Keep the exact gathered prompt unless the user explicitly requests a change.
- Use Nano Banana 2 by default, Lite for economy, or Pro for premium.
- Validate and estimate before spending, pause for explicit user approval, and never render without `--approve-paid`.
- Persist and resume the prediction id.
- Never exceed three attempts.
- View the output and record specific visual-review notes before finalizing.
- Return the finished image and `quality-report.json` to the user after finalization.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
