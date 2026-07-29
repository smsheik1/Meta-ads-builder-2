# Wiggly Fortnite Filter Format

Turn one portrait into one realistic, cinematic Fortnite-style 3D character image. The Repo preserves the prompt gathered from @skaigenerated, routes generation through official Google Nano Banana models on Replicate, and refuses to finalize an uninspected file.

## Quick start

Run from `v3`:

```bash
npm install
npm run format:fortnite-filter -- smoke --format=fortnite-filter
npm run format:fortnite-filter -- init --format=fortnite-filter --run=my-portrait --input=/absolute/path/photo.jpg
npm run format:fortnite-filter -- validate --format=fortnite-filter --run=my-portrait
npm run format:fortnite-filter -- estimate --format=fortnite-filter --run=my-portrait
```

Add `REPLICATE_API_TOKEN` to your shell environment. After approving one paid prediction:

```bash
npm run format:fortnite-filter -- render --format=fortnite-filter --run=my-portrait --approve-paid
```

View `public/format-repositories/fortnite-filter-v1/agent-runs/my-portrait/outputs/01.jpg`. Then record the visual review and finalize:

```bash
npm run format:fortnite-filter -- inspect --format=fortnite-filter --run=my-portrait --visual-pass --review-notes="Resemblance and pose hold; face and hands are coherent; no accidental text."
npm run format:fortnite-filter -- finalize --format=fortnite-filter --run=my-portrait --approve-final
```

If a generation keeps running after the terminal times out:

```bash
npm run format:fortnite-filter -- resume --format=fortnite-filter --run=my-portrait
```

The runner reuses the persisted Replicate prediction ID. It does not start a duplicate job.

## Model routes

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium/source-guide model: `google/nano-banana-pro`

Choose a non-default route during `init` with `--model=nano-banana-2-lite` or `--model=nano-banana-pro`.

## Source and proof

- Prompt and example: [@skaigenerated Instagram post](https://www.instagram.com/p/DbA4f6Blm2v/)
- Proof input: [Trevor Chris Hutchinson on Pexels](https://www.pexels.com/photo/portrait-of-a-man-sitting-5790938/)
- Proof input: [rao qingwei on Pexels](https://www.pexels.com/photo/elegant-portrait-of-woman-at-city-sunset-29484597/)

The two stock inputs are included under the Pexels License. Their exact sources and roles are recorded in `assets.json`.
