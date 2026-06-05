# Wiggly Web

This is the Next.js workspace for the current Wiggly create path.

## Local Commands

Run commands from the repo root:

```bash
npm run dev:web
npm run lint:web
npm run test:create-v2
```

## Local URLs

- New Next app: `http://localhost:3010`
- Create routes: `http://localhost:3010/`, `http://localhost:3010/create`, `http://localhost:3010/create-v2`

## Current Scope

The `/`, `/create`, and `/create-v2` paths all serve the same create loop:
website research, generated `AdScene` snapshots, audio upload/TTS generation,
saved designs, share pages, and Remotion export.

Convex is the v2 data spine for saved designs and share snapshots. Temporary
MP4 render tickets still live on local server files until durable video storage
is added.
