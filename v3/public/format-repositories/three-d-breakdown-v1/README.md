# 3D Breakdown Wiggly Repo

This Repo packages the recipe behind Wiggly's existing 3D Breakdown Format. It does not create a second renderer or a second creative pipeline.

## What it makes

1. Five story directions from website evidence.
2. One selected Style B script and scene.
3. One six-frame storyboard contact sheet.
4. Two 9:16 production anchors.
5. Later, after separate approval: two 10-second clips, Fish voice, and one 20-second MP4.

This build-first version stops after the two image anchors. Paid video and voice generation are disabled.

## Commands

```bash
npm run format:three-d -- check --stage=plan
npm run format:three-d -- init --run=my-run --research=/absolute/path/research.json --subject=brand
npm run format:three-d -- directions --run=my-run --approve-planning
npm run format:three-d -- select --run=my-run --direction=idea-1 --approve-planning
npm run format:three-d -- validate --run=my-run
npm run format:three-d -- inspect --run=my-run
```

Image commands always create one image:

```bash
npm run format:three-d -- image --run=my-run --kind=storyboard --approve-image
npm run format:three-d -- image --run=my-run --kind=anchor --frame=1 --approve-image
npm run format:three-d -- image --run=my-run --kind=anchor --frame=4 --approve-image
```

Never paste keys into prompts, files, run records, or chat. Add the required key names to `.env.local`.

## Important boundary

The official renderer remains `features/formats/three-d-breakdown/render.tsx`, consumed through `AdRenderSurface`. Do not rebuild it. The Repo runner writes the same `ThreeDBreakdownAdScene` contract that `/create`, preview, download, and share already understand.
