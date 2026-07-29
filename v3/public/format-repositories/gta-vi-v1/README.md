# Wiggly GTA VI Format

This runnable Repo preserves the exact prompt and source example gathered from
@skaigenerated. It transforms one portrait into a grounded, cinematic
Vice City-inspired AAA game character through Replicate.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- smoke --format=gta-vi
npm run format:skai-image -- init --format=gta-vi --run=my-character --input=/absolute/path/to/portrait.jpg
npm run format:skai-image -- validate --format=gta-vi --run=my-character
npm run format:skai-image -- estimate --format=gta-vi --run=my-character
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=gta-vi --run=my-character --approve-paid
```

View the output, record visual notes with
`inspect --visual-pass --review-notes="..."`, then use
`finalize --approve-final`.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Source/premium: `google/nano-banana-pro`

No Replicate proof call was made while packaging this Repo. The included source
output and guide are the proof artifacts.
