# Wiggly v3 Architecture

## Goal

v3 should make new ad formats boring to add. A future meme/image/conversation format should live in its own module and should not require surgery in `/create`, the renderer, the save flow, or the download/share flow.

## Core Flow

```text
URL input
-> Convex creates researchRun
-> Firecrawl reads website markdown, branding, and screenshot
-> Wiggly normalizes brand facts and visual vibe
-> OpenRouter writes ad ideas from evidence
-> Convex stores AdScene candidates
-> /create renders selected AdScene
-> user rerolls/locks/selects
-> Convex creates renderJob
-> Oracle worker renders with Remotion
-> worker uploads output and marks renderJob ready
-> download/share read the same frozen AdScene
```

## AdScene Contract

`AdScene` is the center of the product. UI, download, share, and saved items all read from it.

```ts
type AdScene = {
  id: string;
  format: AdFormatId;
  brand: BrandSnapshot;
  creative: CreativeSnapshot;
  style: StyleSnapshot;
  audio?: AudioSnapshot;
  layout: LayoutSnapshot;
  metadata: SceneMetadata;
};
```

Rules:

- `AdScene` is JSON-safe and Convex-safe.
- `AdScene` is frozen before render/share.
- No render path rebuilds the scene from live editor state.
- Download and share use the same frozen scene.

## Brand Snapshot

`BrandSnapshot` is extracted from Firecrawl output and passed into every format. It gives templates brand taste without turning Wiggly into an image generator.

```ts
type BrandSnapshot = {
  name: string;
  url: string;
  logoUrl?: string;
  colors: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
  fonts: {
    heading?: string;
    body?: string;
    feel?: 'serif' | 'sans' | 'display' | 'mono' | 'unknown';
  };
  vibeTags: string[];
  screenshotUrl?: string;
};
```

Rules:

- Markdown supplies what the brand says.
- Branding supplies how the brand looks.
- Screenshot supplies visual context and later QA.
- The first v3 pass uses these inputs to theme pre-built templates, not to generate designs from scratch.

## Format Registry

Formats are plug-ins. Core code asks the registry how to create, render, and validate a format.

```ts
type AdFormatModule = {
  id: AdFormatId;
  label: string;
  createInitialScene(input: ResearchResult): AdScene;
  generateCandidates(input: ResearchResult): AdScene[];
  RenderComponent: React.ComponentType<{ scene: AdScene; mode: RenderMode }>;
  validate(scene: AdScene): FormatValidationResult;
};

export const formatRegistry = {
  visualizer,
  conversation,
} satisfies Record<AdFormatId, AdFormatModule>;
```

Adding `meme` later should mean:

```text
features/formats/meme/index.tsx
-> register in formatRegistry
-> add focused tests
```

It should not require editing the render worker, share page, download path, save path, or global create state.

## Render Pipeline

There is one render pipeline:

```text
AdScene -> AdRenderSurface -> format module RenderComponent
```

Preview, Remotion, share poster, and download must all use this pipeline.

`AdRenderSurface` can delegate:

```tsx
const FormatRenderer = formatRegistry[scene.format].RenderComponent;
return <FormatRenderer scene={scene} mode={mode} />;
```

It must not contain every format's layout logic inline.

## Remotion

Remotion is the video renderer. The Codex Remotion plugin is used during development for best practices, frame checks, timing checks, and audio visualization guidance.

Production rendering should not run inside Convex actions. Convex owns render job state; the Oracle worker owns heavy Chromium/Remotion work.

```text
Convex renderJob pending
-> Oracle worker claims job
-> Remotion renders MP4
-> worker stores file
-> Convex renderJob ready
```

## Convex Ownership

Convex owns:

- anonymous session records
- research run records
- generated scene candidates
- saved selected scenes
- render job status
- share page records
- file metadata

The browser owns only temporary UI state, like selected tab or hovered card.

## Tests That Must Exist Early

- Same `AdScene` renders in preview and Remotion.
- Download and share read identical scene payloads.
- Format registry can add a dummy format without changing core paths.
- Visualizer math is deterministic.
- Research prompt preserves receipts and does not invent filler.
- Share page for anonymous visitor opens without auth.

## Non-Goals

- No `/builder` port.
- No phone-call mode.
- No fallback questions.
- No social posting/Postiz.
- No dev tuning panel.
- No second renderer.
- No mobile product UX for launch.
