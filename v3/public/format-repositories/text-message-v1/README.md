# Wiggly Text Message Format

Turn one website into six static iMessage-style ads.

## Quick Start

```bash
npm install
npm run format:text-message -- check
npm run format:text-message -- estimate
npm run format:text-message -- init --run=my-brand --url=https://example.com
```

Then:

1. Research the website and fill `research.json`.
2. Run `npm run format:text-message -- prompt --run=my-brand`.
3. Use the saved prompt and fill `variants.json`.
4. Validate, render, inspect, and finalize.

```bash
npm run format:text-message -- validate --run=my-brand
npm run format:text-message -- render --run=my-brand
npm run format:text-message -- inspect --run=my-brand
npm run format:text-message -- finalize --run=my-brand --approve-final
```

The runner saves progress after every step. Resume with:

```bash
npm run format:text-message -- resume --run=my-brand
```

To replace an already-rendered pack after correcting a conversation:

```bash
npm run format:text-message -- validate --run=my-brand
npm run format:text-message -- render --run=my-brand --replace-outputs
```

`--approve-final` records that the agent inspected every PNG. It is not a paid-action approval.

## Output

- 6 static `1080 x 1350` PNGs
- 6 distinct buyer moments
- `research.json`
- `variants.json`
- `scenes.json`
- `state.json`

The kit uses host-agent research and reasoning plus local Remotion rendering. It does not call an image, video, voice, Replicate, NVIDIA NIM, or Wiggly generation provider.
