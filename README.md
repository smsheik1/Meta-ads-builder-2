# Wiggly

Wiggly turns a brand URL into visualizer-style video ads that can be previewed,
rerolled, saved, shared, and exported without opening a video editor.

## Current App

The active product lives in `v3/`.

- Frontend: Next.js App Router
- Backend/data: Convex
- Video: Remotion
- Audio/captions: Gemini TTS, uploaded audio, Deepgram transcription
- Interaction state: small Zustand canvas store

The legacy Vite/Express `/create` and `/builder` code was archived before
deletion at:

- Branch: `legacy/v1-create-builder-reference`
- Tag: `legacy-v1-create-builder-reference`

Use that branch only as a read-only reference for old visual taste or behavior.
Do not ship from it.

## Local Development

```bash
npm install
npm run dev
```

The v3 app runs at:

```text
http://localhost:3020/create
```

## Useful Commands

```bash
npm run test
npm run build
npm run typecheck
npm run runtime:health
npm run smoke:live
```

All root commands delegate to `@wiggly/v3`.

## Environment

Use `v3/.env.local` for local v3 development. Required production secrets are
documented in `docs/v3-production-runtime.md`.

Common local keys:

```bash
V3_CONVEX_URL=
NEXT_PUBLIC_V3_CONVEX_URL=
NEXT_PUBLIC_V3_CONVEX_SITE_URL=
V3_CONVEX_DEPLOY_KEY=
FIRECRAWL_API_KEY=
GEMINI_API_KEY=
DEEPGRAM_API_KEY=
OPENROUTER_API_KEY=
```

Never commit real API keys.

## Deployment

The active deploy workflow is:

```text
.github/workflows/deploy-v3-oracle.yml
```

The workflow runs `scripts/deploy-v3-oracle.sh`, deploys Convex, builds Next,
starts the v3 app, and starts the render worker.

## Project Memory

- v3 spec and architecture: `docs/v3-spec.md`, `docs/v3-architecture.md`
- Production runtime: `docs/v3-production-runtime.md`
- Future work: `ROADMAP.md`
