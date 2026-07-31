# Wiggly Cyanotype Format

This runnable Repo preserves the exact prompt and six native source examples
gathered from @skaigenerated. The separate Wiggly proof uses one fixture image
so the public hero can show a truthful before-and-after pair.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=cyanotype
npm run format:skai-image -- smoke --format=cyanotype
npm run format:skai-image -- init --format=cyanotype --run=my-cyanotype --input=/absolute/path/to/3-by-4-image.jpg
npm run format:skai-image -- validate --format=cyanotype --run=my-cyanotype
npm run format:skai-image -- estimate --format=cyanotype --run=my-cyanotype
```

The input must already be 3:4 so the fixed 3:4 output route can honor the
source prompt's composition-preservation rule. Add
`--model=nano-banana-2-lite` or `--model=nano-banana-pro` to `init` to select
the economy or premium route.

Generation requires `REPLICATE_API_TOKEN`. Stop after `estimate` and get the
user's explicit approval before supplying the paid flag:

```bash
npm run format:skai-image -- render --format=cyanotype --run=my-cyanotype --approve-paid
```

No Replicate proof call was made while packaging this Repo.

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium and source: `google/nano-banana-pro`

At the Replicate rates checked while packaging, those routes estimate about
$0.034, $0.067, and $0.15 per 1K output image respectively. Re-run `estimate`
immediately before approval because provider pricing can change.
