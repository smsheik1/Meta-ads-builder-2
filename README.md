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

## Local Setup

```bash
npm install
npm run dev
```

Run `npm run dev` from the repo root, not from `v3/`. The root dev command
starts the full local stack:

- Next.js app on `http://localhost:3020`
- Local Convex on `http://127.0.0.1:3210`
- Render worker for MP4 downloads

If only Next is running, `/create` may load but downloads will show
`Render worker is offline`.

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

To verify the local runtime, run:

```bash
npm run runtime:health
```

The render worker is healthy when the `worker:queue` check passes. If it fails,
stop the partial dev process and restart from the repo root with `npm run dev`.

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
```

Never commit real API keys.

### Local Convex Env

Convex actions do not automatically inherit `v3/.env.local` or the root `.env`.
If local website research says Firecrawl is not configured, set the action env
vars on the local Convex deployment:

```bash
cd v3
admin_key=$(node -e 'const fs = require("fs"); const data = JSON.parse(fs.readFileSync(".convex/local/default/config.json", "utf8")); process.stdout.write(data.adminKey || "");')

CONVEX_DEPLOYMENT= \
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210 \
CONVEX_SELF_HOSTED_ADMIN_KEY="$admin_key" \
npx convex env set FIRECRAWL_API_KEY "$FIRECRAWL_API_KEY"
```

Repeat that command for each env var used by Convex actions through the
`v3/convex/` feature import chain:

```bash
FIRECRAWL_API_KEY=
GEMINI_API_KEY=
GEMINI_ENABLED=true
GEMINI_AD_MODEL=gemini-3.1-flash-lite
GEMINI_BRAND_CURATOR_MODEL=gemini-3.1-flash-lite
GEMINI_DIALOGUE_MODEL=gemini-3.1-flash-lite
DEEPGRAM_API_KEY=
DEEPGRAM_ENABLED=true
TTS_ENABLED=true
TTS_MODEL=gemini-3.1-flash-tts-preview
```

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
