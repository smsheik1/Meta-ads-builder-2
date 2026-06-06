# Create Lean-Down Plan

Goal: preserve the current desktop `/create` experience while cutting the codebase
down from roughly 29k source/test lines toward 14k-17k lines. The bigger goal is
to remove giant reasoning surfaces, especially `src/App.tsx`.

## Phase 0: Freeze `/create`

- Keep `/create` desktop look and generated-review flow under Playwright tests.
- Keep mobile gated with the "Open Wiggly on your computer." page.
- Keep download on the legacy Remotion snapshot path until it is deliberately
  replaced.
- Keep color-paired generated backgrounds under test.

Done when:

```bash
npm run lint:legacy
npx playwright test tests/create-look-contract.spec.ts tests/style-archetypes.spec.ts tests/create-freeze-contract.spec.ts
```

## Phase 1: Extract AdScene Engine

- Move reusable scene types/layout/helpers out of `/create-v2` UI folders.
- Point legacy `/create`, share, and download adapters at neutral engine modules.
- Do not delete UI yet.
- Do not change the visible `/create` page.

Done when `src/` no longer imports `apps/web/features/create/scene`.

## Phase 2: Delete `/create-v2` UI And Tests

- Delete dead `/create-v2` page/UI/features/tests after the engine extraction.
- Keep Convex/backend pieces that are still needed.
- Keep only small compatibility shims if deleting them would break deploy.

Done in `cleanup/delete-create-v2-ui`: deleted the dead Next create UI,
renamed the reusable Next-side scene contract into `apps/web/features/engine`,
kept the render/share/research/audio API engine, and reduced `apps/web` by
roughly 4.8k lines.

## Phase 3: Remove Dead Branches From `src/App.tsx`

- Remove stale v2 compatibility paths.
- Remove dead homepage/builder crossover logic.
- Remove unused render/share/download fallbacks.
- Keep behavior covered by the `/create` contracts.

Expected line savings: 1.5k-3k.

## Phase 4: Split Live `/create`

- Extract `CreateRoute`, `ShareRoute`, and focused hooks for research, audio,
  export, and saved designs.
- Keep extractions behavior-only. No redesigns inside extraction PRs.

Target: `src/App.tsx` under 400 lines.

## Phase 5: Delete Or Quarantine `/builder`

- Preserve the few loved UI pieces first: saved-template hover/cards and any
  worthwhile canvas hover polish.
- Delete builder route, properties panel, Moveable-heavy editing paths, and dev
  tuning UI if they are no longer part of the product.

Expected line savings: 2k-4k.

## Phase 6: Split `server.ts`

- Move route handlers into research, audio, render, and share modules.
- Delete unused endpoints/fallbacks.

Target: `server.ts` under 300 lines.

## Phase 7: Dependency Diet

- Remove packages tied only to deleted surfaces.
- Likely candidates after builder deletion: `react-moveable`, `react-rnd`,
  `react-selecto`, and old render fallback dependencies.

Every phase must be its own branch/PR so Git can undo mistakes cleanly.
