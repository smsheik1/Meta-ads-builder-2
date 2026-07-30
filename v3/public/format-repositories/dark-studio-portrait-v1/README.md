# Wiggly Dark Studio Portrait Format

This runnable Repo preserves the exact prompt, guide, and six native source
examples gathered from @skaigenerated. It uses the shared Wiggly image runner,
so validation, paid approval, retry caps, and visual finalization stay explicit.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=dark-studio-portrait
npm run format:skai-image -- smoke --format=dark-studio-portrait
npm run format:skai-image -- init --format=dark-studio-portrait --run=my-portrait --input=/absolute/path/to/portrait.jpg
npm run format:skai-image -- validate --format=dark-studio-portrait --run=my-portrait
npm run format:skai-image -- estimate --format=dark-studio-portrait --run=my-portrait
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=dark-studio-portrait --run=my-portrait --approve-paid
```

No Replicate proof call was made while packaging this Repo.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium: `google/nano-banana-pro`
- Source: `openai/gpt-image-2`
