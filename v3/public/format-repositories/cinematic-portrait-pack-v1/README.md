# Cinematic Portrait Pack Format Kit

This is the runnable Wiggly Repo for the eight-look portrait pack gathered from
@skaigenerated. It includes the exact prompts, native source hero, eight source
proof cards, clean guide examples, contracts, free smoke test, official runner,
and finalization gates.

Run from the `v3` directory:

```bash
npm run format:skai-image -- check --format=cinematic-portrait-pack
npm run format:skai-image -- smoke --format=cinematic-portrait-pack
npm run format:skai-image -- init --format=cinematic-portrait-pack --run=my-look --variant=mirror-selfie --input=/absolute/path/to/portrait.jpg
npm run format:skai-image -- validate --format=cinematic-portrait-pack --run=my-look
npm run format:skai-image -- estimate --format=cinematic-portrait-pack --run=my-look
```

Those commands are free. A paid transform requires `REPLICATE_API_TOKEN` in the
environment and explicit approval:

```bash
npm run format:skai-image -- render --format=cinematic-portrait-pack --run=my-look --approve-paid
```

Then inspect the actual output, record specific visual notes, and finalize only
after both automatic and visual checks pass. Use a separate run id for each
look. The complete eight-image pack uses eight independent predictions.

See `SKILL.md` for the agent workflow and `runtime.json` for supported looks and
model routes.
