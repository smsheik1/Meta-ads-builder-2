---
name: wiggly-80s-toon
description: Turn one 3:4 photo into a retro American cartoon with the exact gathered SKAI prompt.
---

# 80s Toon

Use the packaged runner and exact prompt. Do not call Replicate separately or create another render path.

From the extracted kit's `v3` directory:

```bash
npm install
npm run format:skai-image -- check --format=80s-toon
npm run format:skai-image -- smoke --format=80s-toon
```

Ask one short question:

> Which 3:4 photo should I turn into an 80s Toon, and should I use Nano Banana 2 (default), Lite (economy), or Pro (source-recommended)?

Then initialize the free run. Omit `--model` for Nano Banana 2, or add `--model=nano-banana-2-lite` for economy or `--model=nano-banana-pro` for the source-recommended route:

```bash
npm run format:skai-image -- init --format=80s-toon --run=<id> --input=<absolute-image-path> [--model=<route>]
npm run format:skai-image -- validate --format=80s-toon --run=<id>
npm run format:skai-image -- estimate --format=80s-toon --run=<id>
```

Stop after `estimate` and ask the user to approve the paid prediction. Only after explicit approval should you supply `--approve-paid`:

```bash
npm run format:skai-image -- render --format=80s-toon --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=80s-toon --run=<id>
npm run format:skai-image -- inspect --format=80s-toon --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=80s-toon --run=<id> --approve-final
```

Hard rules:

- Preserve the exact people, identity, hairstyle, clothing, accessories, colors, proportions, pose, body language, expression, lighting, background, framing, perspective, and composition.
- Use thick bold black outlines, flat solid colors, minimal cel shading, clean geometric shapes, and smooth hand-drawn 2D linework.
- Keep the playful vintage anatomy and classic oval eyes without redesigning or replacing the subject.
- Use slightly desaturated old-cel tones, subtle film grain, and soft retro print texture.
- Avoid realism, 3D rendering, anime, and modern glossy cartoon styling.
- Use a user-approved 3:4 input before validation.
- Keep the exact gathered prompt unless the user explicitly requests a change.
- Use Nano Banana 2 by default, Lite for economy, or Pro for the source-recommended route.
- Validate and estimate before spending, pause for explicit user approval, and never render without `--approve-paid`.
- Persist and resume the prediction id.
- Never exceed three attempts.
- View the output and record specific visual-review notes before finalizing.
- Return the finished image and `quality-report.json` to the user after finalization.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
