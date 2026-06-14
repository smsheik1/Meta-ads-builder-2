# Wiggly v3 Spec

## Decision

Build Wiggly v3 as a clean app beside v1. v1 stays frozen as a read-only reference for visuals, prompts, visualizer math, and hard-won render lessons. v3 is the only future shipping path once it passes the full smoke test.

## Product

Wiggly turns a brand website into many polished social ad options, then lets the user reroll, preview, download, and share the best one.

## MVP Scope

The smallest shippable v3 flow is:

URL -> Firecrawl research -> 50 ad ideas -> preview one ad -> spacebar reroll -> optional audio -> MP4 download -> share page

Anything outside that flow is post-launch.

Website research should use text and visual brand evidence:

```text
Firecrawl markdown -> offer, audience, receipts, claims
Firecrawl branding -> colors, fonts, typography, UI feel
Optional screenshot capture -> visual vibe and later rendered-frame QA
```

The first version uses markdown and branding in the blocking URL-submit path. Screenshot capture is opt-in/future format work because full-page screenshots can make ecommerce sites timeout. v3 does not ask AI to generate the design.

## Pages

- `/`: simple entry or redirect into create.
- `/create`: URL input, generated ads, preview, reroll, audio, download, share.
- `/s/[slug]`: public share page for a frozen rendered ad scene.
- `/api/*`: render worker callbacks and webhook-style endpoints only when needed.

## Stack

- Next.js 16 for the web app.
- Convex for anonymous sessions, research runs, scenes, render jobs, share records, and storage metadata.
- shadcn/ui + Tailwind for product UI.
- Gemini for ad copy and dialogue generation, with deterministic fallback when the model is unavailable.
- Remotion for video rendering.
- Oracle render worker for Chromium/Remotion MP4 work.
- PostHog for product analytics.
- Vercel for the web app.

## Data Objects

- `sessions`: anonymous visitor/session identity.
- `researchRuns`: URL, evidence, receipts, model output, status.
- `brandSnapshots`: normalized brand colors, fonts, logo, screenshot, and visual vibe.
- `adScenes`: typed frozen ad scene payloads.
- `renderJobs`: scene id, requested format, progress, status, output file.
- `sharePages`: slug, scene id, render output, CTA URL, brand metadata.

## Hard Rules

- No v1 feature crosses over unless named in `docs/v3-port-plan.md`.
- One typed `AdScene` contract.
- One render pipeline.
- `AdRenderSurface` delegates by format; it must not become a giant component.
- One save path, one share path, one download path.
- Templates are isolated modules from day one.
- Adding a future format must mean adding a format module, not editing core product state.
- No feature code starts until `docs/v3-spec.md`, `docs/v3-architecture.md`, and `docs/v3-port-plan.md` are reviewed.

## First Launch Smoke Test

Paste `ogtool.com` -> generate ads -> pick/reroll an ad -> add or skip audio -> download MP4 -> create share link -> open share link -> confirm preview/download/share all use the same scene data.
