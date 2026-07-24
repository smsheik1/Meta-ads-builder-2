# 3D Breakdown Wiggly Repo

This Repo packages the recipe behind Wiggly's existing 3D Breakdown Format. It does not create a second renderer or a second creative pipeline.

## What it makes

1. Five story directions from website evidence.
2. One selected Style B script and scene.
3. One six-frame storyboard contact sheet.
4. Four full-quality 9:16 video endpoints: frames 1, 3, 4, and 6.
5. After separate approval, two continuous 10-second 480p clips.
6. Later: Fish voice and one 20-second MP4.

The storyboard is a planning reference. Its small panel crops must never become video endpoints. This version stops after two inspected video clips; voice generation and final composition remain disabled.

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
npm run format:three-d -- image --run=my-run --kind=anchor --frame=3 --approve-image
npm run format:three-d -- image --run=my-run --kind=anchor --frame=4 --approve-image
npm run format:three-d -- image --run=my-run --kind=anchor --frame=6 --approve-image
```

Each image command makes one endpoint. Inspect all four for sharpness, matching subjects, matching settings, and correct start/end states before video. Video commands create one paid clip at a time:

```bash
npm run format:three-d -- video --run=my-run --clip=1 --approve-video
npm run format:three-d -- inspect --run=my-run
npm run format:three-d -- video --run=my-run --clip=2 --approve-video
npm run format:three-d -- inspect --run=my-run
```

Never paste keys into prompts, files, run records, or chat. Add the required key names to `.env.local`.

## Important boundary

The official renderer remains `features/formats/three-d-breakdown/render.tsx`, consumed through `AdRenderSurface`. Do not rebuild it. The Repo runner writes the same `ThreeDBreakdownAdScene` contract that `/create`, preview, download, and share already understand.
