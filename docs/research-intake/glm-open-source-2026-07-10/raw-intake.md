# Raw GLM Open-Source Research Intake

- Received: 2026-07-10
- Preservation status: Content-preserving transcription; Markdown formatting was normalized and the copied UI label `More actions` was omitted
- Original attachment: `/Users/shaz/.codex/attachments/5ead6da5-5656-454d-a163-6a73b6eb9202/pasted-text.txt`
- Verification status: None

## Response block 1: Core stack

The official Convex starter that does most of your backend:

* github.com/get-convex/convex-saas — TanStack + Convex Auth + Stripe + Resend + Tailwind + shadcn + file uploads + i18n + theming + landing/onboarding/dashboard/admin pages. Production-ready.
* github.com/get-convex/ents-saas-starter — same but Next.js + Convex Ents (which gives you orgs, teams, roles, relations for free).

What this kills from the build:

* Authentication (email + social + anonymous, with anon→OAuth transfer)
* Billing/subscriptions (Stripe + customer portal)
* File storage/uploads (for reference images, product images, exports)
* Email (Resend)
* Realtime DB sync (Convex core)
* Teams/orgs/roles (Ents version)
* Landing page, onboarding, dashboard, admin scaffolding
* Dark mode, theming, responsive

The 3 PRD features that map directly to Convex starter primitives:

1. Anonymous /share fork. Convex Auth has anonymous users built in. The /share → "Edit this ad" → fork flow is just anonymous session → create Player instance → transfer to OAuth if they sign up. Already solved.
2. File uploads. Reference images, product images, exported PNGs, ZIPs. Convex file storage handles all of it with auth-gated HTTP upload actions.
3. Format Version immutability + draft branching. Convex's realtime DB + Ents relations give you the version/draft/instance model for free. One table for Format Versions, one for Player instances, one for overrides.

Updated build estimate with Convex starter:

* Backend (auth, billing, files, email, schema): ~0 days. Use the starter.
* Canvas editor (/builder): ~0 days. Use LayerHub react-design-editor.
* Layer reconstruction (Maker): ~1 week. Wire LayerD output → Polotno JSON.
* Format skill + 8 campaign plays (GLM + Instructor): ~3 days.
* Scraper (browser-use ad-use): ~1 day to adapt.
* /create Player flow: ~3 days. Glue between format selection → website → 8 plays → reroll.
* Reroll logic: ~1 day. JSON swap + CSS swap.

Total custom work: ~2 weeks. Down from the PRD's implied timeline. The nerds built the backend, the editor, the reconstruction, the scraper, and the structured output. You build the glue and the campaign brain.

One pick to make: TanStack (convex-saas) or Next.js (ents-saas-starter). Your existing v3 is Next.js. Use the Ents starter for stack consistency. The orgs/teams/roles model also fits the future Maker marketplace (creator lineage, public formats, team admin).

Bottom line: Start from get-convex/ents-saas-starter. Drop in LayerHub as /builder. Wire LayerD as the Maker engine. Use browser-use as the scraper. Use Instructor + GLM for the 8 plays. You're gluing open source, not building a product from scratch.

## Response block 2: Claimed impact

Massive. It reframes the whole bet.

The shift: without this stack, you're asking "can 2 people build a Canva + an AI reconstruction engine + a campaign planner + a SaaS backend in 3 months?" Answer: no. With this stack, you're asking "can 2 people write a really good Format skill prompt and wire 7 open-source projects together in 2 weeks?" Answer: yes.

What it actually changes:

* The hard problems are no longer your problems. Canvas editor, layer reconstruction, auth/billing/files, realtime sync, structured LLM output. All solved. You don't staff for them, you don't burn time on them, you don't debug them at 2am before the demo.
* Your only IP becomes your only focus. The Format skill (how to understand a reference ad's formula) and the 8 campaign plays (how to adapt it intelligently). That's the thing that makes Wiggly worth buying. Everything else is commodity infrastructure.
* The MVP timeline collapses. PRD implied a multi-month build. This stack is 2 weeks of glue work. You can be testing with real creative teams before the month ends.
* Hiring needs drop. No senior canvas engineer. No reconstruction ML specialist. No backend dev for auth/billing. You need one person who can wire APIs and one person who can write great prompts. That's you and Codex.
* The demo gets stronger. You're showing a product built on a real editor (LayerHub), real reconstruction (LayerD, ICCV 2025 paper), real billing (Stripe via Convex). Investors see production-grade infrastructure, not a prototype held together with hope.

The one risk this stack introduces: you're now 100% dependent on open-source projects you don't control. If LayerD's output format changes, if LayerHub stops receiving updates, if Polotno's JSON schema drifts. Mitigation: fork everything, pin versions, own the translation layer between them. The glue code is your insurance.

Bottom line: this stack turns Wiggly from "can we build it" into "can we make the creative brain good enough." That's the only question that matters for a 0-user startup. Everything else is solved. Ship the demo, prove demand, then decide what to own vs. depend on.

## Response block 3: Image tooling

You're right again. The image editing layer is solved too.

3 projects that do exactly what Wiggly needs:

1. Product photo editing + scene generation — ronchen0927/GenAI-E-Commerce-Asset-Generator
* Upload product photo → get professionally edited image or cinematic product video
* Handles the entire "AI image slot" workflow from the PRD
* Purpose-built for ecommerce. This IS the Wiggly image flow.

2. Brand-guideline-aware image editing — google-marketing-solutions/backgroundr
* Beyond background swap: "performs any visual edit needed to align your image assets with your corporate brand guidelines"
* Built by Google's marketing solutions team. Production-grade.
* Solves the PRD's "Visual Policy: Maker-approved colors, typography, backgrounds" constraint.

3. SOTA general image editing — stepfun-ai/Step1X-Edit
* Open source, matches GPT-4o and Gemini 2 Flash on image editing
* ComfyUI integration available (Yuan-ManX/ComfyUI-Step1X-Edit)
* Handles "add this product to this scene" and "edit this slot" operations

Plus the inpainting primitives:

* Sanster/IOPaint — SOTA inpainting, remove/replace anything
* geekyutao/Inpaint-Anything — SAM segmentation + text-guided inpainting

What this kills from the build:

* Product photo to ad-ready image: solved (GenAI E-Commerce Asset Generator)
* Background swap with brand consistency: solved (backgroundr)
* Slot-fill image editing: solved (Step1X-Edit or IOPaint)
* Cinematic product video from photo: solved (GenAI E-Commerce Asset Generator)

The full updated stack, end to end:

| PRD capability | Open source |
| --- | --- |
| /builder canvas editor | LayerHub react-design-editor |
| Layer reconstruction | LayerD |
| Template JSON + variables | Polotno SDK |
| Single render path | Konva |
| Website scraper + product extraction | browser-use ad-use |
| Structured LLM output (8 plays) | Instructor + GLM |
| Auth/billing/files/email | Convex SaaS starter |
| Product photo → ad image | GenAI E-Commerce Asset Generator |
| Background swap + brand alignment | backgroundr |
| Slot-fill image editing | Step1X-Edit |
| Inpainting primitives | IOPaint |

What you actually build now (<10%):

* Format skill prompt (the creative brain)
* Glue between LayerD → Polotno JSON
* Glue between product photo → image editor → ad slot
* /create Player flow wiring
* Convex schema for Format Versions + Player instances

The honest number: you're at maybe 5-8% custom code. The nerds built the editor, the reconstruction, the scraper, the image editing, the inpainting, the background swap, the structured output, and the entire SaaS backend. Your job is wiring and the one prompt that makes the 8 ads intelligent instead of generic.

The one leverage insight: Google's backgroundr is the sleeper hit here. A Google marketing solutions team built an open-source tool that aligns images to brand guidelines automatically. That's the "Visual Policy" enforcement from the PRD, solved by Google's own engineers. Use it.

## Response block 4: Avnac concepts

What Avnac does better (worth stealing as concepts, not code):

* Magic panel for prompt-driven editing. The UX pattern of "type a natural language edit, see it applied" is exactly what the PRD's Maker skill editor wants. Borrow the pattern, build it on LayerHub.
* TanStack Router. Matches the Convex SaaS starter stack. But you can use TanStack with LayerHub too.
