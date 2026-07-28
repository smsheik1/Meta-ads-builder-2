# Wiggly We're Sorry

Turn real product proof into eight straight-faced corporate apology ads.

## Start

```bash
npm install
npm run format:were-sorry -- check
npm run format:were-sorry -- init --run=my-run --url=https://example.com
```

The agent fills `research.json`, runs `prompt`, writes eight variants to `variants.json`, validates, renders, inspects, and asks for final approval.

For reliable local rendering, store a researched logo as a data URI in `research.json`; omit it when no trustworthy logo is available.

## Assembly line

`Research -> Write -> Render -> Deliver`

1. **Research** finds two buyer moments, two proof points, and checks whether the brand is safe for the joke.
2. **Write** uses the exact packaged prompt for eight different apologies.
3. **Render** creates eight local 1080 x 1350 PNGs through Wiggly's shared `AdRenderSurface`.
4. **Deliver** checks every file before the agent asks for approval.

## Cost

- Research: host-agent web tools
- Copy: host-agent reasoning
- Rendering: local Remotion
- Wiggly provider cost: **$0**

No image, video, voice, Replicate, NVIDIA NIM, or Wiggly generation provider is called.

## Safety

The format must not joke about healthcare outcomes, insurance payouts, physical safety, legal outcomes, data breaches, crises, or vulnerable people. When the brand cannot be separated from those topics, the agent stops and explains why.
