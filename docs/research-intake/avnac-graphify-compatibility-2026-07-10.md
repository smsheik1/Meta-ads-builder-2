# Avnac Graphify Compatibility Assessment

- Status: Initial structural assessment complete
- Date: 2026-07-10
- Source: [xt42io/avnac](https://github.com/xt42io/avnac)
- Source commit: `dc9cc8b6daf66dc13e8b61f922d736f986ee7d9b`
- Analysis mode: AST-only Graphify; no LLM extraction or labeling
- Product-code impact: None

Related Wiggly documents:

- [Architecture contract](../static-format-package-architecture-contract.md)
- [Open-source ledger](../static-format-package-open-source-ledger.md)
- [Wiggly Graphify map](../graphify.md)

## 1. Verdict

Avnac is useful, but it does **not** translate cleanly as a complete editor.

The clean opportunity is narrower and still valuable:

- Reuse or adapt pure geometry and snapping algorithms.
- Reuse interaction-overlay and editor-command patterns.
- Extract selected reorder, resize, crop, grouping, and keyboard behaviors behind Wiggly-owned types and semantic commands.
- Do not import Avnac's document model, Zustand document store, canvas renderer, export path, or full editor shell.

This means Avnac can reduce editor-mechanics work, but it cannot replace Wiggly's `StaticAdScene`, dedicated interaction store, or `AdRenderSurface` without recreating the architecture problem the static engine is intended to solve.

## 2. Graph Artifacts

Local isolated clone:

```text
/Users/shaz/.graphify/repos/xt42io/avnac
```

Generated artifacts:

```text
/Users/shaz/.graphify/repos/xt42io/avnac/graphify-out/graph.json
/Users/shaz/.graphify/repos/xt42io/avnac/graphify-out/GRAPH_TREE.html
```

Graph summary:

- 158 extracted source files
- 1,387 graph nodes
- 3,172 raw edges
- 2,659 unique directed endpoint pairs after Graphify's post-build representation
- 489 dangling endpoints, primarily external or unresolved symbols
- 24 same-endpoint groups collapsed by the directed graph representation
- Graph JSON size: approximately 1.3 MB

Wiggly and Avnac are also registered in the local global graph:

```text
/Users/shaz/.graphify/global-graph.json
```

The global graph is useful for consistent lookup and future multi-repository research. It does not invent cross-repository compatibility edges; those mappings remain an explicit architecture decision.

## 3. Graphify Findings

### Clean, low-blast-radius candidates

| Avnac area | Evidence | Compatibility | Wiggly action |
| --- | --- | --- | --- |
| Snapping math | `computeSceneSnap()` has degree 2 and is imported only by the editor shell; `snapping.ts` is 94 lines and depends on simple bounds/guide types | High | Port or adapt behind Wiggly geometry types; add stronger snap/hysteresis tests |
| Geometry helpers | `geometry.ts` is 181 lines of rotation, handle, aspect-ratio, marquee, intersection, and cursor math | High after type decoupling | Adapt pure functions; replace Avnac `ResizeHandleId` and `MarqueeRect` imports with Wiggly types |
| Visible selection chrome | `selection-overlays.tsx` paints DOM sibling overlays and visible handles rather than hidden click zones | Medium-high | Recreate against Wiggly layers and interaction events; preserve visible hit targets |
| Layer reorder algorithm | `reorderTopLevelObjects()` is a small pure ordering algorithm inside `objects.ts` | High after extraction | Adapt to stable Wiggly layer IDs and semantic `layerReordered` commands |
| Group bounds and rotation math | `getSelectionBounds()`, rotated bounds, group and ungroup helpers live in `avnac-scene.ts` | Medium | Extract formulas and tests, not the 1,392-line scene module |

### Useful but coupled candidates

| Avnac area | Coupling discovered | Decision |
| --- | --- | --- |
| Resize and crop | `objects.ts` is 302 lines and imports Avnac scene types plus `layoutSceneText()` from Avnac's renderer | Adapt algorithms only; Wiggly text fitting and crop contracts remain authoritative |
| Object DOM view | `object-view.tsx` is DOM-native for most objects, but imports Avnac scene types and render helpers; vector boards paint a nested canvas | Use as implementation reference; do not import as Wiggly's renderer |
| Layer controls | `use-editor-layer-controls.ts` is straightforward but directly mutates Avnac documents with setters | Re-express as typed Maker commands over complete draft scenes |
| Keyboard shortcuts | Behavior is reusable, but selection and mutation target Avnac state | Port only after Wiggly commands and interaction-store events exist |
| AI design controller | Exposes useful `describe`, `add`, `update`, `delete`, and selection tool concepts | Borrow the bounded tool-interface pattern; reject direct document mutation and unrestricted destructive tools for Wiggly Format proposals |
| Magic panel | Real editor uses Tambo tool calling; a second route contains only a mock Magic panel | Use UX concepts only; Wiggly already defines propose/diff/apply through GLM 5.2 and does not need Tambo |

### Do not transplant

| Avnac subsystem | Graph/code evidence | Why it conflicts |
| --- | --- | --- |
| `avnac-scene.ts` | 1,392 lines and at least 30 direct affected files in the depth-2 Graphify traversal | Becomes a competing scene contract and brings migration/storage behaviors Wiggly does not need |
| `avnac-scene-render.ts` | 789-line Canvas 2D renderer used by previews, exports, text layout, object transforms, files, and tests | Creates a second pixel renderer and preview/export parity risk |
| `editor-store.tsx` | Small 53-line Zustand store, but it owns the complete `AvnacDocument` plus selection and hover state | Duplicates scene data inside interaction state; Wiggly's store may own interaction only |
| `scene-editor.tsx` | 2,911 lines; imports the store, scene model, renderer, snapping, export, PDF, assets, and UI behavior | Monolithic integration surface rather than a reusable editor engine |
| Avnac export pipeline | Shortest path from `SceneEditor` to `renderAvnacDocumentToCanvas()` is only two hops through the editor module | Would bypass `AdRenderSurface` and create different preview/export pixels |
| Local document lifecycle | IndexedDB documents, Avnac JSON import/export, and legacy migration are core Avnac concerns | Wiggly already owns Convex drafts, immutable versions, projects, and frozen shares |

## 4. Compatibility With Wiggly Contracts

| Wiggly invariant | Avnac behavior | Result |
| --- | --- | --- |
| `AdRenderSurface` is the only pixel renderer | Avnac uses DOM object views plus its own Canvas 2D render/export system | Reject renderer and export; interaction overlays remain usable |
| Complete scene payloads are authoritative | Avnac's store directly owns and mutates `AvnacDocument` | Adapt all mutations to Wiggly commands that produce complete draft scenes |
| Interaction store does not duplicate scene data | Avnac store contains `doc`, `selectedIds`, and `hoveredId` | Keep only selection, hover, mode, drag transaction, and guides in Wiggly's store |
| Four static primitives: Text, Image, Shape, Group | Avnac has rect, ellipse, polygon, star, line, arrow, text, image, icon, vector board, and group | Map simple shapes into Wiggly Shape; reject or rasterize unsupported decorative types |
| Maker and Player commands are different | Avnac has one general editor mutation surface | Wiggly must retain separate typed permissions and commands |
| Natural-language edits use propose/diff/apply | Avnac AI tools directly add, update, delete, select, set background, and clear the canvas | Borrow tool schemas only; route through Wiggly proposal validation and explicit Apply |
| Preview, builder, share, and export are identical | Avnac has its own document preview and canvas export paths | Do not reuse those paths |

## 5. First Spike Recommendation

The first implementation experiment should be deliberately smaller than an editor:

1. Define a temporary adapter over Wiggly's proposed `StaticAdScene` layer geometry.
2. Adapt Avnac's pure snapping and geometry helpers into an isolated experiment directory.
3. Recreate one visible selection overlay around a layer painted by `AdRenderSurface`.
4. Support select, drag, resize, rotate, snap, and one layer reorder command.
5. Keep scene data outside the interaction store.
6. Commit changes only at pointer-up as one semantic scene transaction; transient drag data stays in the interaction store.
7. Verify the same resulting scene through builder preview and image export.
8. Compare retained code, implementation time, interaction quality, and test burden with a Moveable + Selecto version of the same experiment.

The spike passes only if Avnac-derived mechanics reduce code or implementation time without importing the Avnac scene model or renderer.

## 6. Missing Evidence

Graphify proves structural coupling, not runtime quality. Before promotion:

- Add tests for `computeSceneSnap()` itself; the current snapping test covers only threshold calculation.
- Test nested groups, rotated bounds, cropped images, long text, touch interaction, and pointer cancellation.
- Measure bundle impact after extracting only selected code.
- Verify React 19 and Next.js behavior inside Wiggly's actual `/builder` shell.
- Confirm preview/export parity through `AdRenderSurface`; Avnac's canvas tests do not prove Wiggly parity.

## 7. Upstream Verification

A clean dependency install does not currently reproduce at the pinned Avnac commit:

```text
npm ci
```

failed because `frontend/package.json` and `frontend/package-lock.json` are out of sync. The lock file is missing `@emnapi/core`, `@emnapi/runtime`, and `@emnapi/wasi-threads`; npm also reported a Tambo-related `quansync` peer mismatch.

This does not invalidate the candidate algorithms, but it is evidence against treating Avnac as a drop-in editor dependency.

After installing without writing the lock file:

```text
npm install --package-lock=false --ignore-scripts --no-audit --no-fund
```

the focused upstream tests passed:

- 4 test files passed
- 15 tests passed
- Covered snapping threshold, scene parsing/helpers, scene rendering, and object operations

The snapping suite contains only one threshold test and does not directly exercise `computeSceneSnap()` or its hysteresis behavior.

## 8. Reproduction Commands

```bash
graphify clone https://github.com/xt42io/avnac

cd /Users/shaz/.graphify/repos/xt42io/avnac
graphify update . --no-cluster
graphify tree \
  --graph graphify-out/graph.json \
  --output graphify-out/GRAPH_TREE.html \
  --root . \
  --label Avnac

graphify diagnose multigraph \
  --graph graphify-out/graph.json \
  --json

graphify global add graphify-out/graph.json --as avnac
```

No `graphify extract`, `graphify label`, or LLM-backed clustering was used.
