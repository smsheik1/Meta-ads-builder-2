# Wiggly CCD JPEG Filter Format

This runnable Repo preserves the exact prompt and five transformation examples
gathered from @skaigenerated. It keeps the source scene intact while changing
only the photographic rendering into a noisy, compressed late-2000s CCD JPEG
through Replicate.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- smoke --format=ccd-jpeg-filter
npm run format:skai-image -- init --format=ccd-jpeg-filter --run=my-ccd-jpeg --input=/absolute/path/to/photo.jpg
npm run format:skai-image -- validate --format=ccd-jpeg-filter --run=my-ccd-jpeg
npm run format:skai-image -- estimate --format=ccd-jpeg-filter --run=my-ccd-jpeg
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=ccd-jpeg-filter --run=my-ccd-jpeg --approve-paid
```

View the output, record visual notes with
`inspect --visual-pass --review-notes="..."`, then use
`finalize --approve-final`.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium alternative: `google/nano-banana-pro`
- Source model: `openai/gpt-image-2` at its supported 2:3 portrait ratio

No Replicate proof call was made while packaging this Repo. The five included
source examples and guide are the proof artifacts.
