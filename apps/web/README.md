# Wiggly Web Foundation

This is the clean-room Next.js workspace for the new Wiggly create path.

## Local Commands

Run commands from the repo root:

```bash
npm run dev:legacy
npm run dev:web
npm run lint:web
npm run test:create-v2
```

## Local URLs

- Legacy Vite app: `http://localhost:3000`
- Legacy Express API: `http://localhost:3001`
- New Next app: `http://localhost:3010`
- New foundation route: `http://localhost:3010/create-v2`

## Current Scope

The new `/create-v2` path owns the clean-room create loop: website research,
generated `AdScene` snapshots, audio script/TTS generation, saved designs,
share pages, and Remotion export. The frozen legacy app still serves the old
Vite/Express experience until `/` and `/create` are explicitly cut over.

Convex is the v2 data spine for saved designs and share snapshots. Temporary
MP4 render tickets still live on local server files until durable video storage
is added.
