# Wiggly Brainrot

Turn one buyer truth into a fast two-character exchange over looping gameplay.

## Start

```bash
npm install
npm run format:brainrot -- check
npm run format:brainrot -- init --run=my-run --url=https://example.com
```

The agent researches the website, writes three options with the packaged prompt, selects one, shows the script and estimate, then asks before making the Fish voice.

## Assembly line

`Research -> Script -> Voice -> Render -> Deliver`

1. **Research** saves buyer problems, proof, site language, source URLs, and brand details.
2. **Script** creates three short dialogue options and selects one.
3. **Voice** uses the fixed Fish voices only after a clear user approval.
4. **Render** creates one local 1080x1350 MP4 through Wiggly's shared renderer.
5. **Deliver** checks the dimensions, duration, streams, captions, scene, and artifact hashes.

## Cost

- Research: host-agent web tools
- Three scripts: host-agent reasoning
- Fish S2.1 Pro Free voice: $0 provider cost
- Local MP4 render: $0 provider cost

No image generation, video generation, music generation, or Replicate call is used.

## Resume

Every run is saved under `public/format-repositories/brainrot-v1/agent-runs/<run-id>`.

```bash
npm run format:brainrot -- resume --run=my-run
```

If a voice call fails, the runner stops loudly. It never retries or changes providers.
