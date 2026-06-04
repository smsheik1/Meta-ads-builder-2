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

Child issue #1 only proves the new workspace, `AdScene` contract, reducer,
adapters, and a minimal Remotion fixture. It does not cut over `/` or `/create`,
does not persist to Convex, and does not make live AI or TTS calls.
