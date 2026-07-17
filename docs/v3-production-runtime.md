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
BRANDFETCH_API_KEY
NVIDIA_NIM_API_KEY
GEMINI_API_KEY
REPLICATE_API_TOKEN
FISH_STUDIO_APIKEY
ELEVENLABS_API_KEY
V3_PUBLIC_BASE_URL
NVIDIA_NIM_AD_MODEL optional, defaults to z-ai/glm-5.2
NVIDIA_NIM_BRAND_CURATOR_MODEL optional, defaults to z-ai/glm-5.2
NVIDIA_NIM_MEME_MODEL optional, defaults to z-ai/glm-5.2
TTS_MODEL optional, defaults to the pinned Gemini TTS model
```

Optional public route:

```text
V3_PUBLIC_HOST
```

When present, the Oracle deploy script writes a dedicated nginx server block for that hostname and proxies it to the v3 app port. This must stay separate from `wiggly.agentenamel.com` until v3 intentionally replaces v1.

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
- Firecrawl, NVIDIA NIM, Gemini, Replicate, Fish Audio, and ElevenLabs keys are present without printing secret values.
- The public base URL needed for provider callbacks and stored media URLs is present.
- Gemini and TTS feature flags are not disabled.
- TTS model is unset or matches the pinned Gemini TTS model.
- Convex public functions are reachable.
- The render worker can see render-job queue readiness without mutating jobs.
- Remotion can bundle and find the canonical `AdSceneMp4` composition.
- The composition keeps the expected 4:5 output and 60 fps.

## Non-Negotiables

- Do not point v3 at a legacy Convex deployment.
- Do not add a second renderer.
- Do not make health checks create render jobs, research runs, share pages, or audio files.
- Do not print secret values in scripts, logs, or test failures.
- Keep legacy reference branches read-only while v3 is being hardened.

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

The live smoke command is intentionally manual because it spends provider and render resources:

```bash
npm run smoke:live
```

The command exercises:

```text
ogtool.com -> research -> 50 ads -> reroll -> audio -> render job -> MP4 download URL -> share page
```

Optional knobs:

```text
V3_PUBLIC_BASE_URL
LIVE_SMOKE_WEBSITE_URL
LIVE_SMOKE_AD_COUNT
LIVE_SMOKE_RENDER_TIMEOUT_MS
```

Do not put `npm run smoke:live` in the normal push/PR path.

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

Default public test host:

```text
https://v3.wiggly.agentenamel.com/create
```

### Maker dogfood runtime

Production `/builder` analysis is enabled by `WIGGLY_MAKER_LIVE_ANALYSIS=true` and requires the GitHub Actions secrets `OPENROUTER_API_KEY` and `REPLICATE_API_TOKEN`. The Oracle deploy installs and prewarms PaddleOCR in `v3/.maker-analysis-venv` only when the requirements checksum changes; normal deploys reuse that environment. Core Convex and app deployment completes before the optional Maker OCR bootstrap, so a slow model download cannot hold unrelated formats on the previous release.

Maker drafts and published versions remain browser-local during dogfooding. The assistant must use the same browser profile and should not clear site storage until durable persistence is implemented.

The workflow runs automatically when `main` changes and remains manually triggerable for retries.
