---
name: wiggly-soft-glow-filter
description: Give one existing 3:4 photo a realistic soft-glow film grade and restrained handwritten memory captions using the exact gathered SKAI prompt.
---

# Soft Glow Filter

Use the packaged runner and exact prompt. Do not call Replicate separately or
create another render path.

From the extracted kit's `v3` directory, prepare the local runner first:

```bash
npm install
npm run format:skai-image -- check --format=soft-glow-filter
npm run format:skai-image -- smoke --format=soft-glow-filter
```

Ask one short question:

> Which 3:4 photo should I turn into a soft-glow memory?

Then initialize the free run. Omit `--model` for Nano Banana 2, or add
`--model=nano-banana-2-lite` for economy or `--model=nano-banana-pro` for
premium:

```bash
npm run format:skai-image -- init --format=soft-glow-filter --run=<id> --input=<absolute-image-path> [--model=<route>]
npm run format:skai-image -- validate --format=soft-glow-filter --run=<id>
npm run format:skai-image -- estimate --format=soft-glow-filter --run=<id>
```

Stop after `estimate` and ask the user to approve the paid prediction. Only
after the user explicitly approves the cost should you supply `--approve-paid`:

```bash
npm run format:skai-image -- render --format=soft-glow-filter --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=soft-glow-filter --run=<id>
npm run format:skai-image -- inspect --format=soft-glow-filter --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=soft-glow-filter --run=<id> --approve-final
```

Hard rules:

- Preserve the subject, face, pose, background, framing, and all key details.
- Use a user-approved 3:4 input before validation so the fixed route can preserve composition honestly.
- Keep the exact gathered prompt unless the user explicitly requests a change.
- Use Nano Banana 2 by default, Lite for economy, or Pro for premium.
- Add only 2–5 clean captions, each 1–3 words, chosen from the supplied list.
- Keep caption lettering thin, handwritten, and pastel white, cream, or butter yellow with only subtle sketch arrows.
- Keep the result realistic and natural; use restrained glow, blur, grain, and vintage film texture.
- Never add emojis, hashtags, long text, or cheesy quotes.
- Validate and estimate before spending, pause for explicit user approval, and never render without `--approve-paid`.
- Persist and resume the prediction id.
- Never exceed three attempts.
- View the output and record specific visual-review notes before finalizing.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
