# Create V2 Legacy Audit

This audit decides what old `/create` and `/builder` behavior should survive before
the frozen legacy code is deleted.

## Current Route Ownership

- `apps/web` is the active product path.
- `apps/web/app/page.tsx`, `apps/web/app/create/page.tsx`, and
  `apps/web/app/create-v2/page.tsx` all serve `CreateFoundation`.
- The old Vite files remain reference-only under the legacy freeze.

## Size Reality

| Area | Current size | Status |
| --- | ---: | --- |
| `src/App.tsx` | 6,732 lines | Frozen legacy |
| `src/components/CreateFlow.tsx` | 1,576 lines | Frozen legacy |
| `src/components/CanvasEditor.tsx` | 1,365 lines | Frozen legacy |
| `apps/web/features/create/CreateFoundation.tsx` | 486 lines | Active v2 |
| `apps/web/features/create/SavedDesignsPanel.tsx` | 184 lines | Active v2 |

V2 is already much leaner. The goal is to port only the trust-critical product
behavior, not the old architecture.

## Already Rebuilt In V2

- Website URL to Firecrawl-backed research to generated `AdScene`.
- Explicit research failure instead of silent three-question fallback.
- One canonical visualizer canvas surface shared by create/share/render.
- Spacebar reroll plus visible spacebar button.
- Canvas element selection, drag movement, lock toggles, headline editing, logo
  replacement, visualizer color, and visualizer density.
- Generated and uploaded audio stored through Convex Storage.
- Audio script options are cached per scene and are not generated just by opening
  the audio panel.
- Saved designs backed by Convex, with hover preview and full saved library.
- Download/share controls using the v2 scene snapshot.
- Creative brief panel with research status and receipt visibility.

## Bring Over Before Deleting Legacy

These should be rebuilt cleanly in `apps/web`; do not import old components.

1. **Caption/transcript editor**
   - Why: users need to fix TTS/caption mistakes like `ChatGP`.
   - Scope: edit existing caption text and transcript text only. Keep timing
     unchanged for now.
   - Data: update `scene.audio.transcript` and `scene.audio.captions` through
     the v2 reducer so save/share/download all use the edited words.

2. **Lean platform selector**
   - Why: old `/create` let the user pick IG Feed, Reels, Stories, and YouTube.
     V2 has `scene.platform` in the data model, but no obvious UI control yet.
   - Scope: simple selector that updates `scene.platform` and clears stale export
     results. Do not bring back the old social-frame renderer.
   - Done: share and download use the selected v2 `scene.platform`.

3. **Ad writing model selector for testing**
   - Why: the user needs to know which provider/model wrote the ad copy while
     debugging headline quality.
   - Scope: keep "Auto" as the user-facing default, expose explicit model choices
     in the website form, pass the selected model into `/api/create-scene`, and
     show the last provider/model result.
   - Non-goal: do not add model selection inside the voice modal.

4. **Generation feedback**
   - Why: thumbs up/down is useful for product learning and later training data.
   - Scope: small component that records scene id, brand, headline, model/source,
     rating, and timestamp. Prefer Convex over a new localStorage pile.
   - Non-goal: no actual fine-tuning pipeline yet.

## Defer To Roadmap

- Full saved voice library. V2 should keep uploaded/generated audio stored with
  the scene first; reusable voice assets can come later.
- Multiple simultaneous generated ad cards. V2 should stay one scene plus reroll
  until the core loop is boringly stable.
- New ad formats such as memes, text messages, tweets, and conversation cards.
  Keep the current visualizer format polished first.
- Advanced `/builder` editing edge cases, old Moveable behavior, and old studio
  workflows.
- Full "brand dump" modal. The v2 creative brief should stay concise; deeper
  research inspection can be an internal debug panel later.

## Delete Forever

- Old homepage and "Open builder" product path.
- Old `/builder` as a destination once v2 has the bring-over items above.
- Old `/create` localStorage session cache and generated-feedback cache.
- Old three-question fallback UI. If Firecrawl cannot produce evidence, v2 should
  say so plainly.
- Old social `PlatformFrame` fallback renderer. Renderer drift was one of the
  root causes of the trust bugs.
- Any import from `src/` into `apps/web`.

## Deletion Gate

Delete the frozen legacy code only after these pass on fresh `main`:

1. Caption/transcript editor is merged.
2. Platform selector is merged.
3. Model selector is merged, or explicitly deferred by product decision.
4. Feedback thumbs are merged, or explicitly deferred by product decision.
5. `/`, `/create`, `/create-v2`, `/s/[slug]`, save, share, audio, and download
   pass v2 QA.
6. CI passes without the legacy Vite app.

## Recommended Next Branches

1. `feature/v2-caption-editor`
2. `feature/v2-platform-selector`
3. `feature/v2-model-selector`
4. `feature/v2-generation-feedback`
5. `cleanup/delete-legacy-create-builder`

Each branch should be narrow. Touch `apps/web` only until the final cleanup branch.
