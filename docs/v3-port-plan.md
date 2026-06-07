# Wiggly v3 Port Plan

## Rule

v1 is reference material, not the starting point. Do not copy old app structure, route state, server glue, save systems, or builder code. Port only the small pieces listed here.

## Port Verbatim Or Nearly Verbatim

### Visualizer Math

- `src/lib/visualizer.ts`
- `src/lib/audio-analysis.ts`
- `src/lib/visualizer-presets.ts`

Why: this is core Wiggly IP and already debugged.

### Scene Contract Lessons

- `src/engine/ad-scene/scene.ts`
- `src/lib/legacy-create-ad-scene.ts`
- `src/lib/export-snapshot.ts`

Why: v3 needs the same frozen-scene discipline, but expressed as the new canonical `AdScene` contract.

### Renderer Lessons

- `src/components/AdRenderSurface.tsx`
- `src/features/create/templates/visualizerTemplate.ts`
- `src/features/formats/visualizer.ts`

Why: keep the visual taste and one-renderer lessons, but rebuild as a registry-driven renderer instead of copying the old create workspace.

### Prompts And Research Lessons

- `src/server/brand-research.ts`
- `src/server/ad-generation.ts`
- `src/server/dialogue-generation.ts`
- `src/lib/prompts/brand-brain.ts`
- `src/lib/prompts/headline-master.ts`
- `src/lib/prompts/headline-variations.ts`
- `src/lib/prompts/ad-angles.ts`

Why: these contain the receipt-driven prompt improvements and the anti-generic rules.

### Freeze And Regression Tests

- `tests/create-look-contract.spec.ts`
- `tests/create-freeze-contract.spec.ts`
- `tests/legacy-create-render-download.spec.ts`
- `tests/export-visualizer.regression-002.spec.ts`
- `tests/share-page-frame.regression-005.spec.ts`
- `tests/captions-parity.regression-006.spec.ts`
- `tests/brand-headline-quality.regression-007.spec.ts`
- `tests/brand-reviews.regression-008.spec.ts`

Why: tests encode what broke before. v3 should copy the intent, not necessarily the exact implementation.

## Do Not Port

- `src/App.tsx`
- `src/features/create/CreatePage.tsx`
- `src/components/CreateFlow.tsx`
- `src/components/CanvasEditor.tsx` as-is
- `/builder` route behavior
- old Express server structure
- Supabase glue
- Dexie/browser-only save systems
- multiple save paths
- fallback question flow
- phone-call mode
- Meme Ad experimental branch
- Tavily branches
- Postiz/social posting
- dev tuning panel
- old create-v2 UI as a route
- any second renderer or browser recorder fallback

## Visual Reference

Use v1 `/create` screenshots and `tests/create-look-contract.spec.ts` as the first-impression reference. The v3 UI can evolve, but the initial rebuild should preserve the v1 taste before adding anything new.

## First v3 File Map

```text
v3/
  app/
    page.tsx
    create/page.tsx
    s/[slug]/page.tsx
  convex/
    schema.ts
    sessions.ts
    researchRuns.ts
    adScenes.ts
    renderJobs.ts
    sharePages.ts
  features/
    formats/
      registry.ts
      visualizer/
        index.tsx
        createScene.ts
        render.tsx
        validate.ts
    render/
      AdRenderSurface.tsx
      RemotionRoot.tsx
    research/
      firecrawl.ts
      prompts.ts
    audio/
      visualizer.ts
      analysis.ts
    create/
      CreatePage.tsx
      useCreateSession.ts
      useReroll.ts
  workers/
    render-worker/
      index.ts
      renderRemotion.ts
  tests/
    v3-smoke.spec.ts
    v3-render-parity.spec.ts
    v3-format-registry.spec.ts
```

## Phase Gates

1. Spec/docs approved.
2. Convex schema and URL research produce JSON ad candidates.
3. Visualizer format renders from `AdScene`.
4. Reroll/locks feel like Wiggly.
5. Oracle worker renders MP4 from the same scene.
6. Share page opens the same scene.
7. v3 passes the full smoke test and v1 can be archived.
