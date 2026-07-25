# Wiggly Development

The active product lives in `v3/`.

- Frontend: Next.js App Router
- Backend and data: Convex
- Video: Remotion
- Audio and captions: Gemini TTS, uploaded audio, and Deepgram transcription
- Interaction state: a small Zustand canvas store

The legacy Vite/Express `/create` and `/builder` code was archived at the
`legacy/v1-create-builder-reference` branch and tag. Use it only as a read-only
visual or behavioral reference.

## Local setup

Run the complete local stack from the repository root:

```bash
npm install
npm run dev
```

This starts:

- Next.js at `http://localhost:3020`
- Local Convex at `http://127.0.0.1:3210`
- The render worker used for MP4 downloads

If only Next.js is running, `/create` can load while downloads report that the
render worker is offline.

## Useful commands

```bash
npm run test
npm run build
npm run typecheck
npm run runtime:health
npm run smoke:live
```

Run `npm run runtime:health` to verify the full stack. The render worker is
ready when the `worker:queue` check passes.

## Environment

Use `v3/.env.local` for local v3 development. The root `.env` is legacy and
should stay empty. Never commit real API keys.

Common local keys:

```bash
V3_CONVEX_URL=
NEXT_PUBLIC_V3_CONVEX_URL=
NEXT_PUBLIC_V3_CONVEX_SITE_URL=
V3_CONVEX_DEPLOY_KEY=
FIRECRAWL_API_KEY=
BRANDFETCH_API_KEY=
GEMINI_API_KEY=
DEEPGRAM_API_KEY=
```

Website research tries Jina Reader first with an eight-second timeout.
`FIRECRAWL_API_KEY` remains the fallback for blocked, weak, timed-out, or
JavaScript-heavy reads.

Convex actions do not automatically inherit `v3/.env.local`. Set required
action variables on the local Convex deployment:

```bash
cd v3
admin_key=$(node -e 'const fs = require("fs"); const data = JSON.parse(fs.readFileSync(".convex/local/default/config.json", "utf8")); process.stdout.write(data.adminKey || "");')

CONVEX_DEPLOYMENT= \
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210 \
CONVEX_SELF_HOSTED_ADMIN_KEY="$admin_key" \
npx convex env set FIRECRAWL_API_KEY "$FIRECRAWL_API_KEY"
```

Repeat that command for each variable used by the active Convex feature path.
Production secrets and the complete runtime contract are documented in
[v3 production runtime](v3-production-runtime.md).

## Deployment

The active deployment workflow is
`.github/workflows/deploy-v3-oracle.yml`. It runs
`scripts/deploy-v3-oracle.sh`, deploys Convex, builds Next.js, starts the v3
app, and starts the render worker.

## Architecture

- [v3 specification](v3-spec.md)
- [v3 architecture](v3-architecture.md)
- [Production runtime](v3-production-runtime.md)
- [Roadmap](../ROADMAP.md)
