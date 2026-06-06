# Create Freeze

`/create` is the active product path.

The app tried a clean-room `/create-v2` rewrite, but the definitive user
experience is now the desktop `/create` page served by the Vite/Express app.
Do not replace `/create` with `/create-v2` UI again. Treat `/create-v2` code as
donor/reference material until it is deleted.

## Frozen Areas

- `src/App.tsx`
- `src/components/CanvasEditor.tsx`
- `src/components/CreateFlow.tsx`
- `src/routes/ShareAdPage.tsx`
- `src/remotion/*`
- `server.ts`
- `src/engine/ad-scene/*`

These files are allowed to change only through small, tested stabilization
patches. Any visual change to `/create` must update the `/create` look contract
tests in the same PR.

## Allowed Changes

- Production-blocking bug fixes.
- Security fixes.
- Small extraction/refactor steps that preserve `/create` behavior.
- Deletion of dead `/create-v2` or `/builder` code after the reusable pieces are
  moved to neutral modules.

## Not Allowed

- Replacing `/create` with `/create-v2` UI.
- New product features in `/builder`.
- New renderer logic outside the current `/create` preview/download/share path.
- Large refactors that mix deletion, extraction, and visual changes in one PR.

## Current Verification Gate

Run these before merging changes that touch `/create`, render/share/download, or
the AdScene engine:

```bash
npm run lint:legacy
npx playwright test tests/create-look-contract.spec.ts tests/style-archetypes.spec.ts tests/create-freeze-contract.spec.ts
```

## Lean-Down Direction

1. Freeze `/create` behavior with tests.
2. Extract reusable AdScene engine pieces into neutral `src/engine/*` modules.
3. Delete `/create-v2` UI/tests once `src/` no longer depends on them.
4. Remove dead branches from `src/App.tsx`.
5. Split live `/create` logic into small modules.
6. Delete or quarantine `/builder` after preserving the few UI pieces we still
   want.
7. Split `server.ts` by route and remove unused fallbacks.

The target is fewer lines, but the real goal is smaller reasoning surfaces: no
single product file should stay thousands of lines long.

The feature-by-feature deletion gate lives in
[`CREATE_V2_LEGACY_AUDIT.md`](./CREATE_V2_LEGACY_AUDIT.md).
