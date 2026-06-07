# Wiggly v3 Production Runtime

This file is the runtime contract for the clean v3 path. It exists so v3 can move from "works on localhost" to "works after deploy" without silently drifting back into v1-style hidden wiring.

## Runtime Owners

```text
Next.js app
-> renders /create and /s/[slug]
-> calls v3 Convex functions

v3 Convex deployment
-> stores anonymous sessions, research runs, AdScenes, audio assets, render jobs, and share pages
-> owns durable file storage metadata

Oracle render worker
-> claims queued Convex render jobs
-> renders the frozen AdScene with Remotion
-> uploads the MP4 to Convex storage
-> marks the render job ready

Remotion
-> renders through AdRenderSurface only
-> does not rebuild scenes from browser state
```

## Required Environment

Browser/runtime:

```text
NEXT_PUBLIC_V3_CONVEX_URL
NEXT_PUBLIC_V3_CONVEX_SITE_URL
```

Worker/server:

```text
V3_CONVEX_URL
FIRECRAWL_API_KEY
GEMINI_API_KEY
TTS_MODEL optional, defaults to the pinned Gemini TTS model
```

Convex CLI compatibility:

```text
CONVEX_DEPLOYMENT
NEXT_PUBLIC_CONVEX_URL
NEXT_PUBLIC_CONVEX_SITE_URL
```

Those compatibility values may exist because Convex expects them, but v3 app and worker code must prefer the `V3_` names first.

## Health Gate

Run from `v3/`:

```bash
npm run runtime:health
```

The health script checks:

- v3 Convex URL is present.
- Firecrawl and Gemini keys are present without printing secret values.
- Gemini and TTS feature flags are not disabled.
- TTS model is unset or matches the pinned Gemini TTS model.
- Convex public functions are reachable.
- The render worker can see render-job queue readiness without mutating jobs.
- Remotion can bundle and find the canonical `AdSceneMp4` composition.
- The composition keeps the expected 4:5 output and 60 fps.

## Non-Negotiables

- Do not point v3 at the legacy `apps/web` Convex deployment.
- Do not add a second renderer.
- Do not make health checks create render jobs, research runs, share pages, or audio files.
- Do not print secret values in scripts, logs, or test failures.
- Keep v1 `/create` untouched while v3 is being hardened.

## Production Readiness Definition

v3 is production-runtime ready when all of this passes:

```bash
npm run test
npm run typecheck
npm run build
npm run remotion:still
npm run runtime:health
```

Then run one manual smoke:

```text
ogtool.com
-> Read website
-> Generate 50
-> Spacebar reroll
-> Add audio
-> Download video
-> Create share link
-> Open share page
```

## Oracle Live Deployment

v3 deploys beside v1. The legacy PM2 app is still named `wiggly`; v3 must use separate PM2 app names:

```text
wiggly-v3
wiggly-v3-render-worker
```

Manual workflow:

```text
GitHub Actions -> Deploy v3 to Oracle -> scripts/deploy-v3-oracle.sh
```

Required GitHub secret:

```text
V3_CONVEX_DEPLOY_KEY
```

Do not reuse the legacy `CONVEX_DEPLOY_KEY`; that belongs to the old Convex deployment.

The workflow is intentionally `workflow_dispatch` only until v3 passes live smoke.
