---
name: wiggly-fortnite-filter
description: Turn one portrait into a realistic cinematic Fortnite-style 3D character image through Replicate.
---

# Fortnite Filter

Use the official runner. Do not call Replicate separately, rewrite the prompt, or create a second render path.

## Conversation

Ask one short question at a time. Start with:

> Which photo should I turn into a Fortnite-style character?

Use Nano Banana 2 by default. Offer Nano Banana 2 Lite when the user wants the lowest price, or Nano Banana Pro when they explicitly want the source guide's premium model.

## Workflow

1. Run `npm run format:fortnite-filter -- check`.
2. Initialize a run with one image.
3. Validate locally.
4. Show the model route and estimate.
5. Only run the paid transform with explicit user approval.
6. If polling is interrupted, use `resume`; never create a duplicate prediction.
7. Inspect the actual output with an image-viewing tool.
8. Record specific review notes and finalize only after the image passes.

```bash
npm run format:fortnite-filter -- init --run=<id> --input=<path>
npm run format:fortnite-filter -- validate --run=<id>
npm run format:fortnite-filter -- estimate --run=<id>
npm run format:fortnite-filter -- render --run=<id> --approve-paid
npm run format:fortnite-filter -- inspect --run=<id>
npm run format:fortnite-filter -- inspect --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:fortnite-filter -- finalize --run=<id> --approve-final
```

Select another route during `init`:

```bash
--model=nano-banana-2-lite
--model=nano-banana-pro
```

## Hard rules

- Exactly one input image and one final image per run.
- Keep the packaged prompt exact.
- Validate before any paid call.
- Require `--approve-paid`.
- Persist and resume the same Replicate prediction ID.
- Never exceed three paid attempts in one run.
- Save the provider output locally immediately.
- Require automatic checks, visual review, notes, and `--approve-final`.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
