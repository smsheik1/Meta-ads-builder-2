---
name: wiggly-cyanotype
description: Turn one image into a handcrafted Prussian-blue contact print using the exact gathered SKAI cyanotype prompt.
---

# Cyanotype

Use the packaged runner and exact prompt. Do not call Replicate separately or
create another render path.

From the extracted kit's `v3` directory, prepare the local runner first:

```bash
npm install
npm run format:skai-image -- check --format=cyanotype
npm run format:skai-image -- smoke --format=cyanotype
```

Ask one short question:

> Which 3:4 image should I turn into a handcrafted cyanotype?

Then initialize the free run. Omit `--model` for Nano Banana 2, or add
`--model=nano-banana-2-lite` for economy or `--model=nano-banana-pro` for premium:

```bash
npm run format:skai-image -- init --format=cyanotype --run=<id> --input=<absolute-image-path> [--model=<route>]
npm run format:skai-image -- validate --format=cyanotype --run=<id>
npm run format:skai-image -- estimate --format=cyanotype --run=<id>
```

Stop after `estimate` and ask the user to approve the paid prediction. Only
after the user explicitly approves the cost should you supply `--approve-paid`:

```bash
npm run format:skai-image -- render --format=cyanotype --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=cyanotype --run=<id>
npm run format:skai-image -- inspect --format=cyanotype --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=cyanotype --run=<id> --approve-final
```

Hard rules:

- Preserve the source subject and composition.
- Reject or crop to a user-approved 3:4 input before validation so the fixed 3:4 route can preserve composition honestly.
- Keep the exact gathered prompt unless the user explicitly requests a change.
- Use Nano Banana 2 by default, Lite for economy, or Pro for premium and the creator's source route.
- Add subtle skeletal detail only for a moving person or animal.
- Validate and estimate before spending, pause for explicit user approval, and never render without `--approve-paid`.
- Persist and resume the prediction id.
- Never exceed three attempts.
- View the output and record specific visual-review notes before finalizing.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
