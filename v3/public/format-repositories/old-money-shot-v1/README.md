# Wiggly Old Money Shot Format

This runnable Repo preserves the exact prompt and six transformation examples
gathered from @skaigenerated. It turns one portrait into a timeless black-and-white
old-money editorial beside a classic roadster through Replicate.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- smoke --format=old-money-shot
npm run format:skai-image -- init --format=old-money-shot --run=my-old-money --input=/absolute/path/to/photo.jpg
npm run format:skai-image -- validate --format=old-money-shot --run=my-old-money
npm run format:skai-image -- estimate --format=old-money-shot --run=my-old-money
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=old-money-shot --run=my-old-money --approve-paid
```

View the output, record visual notes with
`inspect --visual-pass --review-notes="..."`, then use
`finalize --approve-final`.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium alternative: `google/nano-banana-pro`
- Source model: `openai/gpt-image-2`

No Replicate proof call was made while packaging this Repo. The six included
source examples and guide are the proof artifacts.
