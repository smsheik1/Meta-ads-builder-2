# Wiggly Mood Notes Format

This runnable Repo preserves the exact prompt and seven source examples gathered
from @skaigenerated. It turns one lifestyle photo into a personal visual journal
through Replicate.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- smoke --format=mood-notes
npm run format:skai-image -- init --format=mood-notes --run=my-mood-notes --input=/absolute/path/to/photo.jpg
npm run format:skai-image -- validate --format=mood-notes --run=my-mood-notes
npm run format:skai-image -- estimate --format=mood-notes --run=my-mood-notes
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=mood-notes --run=my-mood-notes --approve-paid
```

View the output, record visual notes with
`inspect --visual-pass --review-notes="..."`, then use
`finalize --approve-final`.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Source/premium: `google/nano-banana-pro`

No Replicate proof call was made while packaging this Repo. The seven included
source examples and guide are the proof artifacts.
