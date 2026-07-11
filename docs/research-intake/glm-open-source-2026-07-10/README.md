# GLM Open-Source Research Intake

- Status: Organized and assessed; only explicitly promoted benchmarks affect the living ledger
- Received: 2026-07-10
- Source: Founder-provided GLM research
- Product-code impact: None

This folder preserves and organizes a large external research response before Wiggly evaluates any claim or candidate. Inclusion here does not promote a dependency into the [open-source research ledger](../../static-format-package-open-source-ledger.md).

## Review packets

1. [Backend and platform starters](./01-backend-and-platform.md)
2. [Editor, reconstruction, scraping, and structured output](./02-editor-reconstruction-and-generation.md)
3. [AI image and inpainting tooling](./03-ai-image-tooling.md)
4. [Leverage claims, estimates, risks, and UX concepts](./04-leverage-estimates-and-concepts.md)
5. [Ruthless comparison against the Wiggly plan](./05-assessment.md)

The [raw intake](./raw-intake.md) is preserved separately so trimming does not destroy context. The assessment is the decision record; the earlier packets remain a faithful organization of GLM's claims.

## Recommended review order

Review one packet at a time:

1. Architecture compatibility and overlap with existing Wiggly
2. Actual repository identity, activity, setup, and output contracts
3. Quality benchmark or integration spike
4. Only then update the approved ledger or implementation plan

Review the timing and custom-code estimates last. Their validity depends on the earlier architecture and repository checks.

## Unique candidate inventory

### Backend and platform

- `get-convex/convex-saas`
- `get-convex/ents-saas-starter`
- Convex Auth
- Convex Ents
- Stripe
- Resend

### Editor, reconstruction, and generation

- LayerHub `react-design-editor`
- LayerD
- Polotno SDK and its JSON format
- Konva
- `browser-use`
- `ad-use`
- Instructor
- GLM

### AI image tooling

- `ronchen0927/GenAI-E-Commerce-Asset-Generator`
- `google-marketing-solutions/backgroundr`
- `stepfun-ai/Step1X-Edit`
- `Yuan-ManX/ComfyUI-Step1X-Edit`
- `Sanster/IOPaint`
- `geekyutao/Inpaint-Anything`

### UX and routing concepts

- Avnac prompt-driven Magic panel
- TanStack Router

## What was trimmed

The review packets remove repeated statements that the stack is a “game changer,” that most engineering is “solved,” and that Wiggly only needs glue. Those ideas remain once in the estimates packet as claims to test.

Repeated capability lists were consolidated. Specific repositories, proposed roles, time estimates, dependency risks, and architecture suggestions were retained.
