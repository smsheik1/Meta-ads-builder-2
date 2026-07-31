---
name: wiggly-paper-outfit
description: Turn only the clothing, bag, and shoes in one 3:4 fashion photo into handmade paper cutouts using the exact gathered SKAI prompt.
---

# Paper Outfit

Use the packaged runner and exact prompt. Do not call Replicate separately or
create another render path.

From the extracted kit's `v3` directory, prepare the local runner first:

```bash
npm install
npm run format:skai-image -- check --format=paper-outfit
npm run format:skai-image -- smoke --format=paper-outfit
```

Ask one short question:

> Which 3:4 fashion photo should I turn into a handmade paper-outfit editorial?

Then initialize the free run. Omit `--model` for Nano Banana 2, or add
`--model=nano-banana-2-lite` for economy or `--model=nano-banana-pro` for
premium:

```bash
npm run format:skai-image -- init --format=paper-outfit --run=<id> --input=<absolute-image-path> [--model=<route>]
npm run format:skai-image -- validate --format=paper-outfit --run=<id>
npm run format:skai-image -- estimate --format=paper-outfit --run=<id>
```

Stop after `estimate` and ask the user to approve the paid prediction. Only
after the user explicitly approves the cost should you supply `--approve-paid`:

```bash
npm run format:skai-image -- render --format=paper-outfit --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=paper-outfit --run=<id>
npm run format:skai-image -- inspect --format=paper-outfit --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=paper-outfit --run=<id> --approve-final
```

Hard rules:

- Preserve the face, hair, skin, expression, makeup, body, pose, lighting, shadows, background, crop, and perspective.
- Apply the effect only to clothing, bag, and shoes.
- Make each transformed piece look like a physical white-paper cutout with visible colored pencil, paint marks, cut edges, and layered construction.
- Keep the person fully photographic; never turn the model into a drawing or apply a global digital filter.
- Use a user-approved 3:4 input before validation.
- Keep the exact gathered prompt unless the user explicitly requests a change.
- Use Nano Banana 2 by default, Lite for economy, or Pro for premium.
- Validate and estimate before spending, pause for explicit user approval, and never render without `--approve-paid`.
- Persist and resume the prediction id.
- Never exceed three attempts.
- View the output and record specific visual-review notes before finalizing.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
