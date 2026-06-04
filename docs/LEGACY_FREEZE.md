# Legacy Freeze

The current Vite/Express product path is frozen.

## Frozen Areas

- `src/App.tsx`
- `src/components/CanvasEditor.tsx`
- `src/components/CreateFlow.tsx`
- `src/routes/ShareAdPage.tsx`
- `src/remotion/*`
- `server.ts`

These files remain available as reference material while the clean-room create
path is rebuilt in `apps/web`.

## Allowed Legacy Changes

- Production-blocking bug fixes that keep the existing app usable before cutover.
- Security fixes.
- Small compatibility changes required to keep the old app running while `apps/web`
  is introduced.

## Not Allowed

- New product features in legacy `/create`.
- New product features in `/builder`.
- New renderer logic outside the canonical v2 renderer path.
- Refactors of legacy files unless they are required for a production-blocking fix.

## Active Development Path

Build new Wiggly product work in `apps/web`.

The temporary route is:

```txt
http://localhost:3010/create-v2
```

Cutover happens only after the v2 create path can complete the full user loop:
website research, ad generation, audio, save/history, download, and share.

After cutover, delete the frozen legacy areas in one cleanup PR.
