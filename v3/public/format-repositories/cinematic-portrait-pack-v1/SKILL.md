---
name: wiggly-cinematic-portrait-pack
description: Turn one portrait into one or all eight cinematic editorial looks using the exact gathered SKAI prompts and the packaged Wiggly runtime.
---

# Cinematic Portrait Pack

Use the packaged runner and prompt variants. Do not call Replicate separately,
rewrite the gathered prompts, or create another render path.

Ask one short question at a time:

1. Which portrait should I use?
2. Do you want one look or the complete eight-image pack?
3. If one look, which: `mirror-selfie`, `rain-mask`, `car-editorial`,
   `punk-noir`, `art-stop-sign`, `sunroof-flash`, `sword-studio`, or
   `cow-herd-sports-car`?
4. Use Nano Banana 2 by default, Lite for economy, or Pro for premium?

Before paid work:

```bash
npm run format:skai-image -- check --format=cinematic-portrait-pack
npm run format:skai-image -- smoke --format=cinematic-portrait-pack
```

For every selected look, use a unique run id:

```bash
npm run format:skai-image -- init --format=cinematic-portrait-pack --run=<id> --variant=<look> --input=<absolute-image-path> [--model=<route>]
npm run format:skai-image -- validate --format=cinematic-portrait-pack --run=<id>
npm run format:skai-image -- estimate --format=cinematic-portrait-pack --run=<id>
```

Stop and ask once before spending. After explicit approval:

```bash
npm run format:skai-image -- render --format=cinematic-portrait-pack --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=cinematic-portrait-pack --run=<id>
npm run format:skai-image -- inspect --format=cinematic-portrait-pack --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=cinematic-portrait-pack --run=<id> --approve-final
```

Hard rules:

- Preserve the same face and identity in every selected look.
- Keep the exact packaged prompt unless the user explicitly requests a change.
- State that one look is one paid prediction; the complete pack uses eight.
- Validate every run before spending.
- Never generate without `--approve-paid`.
- Persist and resume each prediction id instead of replacing timed-out jobs.
- Never exceed three attempts for any look.
- View every output and record look-specific notes before finalizing.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
