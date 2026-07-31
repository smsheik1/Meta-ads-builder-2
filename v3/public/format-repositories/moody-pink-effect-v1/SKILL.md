---
name: wiggly-moody-pink-effect
description: Give one 3:4 nighttime photo a luxury moody-pink editorial grade using the exact gathered SKAI prompt.
---

# Moody Pink Effect

Use the packaged runner and exact prompt. Do not call Replicate separately or
create another render path.

From the extracted kit's `v3` directory, prepare the local runner first:

```bash
npm install
npm run format:skai-image -- check --format=moody-pink-effect
npm run format:skai-image -- smoke --format=moody-pink-effect
```

Ask one short question:

> Which 3:4 nighttime photo should I turn into a moody pink editorial, and should I use Nano Banana 2 (default), Lite (economy), or Pro (source model)?

Then initialize the free run. Omit `--model` for Nano Banana 2, or add
`--model=nano-banana-2-lite` for economy or `--model=nano-banana-pro` for
premium:

```bash
npm run format:skai-image -- init --format=moody-pink-effect --run=<id> --input=<absolute-image-path> [--model=<route>]
npm run format:skai-image -- validate --format=moody-pink-effect --run=<id>
npm run format:skai-image -- estimate --format=moody-pink-effect --run=<id>
```

Stop after `estimate` and ask the user to approve the paid prediction. Only
after explicit approval should you supply `--approve-paid`:

```bash
npm run format:skai-image -- render --format=moody-pink-effect --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=moody-pink-effect --run=<id>
npm run format:skai-image -- inspect --format=moody-pink-effect --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=moody-pink-effect --run=<id> --approve-final
```

Hard rules:

- Preserve faces, skin tones, clothing, vehicles, objects, composition, and perspective.
- Add vibrant pink and magenta ambient light, cinematic glow, rich shadows, soft contrast, subtle reflections, and atmospheric depth.
- Keep realistic skin color inside the stylized lighting.
- Produce a polished luxury nighttime editorial, not a flat global color wash.
- Use a user-approved 3:4 input before validation.
- Keep the exact gathered prompt unless the user explicitly requests a change.
- Use Nano Banana 2 by default, Lite for economy, or Pro for premium.
- Validate and estimate before spending, pause for explicit user approval, and never render without `--approve-paid`.
- Persist and resume the prediction id.
- Never exceed three attempts.
- View the output and record specific visual-review notes before finalizing.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
