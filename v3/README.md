# Wiggly v3

Clean rebuild workspace. v1 remains the frozen reference; v3 is the future shipping path only after the full smoke test passes.

## Phase 0

This folder is intentionally isolated from the root app and root workspaces.

```bash
cd v3
npm install
npm run dev
```

The local app runs on `http://localhost:3020`.

## Rules

- Do not copy v1 app structure.
- Do not wire v3 into production until it passes the full smoke test.
- Convex owns data and render job state.
- Oracle worker owns Remotion MP4 rendering.
- Templates live as format modules from day one.
