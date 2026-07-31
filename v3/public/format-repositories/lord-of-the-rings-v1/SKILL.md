---
name: wiggly-lord-of-the-rings
description: Give one existing photo a photoreal cinematic fantasy sunrise grade using the exact gathered SKAI prompt.
---

# Lord of the Rings

Use the packaged runner and exact prompt. Do not call Replicate separately or
create another render path.

From the extracted kit's `v3` directory, prepare the local runner first:

```bash
npm install
npm run format:skai-image -- check --format=lord-of-the-rings
npm run format:skai-image -- smoke --format=lord-of-the-rings
```

Ask one short question:

> Which 3:4 photo should I give a cinematic Lord of the Rings sunrise grade?

Then initialize the free run. Omit `--model` for Nano Banana 2, or add
`--model=nano-banana-2-lite` for economy or `--model=nano-banana-pro` for
premium:

```bash
npm run format:skai-image -- init --format=lord-of-the-rings --run=<id> --input=<absolute-image-path> [--model=<route>]
npm run format:skai-image -- validate --format=lord-of-the-rings --run=<id>
npm run format:skai-image -- estimate --format=lord-of-the-rings --run=<id>
```

Stop after `estimate` and ask the user to approve the paid prediction. Only
after the user explicitly approves the cost should you supply `--approve-paid`:

```bash
npm run format:skai-image -- render --format=lord-of-the-rings --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=lord-of-the-rings --run=<id>
npm run format:skai-image -- inspect --format=lord-of-the-rings --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=lord-of-the-rings --run=<id> --approve-final
```

Hard rules:

- Preserve the source composition, subject, pose, clothing, framing, perspective, and background elements.
- Use a user-approved 3:4 input before validation so the fixed 3:4 route can preserve composition honestly.
- Keep the exact gathered prompt unless the user explicitly requests a change.
- Use Nano Banana 2 by default, Lite for economy, or Pro for premium.
- Keep the result photorealistic: this is a sunrise atmosphere and color-grade edit, not a costume or environment replacement.
- Validate and estimate before spending, pause for explicit user approval, and never render without `--approve-paid`.
- Persist and resume the prediction id.
- Never exceed three attempts.
- View the output and record specific visual-review notes before finalizing.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
