# Wiggly Rag Doll Format

This runnable Repo preserves the exact prompt and source examples gathered from
@skaigenerated. It transforms one portrait into a handcrafted felt character
through Replicate.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- smoke --format=rag-doll
npm run format:skai-image -- init --format=rag-doll --run=my-rag-doll --input=/absolute/path/to/portrait.jpg
npm run format:skai-image -- validate --format=rag-doll --run=my-rag-doll
npm run format:skai-image -- estimate --format=rag-doll --run=my-rag-doll
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=rag-doll --run=my-rag-doll --approve-paid
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
