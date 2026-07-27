# Wiggly Visualizer Format Kit

Turn one website into a short two-person conversation ad with branded audio bars and captions.

## What You Get

- Five evidence-backed dialogue options
- One selected six-line Ava and Sam conversation
- One two-speaker voice track
- One 1080x1350 MP4
- The scene, captions, research, and resume state

## Quick Start

Run commands from this kit's `v3` directory.

```bash
npm install
npm run check:kit
npm run format:visualizer -- check
npm run format:visualizer -- init --run=my-brand --url=https://example.com
```

Fill `research.json`, then:

```bash
npm run format:visualizer -- prompt --run=my-brand
```

Use the written prompt to fill `dialogue-options.json` and `selection.json`.

```bash
npm run format:visualizer -- validate --run=my-brand
npm run format:visualizer -- estimate --run=my-brand
```

Show the selected dialogue and estimate. Ask the user before the voice call.

```bash
npm run format:visualizer -- generate --run=my-brand --approve-voice
npm run format:visualizer -- render --run=my-brand
npm run format:visualizer -- inspect --run=my-brand
```

After the user watches the complete MP4:

```bash
npm run format:visualizer -- finalize --run=my-brand --approve-final
```

Use `resume --run=my-brand` at any time.

## Free Smoke

This runs a saved audio fixture through the real local renderer. It calls no provider.

```bash
npm run format:visualizer -- smoke --run=free-proof
```

## Spend Rules

- Research and dialogue planning use the host agent.
- Rendering and inspection are local.
- Only Gemini two-speaker voice can incur provider cost.
- `generate` refuses to run without `--approve-voice`.
- One approval buys one voice attempt.
- There is no automatic retry or provider fallback.
- The kit never calls Replicate, an image model, or a video model.

## Files

- `SKILL.md`: agent instructions
- `prompts/`: exact research and dialogue guidance
- `fixtures/`: free regression inputs and saved audio
- `goldens/`: proven output
- `requirements.json`: BYOK and pricing details
- `pipeline.json`: five-step assembly line
- `quality.json`: acceptance criteria
