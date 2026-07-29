# Wiggly Red Dead Redemption Format

This runnable Repo preserves the exact prompt and six transformation examples
gathered from @skaigenerated. It turns one photo into a cinematic 1899 Western
video-game scene through Replicate.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- smoke --format=red-dead-redemption
npm run format:skai-image -- init --format=red-dead-redemption --run=my-red-dead --input=/absolute/path/to/photo.jpg
npm run format:skai-image -- validate --format=red-dead-redemption --run=my-red-dead
npm run format:skai-image -- estimate --format=red-dead-redemption --run=my-red-dead
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=red-dead-redemption --run=my-red-dead --approve-paid
```

View the output, record visual notes with
`inspect --visual-pass --review-notes="..."`, then use
`finalize --approve-final`.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Source/premium: `google/nano-banana-pro`

No Replicate proof call was made while packaging this Repo. The six included
source examples and guide are the proof artifacts.
