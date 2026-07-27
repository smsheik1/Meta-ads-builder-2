# Wiggly Meme Format

Turn one website into twelve static meme ads using four fixed templates.

## Quick Start

```bash
npm install
npm run format:meme -- check
npm run format:meme -- estimate
npm run format:meme -- init --run=my-brand --url=https://example.com
```

Then:

1. Research the website and fill `research.json`.
2. Run `npm run format:meme -- prompt --run=my-brand`.
3. Use the saved prompt and fill `variants.json`.
4. Validate, estimate, render, inspect, and finalize.

```bash
npm run format:meme -- validate --run=my-brand
npm run format:meme -- render --run=my-brand
npm run format:meme -- inspect --run=my-brand
npm run format:meme -- finalize --run=my-brand --approve-final
```

The runner saves progress after every step. Resume with:

```bash
npm run format:meme -- resume --run=my-brand
```

To replace an already-rendered pack after correcting a caption:

```bash
npm run format:meme -- validate --run=my-brand
npm run format:meme -- render --run=my-brand --replace-outputs
```

`--approve-final` records that the agent inspected every PNG. It is not a paid-action approval.

## Output

- 12 static `1080 x 1350` PNGs
- 3 angles for each of 4 fixed templates
- `research.json`
- `variants.json`
- `scenes.json`
- `state.json`

The kit uses host-agent research and reasoning plus local Remotion rendering. It does not call an image, video, voice, Replicate, or Wiggly generation provider.
