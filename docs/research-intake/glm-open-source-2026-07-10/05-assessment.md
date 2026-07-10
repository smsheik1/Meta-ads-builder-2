# GLM Research Versus the Wiggly Open-Source Plan

- Assessment status: Complete enough to make stack decisions
- Assessed: 2026-07-10
- Product-code impact: None
- Next step: Run the bounded benchmarks listed in section 8 before implementation planning

## 1. Ruthless Verdict

GLM was useful as a repository scout and poor as a systems architect.

It found several projects worth investigating, especially Avnac, Polotno, BackgroundR, Step1X-Edit, and future anonymous-account linking through the Convex ecosystem. It then overclaimed what those projects solve, combined incompatible scene and rendering systems, ignored Wiggly's existing code, and erased the hardest integration work from its schedule.

The existing Wiggly plan is the stronger foundation because it starts from the actual repository, the Graphify blast radius, and the locked product contracts. It borrows narrow capabilities while preserving one scene contract and one renderer. GLM starts from greenfield starter templates and full applications, then assumes their overlapping stores, schemas, runtimes, and renderers can be joined with trivial glue.

### Scores

| Dimension | Wiggly plan | GLM research | Verdict |
| --- | ---: | ---: | --- |
| Candidate discovery | 8/10 | 7/10 | GLM added several worthwhile leads |
| Factual accuracy | 9/10 | 4/10 | Several GLM descriptions do not match the named repositories |
| Fit to the existing repository | 9/10 | 2/10 | GLM largely reasoned as if Wiggly did not exist yet |
| Architecture coherence | 9/10 | 2/10 | GLM proposed competing scene models, stores, and renderers |
| MVP restraint | 9/10 | 3/10 | GLM pulled billing, teams, dashboards, video, and multiple image runtimes into a static Maker MVP |
| Estimate credibility | 7/10 | 1/10 | The 0-day, two-week, and 5–8% claims have no defensible counting method |
| Overall | **8.5/10** | **3.2/10** | Use GLM as a source of leads, not as the build plan |

## 2. Head-to-Head Decision Matrix

| Area | Wiggly's position | GLM's position | Winner | Decision |
| --- | --- | --- | --- | --- |
| Existing backend | Extend the current Next.js, Convex, storage, jobs, research, share, and anonymous-session system | Start from a Convex SaaS or Ents starter | Wiggly | Keep the existing runtime; mine isolated examples only |
| Format versioning | Add app-specific drafts, immutable versions, frozen assets, lineage, and project pins | Ents makes branching and immutability nearly free | Wiggly | Ents can model relations; it does not define Wiggly's publication semantics |
| Authentication | Keep the current internal gate and anonymous project identity for Maker-first | Add general auth, organizations, teams, and ownership transfer now | Wiggly for MVP | Revisit Better Auth anonymous linking when durable user accounts become a measured requirement |
| Editor mechanics | Use DOM-native scene elements with focused transform, selection, ordering, and undo components | Combine LayerHub, Polotno JSON, and Konva | Wiggly | Reject the combined stack; benchmark Avnac primitives and Polotno separately |
| Full-editor buy option | Initially rejected wholesale editors to protect renderer parity | Surface Polotno as a nearly complete editor | GLM found the question | Run one bounded Polotno alternate-architecture spike; do not mix it with LayerHub |
| Open-source editor primitives | Moveable, Selecto, dnd-kit, and Zundo | Mention Avnac mainly as UX inspiration | GLM found it; Wiggly assessed it better | Promote Avnac's scene primitives, geometry, snapping, transform, and tests to a first-class benchmark |
| Reference decomposition | LayerD plus normalization and explicit unsupported outcomes | LayerD to Polotno JSON | Wiggly | LayerD is a shared good find; Wiggly has the more complete contract |
| OCR and fonts | PaddleOCR plus font-classify | Not specified | Wiggly | Keep the Wiggly pipeline |
| Semantic reconstruction | Benchmark Kimi K2.6 against MiniMax M3 with a fixed schema | Treat reconstruction as mostly LayerD wiring | Wiggly | GLM underestimates semantic-role and Format-formula recovery |
| Website and product research | Extend Wiggly's existing evidence-bearing Shopify, WooCommerce, brand, and product extraction | Replace or accelerate it with browser-use/ad-use | Wiggly | `ad-use` is a demo ad generator, not a replacement research subsystem |
| Structured model output | NVIDIA NIM guided JSON plus Zod and fail-visible validation | Instructor plus GLM | Wiggly | Instructor is unnecessary while NIM supplies schema-constrained output directly |
| Format instructions | One copy/pasteable `SKILL.md` per Format, validated against typed data | A Format skill and prompt, details unspecified | Wiggly | Keep the Agent Skills envelope and Wiggly trust boundary |
| Image generation policy | Explicit, manual, one-at-a-time, only when a Format requires it | Compose several generators, inpainting tools, batch flows, and fallbacks | Wiggly | Do not add an image runtime before a real Format proves it is needed |
| Brand-aware image prompts | Deterministic visual policy for native layers; provider benchmark later | BackgroundR as brand-policy machinery | Tie on idea; Wiggly on semantics | Mine prompt and scoring patterns; BackgroundR does not deterministically enforce layer policy |
| General image editing | Nano Banana 2 Lite for tests; benchmark providers when needed | Step1X-Edit and ComfyUI | Unknown | Step1X is a serious later benchmark, but its self-hosted v1 runtime is heavy and not an MVP dependency |
| Inpainting | Add only for a measured manual remove/replace need | IOPaint plus Inpaint Anything | Wiggly | Both are old or archived stacks; retain the interaction pattern, not the runtime |
| Renderer parity | One complete scene through `AdRenderSurface` for preview, export, and share | LayerHub/Polotno/Konva plus unspecified delivery path | Wiggly | GLM never closes the parity loop |
| Timeline | Benchmark first, then phase the Maker vertical slice | Approximately two weeks for the full assembly | Wiggly | Two weeks may produce a disposable demo, not the accepted Maker and Player system |
| Custom-code target | About 35% new Wiggly-specific implementation | About 5–8% | Wiggly | Keep a 30–40% planning range until benchmark evidence changes it |

## 3. Where the Wiggly Plan Is Decisively Better

### It starts from the system that exists

Wiggly already has a Next.js 16 and React 19 app, Convex persistence, anonymous sessions, storage uploads, brand research, product extraction, render jobs, audio assets, saved designs, and share pages. Replacing that foundation with a starter is not leverage. It is a transplant.

Graphify also shows that `CreateResearchClient.tsx`, `formats/registry.ts`, `AdRenderSurface.tsx`, and `scene/types.ts` are high-impact nodes. The Wiggly plan contains the change by adding one data-driven static Format engine. GLM's plan would route multiple foreign document models through those hotspots.

### It understands that integration glue is the product

The following are not incidental glue:

- Converting decomposition output into durable native and raster layers
- Recovering semantic roles and a reusable advertising formula
- Binding slots and coherent Reroll Groups
- Preserving Player overrides through content and visual rerolls
- Publishing immutable versions with frozen assets
- Producing complete scenes and atomic eight-play batches
- Keeping preview, download, and share pixel-identical
- Enforcing Maker versus Player permissions
- Validating text fit, contrast, missing assets, and unsupported references

Those contracts are Wiggly. Counting them as 5–8% because other repositories draw rectangles or call image models is misleading.

### It has a coherent renderer strategy

The Wiggly plan has one canonical scene and one pixel renderer. GLM names LayerHub, Polotno, and Konva together without assigning scene ownership. LayerHub historically used Fabric.js, Polotno owns a MobX-backed document and Konva canvas, and Wiggly owns `AdScene` plus `AdRenderSurface`. That is not one editor. It is three editors and a translation problem.

### It has a complete reconstruction hypothesis

LayerD is valuable, but it does not by itself recover the meaning of the ad, native text, exact fonts, variable slots, reroll groups, or the reusable Format skill. Wiggly's LayerD + OCR + font classification + VLM + normalization benchmark addresses the actual problem.

### It respects the paid-generation boundary

GLM's image stack contains parallel generation, automatic retries, provider or local fallbacks, and video. The locked Wiggly product requires explicit user clicks, one image at a time, visible progress, no silent fallback, and static images first.

## 4. Where GLM Was Better

### Avnac is a stronger lead than our original ledger recognized

Avnac is current, React 19, TypeScript, Zustand, and browser-first. Its repository includes a custom scene model, rendering/export logic, geometry and snapping primitives, selection, grouping, reordering, transforms, cropping, tests, and a prompt-driven Magic panel. It no longer depends on an external canvas editing runtime.

That does not mean Wiggly should transplant Avnac. It means we should inspect and benchmark its small scene-engine primitives before assembling Moveable, Selecto, dnd-kit, and Zundo ourselves. GLM deserves credit for surfacing it, even though GLM undersold it as mostly a UX pattern.

### Polotno creates a legitimate build-versus-buy fork

Polotno is a real, current React 19 editor SDK with a canonical JSON schema, selection, resizing, snapping, undo/redo, UI, and export. It may be the fastest way to a capable Maker if Wiggly is willing to let Polotno own the static design renderer and adapt preview, builder, export, and share around that one ownership decision.

That is a different architecture, not a component to combine with LayerHub and the current renderer. A short spike can test whether the time savings justify the architecture change.

### BackgroundR contains useful prompt and quality-control patterns

BackgroundR is a maintained Google Sheets workflow around Nano Banana and Gemini with prompt composition, asset ingredients, bulk organization, quality scoring, and regeneration. Its Sheets, Apps Script, Drive, bulk, and automatic-regeneration layers are irrelevant to Wiggly, but its prompt construction and scoring ideas may improve a future manual AI-image action.

### Step1X-Edit is a credible later image-editing benchmark

Step1X-Edit is active and publishes code, weights, evaluation data, text-to-image support, and instruction-based edits. It belongs in a product/logo fidelity benchmark once a real Format needs product insertion or scene editing. It does not belong in the core Maker-first path before that need exists.

### Anonymous-to-account linking is a useful future capability

Convex with Better Auth supports an Anonymous plugin, and Better Auth exposes an account-link callback where Wiggly could transfer app-owned projects. GLM was right to surface the workflow. It was wrong to imply that the recommended Ents starter already supplied it or that the transfer of Wiggly-owned data was automatic.

## 5. Where GLM Is Factually or Architecturally Wrong

### The preferred Convex starter is misdescribed

`get-convex/ents-saas-starter` is a Clerk-based Next.js starter, not the Convex Auth and Stripe system described in the intake. Its dependency line is also substantially behind Wiggly's current Next.js, React, Convex, Zod, and Tailwind versions. It may contain useful team-relation examples. It is not Wiggly's new backend.

`get-convex/convex-saas` is real and includes Convex Auth, Stripe, Resend, uploads, and SaaS pages, but it is a TanStack/Vite starter for a new application. Wiggly should mine examples only when billing or email enters scope.

### LayerHub cannot supply a zero-day editor

The named `layerhub-io/react-design-editor` repository is no longer available at its original URL. Historical material shows a Fabric.js editor from 2022, with users reporting the repository and demo unavailable later. A deleted, old Fabric editor is not a production shortcut for a React 19 product with a one-renderer contract.

### Polotno is not open source and is not “just JSON”

Polotno is an opinionated editor SDK with its own store, canvas, schema, renderer, and production subscription. Licensing is not the current ranking criterion, but system ownership is. If Wiggly adopts it, Polotno becomes a central runtime decision.

### `ad-use` is not Wiggly's scraper

`ad-use` is an example inside browser-use. It visits a landing page, summarizes a brand, takes a screenshot, and generates final raster or video ads with Google models. It does not provide Wiggly's product catalog selection, evidence receipts, deterministic brand snapshot, Shopify/WooCommerce extraction, or editable Format inputs.

### Instructor duplicates NVIDIA NIM

NVIDIA NIM supports JSON-schema-constrained generation directly. Wiggly already uses Zod. Instructor is a strong general library, but adding it here would wrap a capability the locked provider already supplies and may encourage repair/retry behavior that conflicts with fail-visible generation.

### The image “system” is a pile of demos, not a pipeline

The E-Commerce Media Studio is a small FastAPI/Celery/Redis reference app with provider/local fallbacks, retries, Replicate, video, and large local models. IOPaint is archived. Inpaint Anything is a 2023 research stack around the original SAM and older inpainting models. These can teach interaction and prompt patterns; they do not collectively become a low-maintenance Wiggly subsystem.

### “CSS visual reroll” is not a design system

A visual reroll must respect Maker-approved policies, Player overrides, locks, contrast, text fit, brand colors, asset compatibility, and deterministic replay. Swapping CSS does not solve those semantics.

## 6. Claim-by-Claim Ruling

| GLM claim | Ruling | Why |
| --- | --- | --- |
| Backend is approximately zero days | **Rejected** | Wiggly already has the backend; starter adoption creates replacement and migration work |
| Canvas editor is zero days | **Rejected** | The named editor is unavailable; Polotno or Avnac still requires scene ownership, integration, parity, and QA decisions |
| Scraper adaptation is about one day | **Rejected** | `ad-use` is not a catalog and evidence extraction system |
| Format skill plus eight plays is about three days | **Unproven** | Prompting is easy; coherent strategies, slot validation, reroll groups, atomic batches, and failure UX are not |
| Player flow is about three days | **Rejected for accepted quality** | Product selection, compact brief, questions, eight plays, two rerolls, override preservation, progress, share, and download exceed a three-day wiring task |
| Reroll logic is about one day | **Rejected** | Content groups, visual policies, locks, overrides, deterministic seeds, fitting, and replay are core domain logic |
| Two people can ship the whole MVP in two weeks | **Rejected** | Possible only for a disposable happy-path demo with substantial acceptance criteria removed |
| Wiggly-specific code can fall to 5–8% | **Rejected** | No counting method; excludes the system-defining contracts and all integration ownership |
| Engineering risk shifts almost entirely to creative quality | **Rejected** | Reconstruction fidelity, text layout, immutable publication, parity, and state semantics remain real engineering risks |

## 7. Updated Stack Decision

### Keep as the main path

- Existing Wiggly Next.js, Convex, research, job, storage, share, and rendering infrastructure
- One additive `StaticAdScene` and one `static-package` format engine
- `AdRenderSurface` as the only Wiggly pixel-render entry point
- LayerD + PaddleOCR + font-classify + one benchmark-selected VLM
- NVIDIA NIM guided JSON + Zod validation
- Agent Skills-compatible, copy/pasteable `SKILL.md` per Format
- Manual, one-at-a-time AI image generation only when a real Format needs it

### Promote to a bounded benchmark

- Avnac scene-engine primitives versus Moveable + Selecto + dnd-kit + Zundo
- Polotno as a separate alternate architecture, never combined with LayerHub
- Step1X-Edit versus Nano Banana on product/logo fidelity when image editing enters scope
- BackgroundR prompt construction and quality-scoring ideas
- Better Auth anonymous linking when real account ownership enters scope
- browser-use only against a measured corpus of pages the existing research pipeline cannot extract

### Reject for the current MVP

- Replacing Wiggly with either Convex starter
- LayerHub `react-design-editor`
- LayerHub + Polotno + Konva as a combined editor stack
- browser-use/ad-use as the main website research system
- Instructor around NVIDIA NIM
- AI E-Commerce Media Studio as a runtime
- IOPaint or Inpaint Anything as current dependencies
- ComfyUI as production orchestration
- Billing, organizations, public marketplace administration, and video in the Maker-first slice

## 8. What Is Still Unknown and Needs Evidence

These are the only material questions the research did not settle.

### Benchmark A: Avnac primitives versus the Daybrush assembly

Build the same tiny editor interaction against both approaches:

- Select one and multiple DOM-native static layers
- Drag, resize, rotate, snap, reorder, group, undo, and redo
- Emit semantic commands and a complete normalized scene
- Render the same scene through preview and export

Measure implementation time, code retained, interaction correctness, bundle cost, and how much foreign state must be adapted.

### Benchmark B: Polotno alternate architecture

Do not integrate it into the product. In an isolated spike:

- Load one normalized Codex-style design
- Edit native text, image, shape, group, lock, crop, and order
- Persist and reload a version
- Produce preview and export pixels
- Determine whether `/create`, `/builder`, `/share`, and download can all consume one authoritative Polotno-backed static scene without dual rendering

Reject it if parity requires a second independent implementation or continuous lossy translation.

### Benchmark C: Reconstruction quality

Run LayerD, PaddleOCR, font-classify, Kimi K2.6, and MiniMax M3 on the Codex reference plus 8 to 10 assistant-saved ads. The approved ledger already defines the gates.

### Benchmark D: Image editing only when demanded

When the first Format contains a real generative image slot, compare Nano Banana and Step1X-Edit on:

- Product and logo fidelity
- Instruction following
- Transparent output or masking needs
- Text corruption
- Latency and cost
- One-at-a-time failure behavior

### Benchmark E: Research fallback

Collect pages where the current Wiggly extractor fails. Test browser-use only on that corpus. Do not add a Python browser agent based on a demo that solves a different problem.

### Benchmark F: Account linking

Defer until a real user must claim an anonymous project. Then spike Better Auth's Anonymous plugin and explicitly test ownership transfer, idempotency, duplicate-account behavior, and rollback.

## 9. Honest Leverage Estimate

The original Wiggly estimate remains the defensible planning model:

- Roughly 25% existing Wiggly infrastructure
- Roughly 35–45% borrowed libraries, models, and mined primitives
- Roughly 30–40% new Wiggly-owned contracts, normalization, resolver behavior, publication semantics, and product UX

Avnac may reduce the editor-mechanics portion. Polotno may reduce it further only by taking ownership of the static design runtime. Neither makes the Wiggly-specific system 5–8%.

The target should remain “less than half newly built by us,” measured by engineering effort and long-term maintenance ownership—not raw repository line count.

## 10. Primary Sources Reviewed

- [Wiggly open-source ledger](../../static-format-package-open-source-ledger.md)
- [Wiggly architecture contract](../../static-format-package-architecture-contract.md)
- [Wiggly acceptance plan](../../static-format-package-acceptance-plan.md)
- [Official Convex SaaS starter](https://github.com/get-convex/convex-saas)
- [Official Convex Ents SaaS starter](https://github.com/get-convex/ents-saas-starter)
- [Convex + Better Auth supported plugins](https://labs.convex.dev/better-auth/supported-plugins)
- [Polotno overview](https://polotno.com/docs/overview)
- [Polotno canonical design format](https://polotno.com/docs/schema)
- [Avnac](https://github.com/xt42io/avnac)
- [LayerD](https://github.com/CyberAgentAILab/LayerD)
- [browser-use ad-use example](https://github.com/browser-use/browser-use/tree/main/examples/apps/ad-use)
- [NVIDIA NIM structured generation](https://docs.nvidia.com/nim/large-language-models/1.13.0/structured-generation.html)
- [Instructor](https://github.com/567-labs/instructor)
- [BackgroundR](https://github.com/google-marketing-solutions/backgroundr)
- [AI E-Commerce Media Studio](https://github.com/ronchen0927/AI-E-Commerce-Media-Studio)
- [Step1X-Edit](https://github.com/stepfun-ai/Step1X-Edit)
- [IOPaint](https://github.com/Sanster/IOPaint)
- [Inpaint Anything](https://github.com/geekyutao/Inpaint-Anything)
