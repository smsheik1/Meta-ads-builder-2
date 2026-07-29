# Wiggly Cinematic Photographer Format

This runnable Repo preserves the exact prompt and source example gathered from @skaigenerated. It generates one moody editorial portrait through Replicate and refuses to finalize an uninspected image.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- smoke --format=cinematic-photographer
npm run format:skai-image -- init --format=cinematic-photographer --run=my-portrait
npm run format:skai-image -- validate --format=cinematic-photographer --run=my-portrait
npm run format:skai-image -- estimate --format=cinematic-photographer --run=my-portrait
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=cinematic-photographer --run=my-portrait --approve-paid
```

View the output, record visual notes with `inspect --visual-pass --review-notes="..."`, then use `finalize --approve-final`.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default 4:5: `google/nano-banana-2`
- Source model: `openai/gpt-image-2` at its supported 2:3 portrait ratio

No Replicate proof call was made while packaging this Repo. The included source output and guide are the proof artifacts.
