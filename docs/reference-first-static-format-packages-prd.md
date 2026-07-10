# Wiggly Reference-First Static Format Packages MVP PRD

- Status: Draft for founder approval
- Date: 2026-07-10
- Scope: Static image ads only
- Implementation status: Not started
- Audit baseline: `origin/main` at `021715a9`

Approval of this PRD authorizes technical research and implementation planning. It does not authorize product-code changes.

Companion documents:

- [Architecture contract](./static-format-package-architecture-contract.md)
- [Acceptance plan](./static-format-package-acceptance-plan.md)
- [Open-source research ledger](./static-format-package-open-source-ledger.md)

## 1. Product in One Sentence

Wiggly turns a static ad someone wishes their brand had made into a reusable Format, then uses that Format, the brand's website, and a selected product to produce eight strategically different, editable ads that preserve the reference's recognizable creative formula.

The promise is:

> Give Wiggly an ad you wish your brand had made. Wiggly understands the formula, understands the brand, and produces eight ads the creative team could actually run.

## 2. Why This Product Exists

Wiggly's current formats were implemented separately, with format-specific scene shapes, prompts, components, generation branches, and workflow state. That helped prove individual ideas, but it makes every new format expensive to add and hard to maintain.

Static ads should not require a new React workflow every time. Most are arrangements of a few basic visual primitives—text, images, shapes, and groups—combined with a semantic formula explaining what each element means and how it should adapt.

The opportunity is to separate the reusable creative idea from application code:

1. Reconstruct the reference as an editable visual template.
2. Explain its premise and the meaning of each variable component.
3. Define how those components reroll coherently.
4. Ground new content in the Player's brand, product, and evidence.
5. Produce deliberate campaign directions rather than shallow wording variations.

The MVP is not a universal workflow engine. It introduces one declarative system for reference-first static image ads. Existing video, audio, 3D, and asset workflows remain separate.

## 3. Users

### 3.1 First Maker: Wiggly's assistant

The first Maker is Wiggly's internal assistant. She is nontechnical, fresh out of college, and already saves visually interesting ads from her Instagram feed.

Her workflow should feel like collecting and remixing good ads:

> Find a cool ad → save it → upload it → watch Wiggly understand it → make small corrections → test it on a brand → publish it → repeat.

She adds references one at a time and should be able to publish launch Formats without engineering help.

### 3.2 Player: a brand creative team

The target paying customer is a creative team at a Shopify or similar ecommerce brand doing roughly $50,000 or more in monthly revenue and facing continuous Meta creative demand. The buyer may be a founder, growth lead, or marketing lead. The daily Player may be a junior creative strategist, performance marketer, content marketer, or designer.

They are regular creative operators, not prompt engineers or necessarily expert designers. Wiggly must make strong decisions by default while preserving normal editing control.

### 3.3 Future Makers

Long term, anyone should be able to create Formats for themselves, their team, or a public marketplace. Public reuse should retain creator and source lineage. Public Maker onboarding, marketplace discovery, payments, ratings, and team administration are deferred, but the data model must not prevent them.

## 4. The Product Experience

### 4.1 Maker experience

The Maker opens the Maker context in `/builder` and uploads one static reference image. Written notes are optional; image-only input must work.

Wiggly analyzes the image and returns a complete draft before asking the Maker to configure a wizard. The draft includes:

- Editable native layers wherever reconstruction confidence is sufficient
- Locked raster layers for complex decorative regions
- Layer names and semantic roles
- Fixed and variable properties
- Semantic slots and coherent reroll groups
- A plain-language explanation of the ad's formula
- One editable Format skill
- Supported business types
- Required inputs and conditional questions
- Campaign, visual, asset, fitting, and validation policies
- Reconstruction confidence and automatic quality checks

Analysis may take three to five minutes. Quality matters more than throughput for the MVP.

The Maker can correct every decision through a visual canvas: select, drag, resize, rotate, reorder, group, lock, hide, duplicate, delete, edit text and images, change typography and colors, rename roles and slots, define what rerolls, set input requirements, and preview the Format on a test brand.

The default skill editor accepts natural-language direction such as “make every reroll use a genuinely different purchase motivation.” Wiggly proposes a reviewable change. Technical Makers may also edit and copy/paste the underlying skill directly.

Publishing creates an immutable Format Version. Later changes create a new private draft rather than altering existing ads.

### 4.2 Player experience

The homepage and `/create` lead with recognizable copied-reference Format cards created from the assistant's saved ads. The primary action is:

> Make this for my brand.

Website-first Format recommendation is deferred. The Player chooses the visual formula first, then supplies the website.

The Player:

1. Selects a Format.
2. Submits a public website.
3. Reviews a compact brand summary.
4. Sees the selected product and extracted alternatives when the Format is product-specific.
5. Changes the product if needed.
6. Answers only essential questions the website could not answer reliably.
7. Clicks `Create my ads`.

The product selection is never silent. The full extracted creative brief and supporting evidence remain available behind an optional details action, while the default stays compact.

Wiggly returns exactly eight campaign plays. The Player can immediately cycle them, understand how each should be used, open any one in `/builder`, download the current ad or all eight, and share a frozen project.

### 4.3 The wow moment

The Player should feel:

> Wiggly understood my store and product, used a visual formula I already liked, and gave me next week's creative testing ideas as eight editable ads.

The copied reference is the hook. Human-level adaptation and campaign usefulness are the value.

The product fails if the result feels like a logo swap, generic fill-in-the-blank copy, or eight near-duplicate headlines.

## 5. What a Format Contains

A Format is a reusable static-ad recipe, not executable code. At a product level it contains:

- **Layer Template:** one editable visual composition built from text, image, shape, and group primitives.
- **Semantic Formula:** the premise of the ad and the meaning of its components.
- **Semantic Slots:** variable content such as brand name, highlighted benefit, supporting item, emoji, product image, proof point, or CTA.
- **Reroll Groups:** slots that must change together so the ad remains coherent.
- **Format Skill:** one copy/pasteable instruction document explaining how to adapt the formula intelligently.
- **Campaign Strategy Policy:** Maker-approved bounds for audiences, funnel stages, objectives, triggers, motivations, exclusions, and unsupported uses.
- **Visual Policy:** Maker-approved colors, typography treatments, backgrounds, borders, shadows, and fixed properties.
- **Asset Policy:** allowed sources and priority for product images, logos, uploads, fixed decoration, and manually requested AI images.
- **Validation Policy:** fitting, contrast, safe-area, required-slot, and placeholder rules.
- **Business Compatibility:** any Maker-approved subset of ecommerce, information businesses, service businesses, and SaaS.
- **Required Questions:** short text, single choice, product selection, or asset upload, asked only when the brand brief lacks reliable information.

Each MVP Format Version contains exactly one Layer Template. Alternate layouts are separate Format cards, not visual rerolls.

The application registers the generic static engine once. Publishing another Format adds data, not another renderer or another branch in `/create`.

The Maker decides which business types the Format supports. An incompatible Player business hard-stops and receives compatible Format suggestions. Low-confidence detection asks the Player to confirm the type; the MVP has no mismatch override.

## 6. Eight Campaign Plays

The eight outputs are not random copy variations. Each must represent a deliberate creative direction grounded in the selected brand and product.

Each play includes:

- Canvas content for the declared slots
- Primary text, headline, optional description, and CTA
- Creative direction
- Funnel or audience stage
- Audience hypothesis
- Campaign objective
- Main psychological trigger
- Purchase motivation or objection
- Recommended success metric
- Supporting evidence and confidence
- Reading-level result
- A visual intent appropriate to the occasion, trigger, and campaign purpose

Player-facing guidance appears under the plain-language heading `How to run this ad`:

- Best for
- Show it to
- Why it works
- Campaign goal
- Main trigger
- Use this text
- Watch this number

Professional labels such as top of funnel, retargeting, or retention may appear secondarily. Copy targets approximately a fifth-grade reading level and is checked for jargon, unsupported claims, repetition, and fit.

Wiggly does not impose a fixed funnel quota. The Maker defines the allowed strategy envelope; GLM chooses the strongest evidence-grounded mix of eight.

For the Codex-to-David's-Cookies demo, valid directions could include holiday gifting, matching a shopper to a top seller, common gifting occasions, corporate gifts, proof-led best sellers, or last-minute-gift retargeting. Those are examples, not a hard-coded cookie recipe. A Format approved for another business type must adapt just as intelligently.

Every completed batch must contain eight coherent, visually sound, strategically distinct ads. A broken or filler seventh or eighth ad is not acceptable simply because one hero result is impressive.

## 7. Rerolls and Editing

### 7.1 Content reroll

- Spacebar selects the next precomputed ad.
- The sequence loops after the eighth ad.
- Spacebar never invokes a model, network generation, or paid provider.
- `Generate new batch` is a separate explicit action.
- The old batch remains usable until a new batch succeeds.
- A failed batch never destroys the prior one.
- Thumbnails, favorites, and visible batch history are deferred.

### 7.2 Visual reroll

- Visual reroll affects only the currently viewed ad.
- It changes only Maker-approved style properties.
- It may change colors, typography treatment, background treatment, borders, shadows, and similar presentation choices.
- It does not change copy, semantic meaning, geometry, or layer structure.
- It is instant, deterministic, and model-free.
- The treatment must fit the campaign play; arbitrary variety is not enough.
- Initial treatments should also be visually distinct when the Maker's policy permits.

### 7.3 Player overrides

Player changes in `/builder` become instance overrides. Position, size, font, color, imagery, text, visibility, and structural edits persist across content cycling, visual rerolls, download, share, and compatible new batches until reset.

Content edits preserve Reroll Group coherence. Editing one member locks the current content of the whole group until the Player resets it. Visual rerolls change only properties the Player has not overridden.

Generation never changes layer structure. Players may explicitly hide, delete, duplicate, or rearrange layers inside their own ad instance without changing the published Format or the other seven ads.

## 8. Manual AI Image Slots

Some Formats may require an AI-generated image.

- Wiggly resolves every non-AI part first.
- The unresolved slot shows a clear visual state.
- Generation starts only after an explicit Player click.
- Images generate one at a time.
- No prefetching, batching, speculative generation, automatic retry, or model fallback is allowed.
- The rest of the project remains usable while the image loads.
- Required images must be ready before affected ads can be downloaded or shared.

Nano Banana 2 Lite is locked for implementation test images. The production image provider is selected only after technical benchmarking.

## 9. Product-Surface Boundaries

- **`/create` generates and previews.** It owns Format selection, website intake, brand summary, product selection, essential questions, batch generation, content cycling, visual reroll, guidance, download/share, and opening in builder.
- **`/builder` edits.** It owns Maker draft authoring and Player precision editing: movement, resizing, typography, color, imagery, layers, locks, and overrides.
- **`/share` views and spreads.** It displays a frozen shared project and offers `Edit this ad`, which creates an independent anonymous fork.

`/create` must not become a mini-builder. Preview, builder pixels, download, and share must all render through the same passive `AdRenderSurface`.

## 10. Goals and Success Criteria

### 10.1 Maker success

- The assistant can turn one suitable reference into a published Format without code or manual database edits.
- Wiggly presents a complete draft before configuration.
- Suitable high-confidence references reach at least 85% editability coverage, with 95% as the stretch target.
- Median assistant cleanup time after analysis is five minutes or less.
- Uncertainty and unsupported references are visible rather than hidden.

### 10.2 Player success

- The output remains recognizably derived from the selected reference.
- All eight ads are materially adapted to the selected brand and product.
- The eight use genuinely different campaign directions.
- Visible claims are grounded or labeled as hypotheses.
- No required text clips, overflows, or becomes unreadably small.
- Visual variation remains on-brand and readable.
- Players can understand how to run each ad without being senior media buyers.

### 10.3 Demand success

Engine quality and product demand are separate gates. After the first working slice, target creative-team operators must independently select, edit, download, or attempt to run outputs. Compliments alone do not prove demand. The founder records the behavioral pass threshold before public launch.

## 11. MVP Scope

| Capability | MVP | Deferred |
| --- | --- | --- |
| Media | Static image ads | Video Format Packages |
| Reference input | One static image at a time | Multi-reference synthesis, bulk import |
| Maker access | Server-gated internal assistant | Public Maker onboarding and team administration |
| Reconstruction | Hybrid native layers plus locked raster | Guaranteed full vector recreation |
| Format logic | One editable skill plus structured policies | Executable plugins or arbitrary tools |
| Business support | Maker-declared subset of four business types | Automatic universal compatibility |
| Player output | Exactly eight campaign plays | Variable batch size and visible history |
| Rerolls | Instant content cycling and current-ad visual reroll | Infinite automatic generation or AI layout redesign |
| Editing | Desktop `/builder` | Mobile or touch-first editing |
| Images | Website, upload, fixed, or manual AI slots | Automatic AI image batches |
| Export | Current PNG, eight-ad ZIP, campaign plan | PSD, SVG, or editable Canva export |
| Share | Anonymous view, fork, edit, and reshare | Accounts, comments, and approvals |
| Research | Website-derived brand brief | Reddit, competitors, reviews, and external market research |
| Campaign action | Guidance and downloadable plan | Meta connection, campaign creation, or publishing |
| Marketplace | Creator and version lineage only | Discovery, ratings, payments, and marketplace UI |

## 12. Non-Goals and Locked Decisions

The MVP does not include:

- Migration of 3D Breakdown, jingle, visualizer, Motion Story, brainrot, video meme, or Product Photoshoot
- A universal engine for all media
- Player accounts, billing, or subscriptions
- Legal clearance or copied-ad review workflows
- Background music
- Saving a Player-edited ad back as a reusable Format
- Unconstrained generative UI

Locked implementation-facing decisions:

- GLM 5.2 through NVIDIA NIM for static-engine text and strategy
- No model fallbacks; fail visibly while preserving usable state
- Nano Banana 2 Lite for test images
- Explicit user clicks before every paid media-generation action
- No Replicate generation during QA unless explicitly required and announced first
- One renderer: preview, builder pixels, download, and share use `AdRenderSurface`
- Product work lives in v3; legacy routes are behavioral reference only
- Style B remains the independent current priority for 3D Breakdown
- User-facing changes are tested through `/create` with Playwright
- Fresh scoped branches, clean commits, and pushes after passing checks

## 13. Principal Risks

### Poor reconstruction

Mitigation: hybrid native/raster output, explicit confidence, a visible unsupported outcome, and complete Maker correction controls.

### Generic copy

Mitigation: one precise Format skill, grounded brand evidence, coherent reroll groups, strategy policies, eight deliberate directions, and mandatory Maker testing.

### Recreating bespoke-format complexity

Mitigation: one data-defined static engine, one Layer Template per Format Version, fixed generation-time structure, and no React or `/create` changes for each published Format.

### Building a second Canva

Mitigation: benchmark existing editor and layer-reconstruction projects before planning implementation. Preserve normal editing control, but reuse proven components where they satisfy the single-renderer contract.

### Clean architecture without demand

Mitigation: prove the Codex-to-David's-Cookies experience, then observe real creative operators using it without coaching before expanding the system.

## 14. Approval and Next Step

This PRD is approved when the founder agrees on:

- The assistant-first Maker wedge
- The creative-team Player and wow moment
- Static-only scope
- Reference-first discovery
- One data-defined Format system
- Exactly eight campaign plays
- Separate content and visual rerolls
- Maker and Player editing boundaries
- Manual one-at-a-time AI images
- Export and frozen-share behavior
- Provider and cost rules
- Success criteria and non-goals

The architecture contract preserves the detailed object, version, asset, resolver, override, and rendering decisions. The acceptance plan preserves the executable functional, quality, capability, and QA gates.

After approval:

1. Benchmark current open-source and hosted options.
2. Revise the target architecture based on evidence.
3. Produce a phased implementation plan with rollback points.
4. Obtain founder approval before product-code implementation.
