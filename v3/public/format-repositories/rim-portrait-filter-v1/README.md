# Wiggly Rim Portrait Filter Format

This runnable Repo preserves the exact prompt and six native source examples
gathered from @skaigenerated. The separate Wiggly proof uses one fixture
portrait so the public hero can show a truthful before-and-after pair.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=rim-portrait-filter
npm run format:skai-image -- smoke --format=rim-portrait-filter
npm run format:skai-image -- init --format=rim-portrait-filter --run=my-portrait --input=/absolute/path/to/portrait.jpg
npm run format:skai-image -- validate --format=rim-portrait-filter --run=my-portrait
npm run format:skai-image -- estimate --format=rim-portrait-filter --run=my-portrait
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=rim-portrait-filter --run=my-portrait --approve-paid
```

No Replicate proof call was made while packaging this Repo.

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium and source: `google/nano-banana-pro`
