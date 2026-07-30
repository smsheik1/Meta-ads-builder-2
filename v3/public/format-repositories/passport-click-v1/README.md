# Wiggly Passport Click Format

This runnable Repo preserves the exact prompt and six transformation examples
gathered from @skaigenerated. It turns one portrait into an extreme-close-up
smartphone photo of a believable passport whose unexpectedly attractive ID
picture becomes the social hook.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- smoke --format=passport-click
npm run format:skai-image -- init --format=passport-click --run=my-passport-click --input=/absolute/path/to/portrait.jpg
npm run format:skai-image -- validate --format=passport-click --run=my-passport-click
npm run format:skai-image -- estimate --format=passport-click --run=my-passport-click
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=passport-click --run=my-passport-click --approve-paid
```

View the output, record visual notes with
`inspect --visual-pass --review-notes="..."`, then use
`finalize --approve-final`.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium and source model: `google/nano-banana-pro`

No Replicate proof call was made while packaging this Repo. The six included
source examples and guide are the proof artifacts.
