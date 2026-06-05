# Wiggly Web

This is the Next.js workspace for the V2 create engine and shared app code.
The production-feeling `/create` desktop experience is still owned by the
legacy Vite app at the repo root.

## Local Commands

Run commands from the repo root:

```bash
npm run dev
npm run dev:web
npm run lint:web
npm run test:create-v2
```

## Local URLs

- Legacy create app: `http://localhost:3010/create`
- Next/V2 create engine: `http://localhost:3010/create-v2`

Do not add `apps/web/app/create/page.tsx` unless `/create` is intentionally
moved again. Route ownership is frozen so the old `/create` look cannot be
accidentally replaced by the V2 scaffold.

## Current Scope

The legacy `/create` route keeps the desktop user experience and visual taste.
The Next `/create-v2` route keeps the cleaner `AdScene` wiring, Convex-backed
saved designs/share snapshots, and Remotion export work until those pieces are
migrated into `/create` in small, revertable phases.

Convex is the v2 data spine for saved designs and share snapshots. Temporary
MP4 render tickets still live on local server files until durable video storage
is added.
