# Moveable and Selecto Graphify Compatibility Assessment

- Status: Initial structural and package verification complete
- Date: 2026-07-10
- Sources: [daybrush/moveable](https://github.com/daybrush/moveable) and [daybrush/selecto](https://github.com/daybrush/selecto)
- Moveable commit: `75069102f30c88cd89ecaaa8ca7e5f7434e54807`
- Selecto commit: `7c75ef57790ffc197afdab0f49127ce38d3707b9`
- Analysis mode: AST-only Graphify; no LLM extraction or labeling
- Product-code impact: None

Related Wiggly documents:

- [Architecture contract](../static-format-package-architecture-contract.md)
- [Open-source ledger](../static-format-package-open-source-ledger.md)
- [Avnac Graphify assessment](./avnac-graphify-compatibility-2026-07-10.md)
- [Wiggly Graphify map](../graphify.md)

## 1. Verdict

Use Moveable plus Selecto as the **primary editor-mechanics spike**. Keep Avnac as a source of small algorithms, interaction patterns, and comparison tests.

Moveable and Selecto fit Wiggly more cleanly because they:

- Operate on existing DOM elements.
- Paint interaction chrome rather than the ad pixels.
- Emit drag, resize, rotate, snap, and selection events.
- Do not own the ad scene, database, version model, or export renderer.
- Can sit as visible sibling interaction layers around `AdRenderSurface` output.

The packages must still be wrapped carefully. Daybrush examples frequently mutate `event.target.style` directly. Wiggly must treat those values as transient interaction output and commit one semantic complete-scene mutation at the transaction boundary. DOM styles must never become the authoritative saved design.

## 2. Graph Artifacts

### Moveable

```text
/Users/shaz/.graphify/repos/daybrush/moveable/graphify-out/graph.json
/Users/shaz/.graphify/repos/daybrush/moveable/graphify-out/GRAPH_TREE.html
```

- 489 extracted source files
- 5,359 graph nodes
- 10,834 raw edges
- 7,939 unique directed endpoint pairs
- Graph JSON size: approximately 4.7 MB
- Tree HTML size: approximately 364 KB

### Selecto

```text
/Users/shaz/.graphify/repos/daybrush/selecto/graphify-out/graph.json
/Users/shaz/.graphify/repos/daybrush/selecto/graphify-out/GRAPH_TREE.html
```

- 180 extracted source files
- 1,969 graph nodes
- 2,822 raw edges
- 2,219 unique directed endpoint pairs
- Graph JSON size: approximately 1.4 MB
- Tree HTML size: approximately 148 KB

Both projects are registered beside Wiggly and Avnac in:

```text
/Users/shaz/.graphify/global-graph.json
```

## 3. Moveable Structural Findings

### Clean package boundary

The public React wrapper is small and delegates to an internal manager plus modular “ables.” The relevant capabilities are distinct source modules:

- `Draggable.tsx`
- `Resizable.ts`
- `Rotatable.tsx`
- `Snappable.tsx`
- Group target support through `MoveableGroup`
- Optional composition through `makeMoveable`

The public component targets existing `HTMLElement` or `SVGElement` nodes. It maintains interaction and measurement internals but does not define an application document schema.

### Event-driven integration seam

Graphify shows the main drag and resize methods calculate values and call `triggerEvent()`. The consumer decides what to do with returned translation, dimensions, rotation, transforms, and group child events.

This is the correct ownership direction for Wiggly:

```text
Moveable event
  -> Wiggly transient interaction geometry
  -> visible builder preview
  -> pointer-up semantic Maker command
  -> complete updated draft scene
```

### Complexity remains inside the dependency

Moveable is not small internally:

- `MoveableManager.tsx`: 1,444 lines
- `Draggable.tsx`: 603 lines
- `Resizable.ts`: 1,026 lines
- `Rotatable.tsx`: 1,065 lines
- `Snappable.tsx`: 1,259 lines
- Public type declarations source: 3,501 lines
- `Snappable.tsx` has degree 113 in the AST graph

That complexity is a reason to consume the package rather than port its implementation. It already handles transformed containers, matrices, groups, snapping, bounds, resize observers, gesture state, and control-box rendering.

### Moveable restrictions

- Do not fork or copy its manager and “able” internals into Wiggly.
- Do not enable every capability. Start with drag, resize, rotate, snap, bounds, and group targets.
- Do not use Moveable's persistence data as Wiggly scene persistence.
- Do not copy examples that append `cssText` or make target styles authoritative.
- Measure whether `makeMoveable()` and ESM tree shaking materially reduce the bundle.

## 4. Selecto Structural Findings

Selecto has an especially clean React seam:

- The React wrapper is 62 lines.
- It creates a selection rectangle and delegates to the framework-independent `selecto` package.
- The core `SelectoManager.tsx` is 1,568 lines, but application code does not need to own that complexity.
- Selection events return `selected`, `added`, and `removed` DOM elements.
- It supports click selection, marquee selection, additive selection, overlap thresholds, transformed element rectangles, scroll behavior, and input guards.

Wiggly should map DOM targets to stable layer IDs and immediately synchronize the authoritative selected-ID set in its interaction store.

Selecto's internal selected-element tracking is acceptable library-local interaction state. It must not become a second Wiggly selection source. When selection changes elsewhere, Wiggly must synchronize Selecto through its public selection methods.

## 5. Required Wiggly Adapter

The Daybrush packages are mechanics, not the editor architecture. Wiggly still owns this thin adapter:

### DOM identity

- Every editable static layer exposes a stable `data-static-layer-id` or equivalent editor hook.
- The hook is passive renderer metadata, not product mutation logic.
- Selecto returns DOM nodes; the adapter resolves them to stable layer IDs.

### Selection

- Selecto emits click or marquee results.
- The adapter dispatches a semantic selection event to the dedicated interaction store.
- Moveable receives the current selected DOM targets from that store.

### Transient transforms

- Moveable emits drag, resize, rotate, snap, and group events.
- During a pointer transaction, temporary geometry belongs only to interaction state or a complete derived preview scene.
- `AdRenderSurface` remains the only ad-pixel renderer.
- Moveable's visible handles, control box, and guidelines remain sibling interaction chrome.

### Commit

- Pointer-up converts final geometry into one typed Maker command.
- The command produces a complete updated Format Draft scene.
- Undo/redo records one transaction, not every pointer-move event.
- Player permissions can expose only the property changes the Format allows.

## 6. Three-Way Comparison

| Dimension | Moveable + Selecto | Avnac primitives | Decision |
| --- | --- | --- | --- |
| Owns a competing scene model | No | Avnac primitives are coupled to one, even if extracted | Daybrush wins |
| Owns a competing pixel renderer | No | Full Avnac uses DOM preview plus Canvas export | Daybrush wins |
| Existing transform handles | Complete | Must adapt or recreate overlays and pointer lifecycle | Daybrush wins |
| Selection and marquee | Complete Selecto package | Implemented inside Avnac editor shell | Daybrush wins |
| Snapping simplicity | Large, capable dependency | Small 94-line algorithm | Avnac wins for simplicity |
| Groups and transformed containers | Mature matrix/group machinery | Simpler application-specific behavior | Daybrush wins for capability |
| Package seam | Public event-driven packages | Code extraction from an application | Daybrush wins |
| Source simplicity | Large managers and many dependencies | Easier pure math to understand | Avnac wins |
| Maintenance activity | Latest package release December 2023 | Active application development in 2026 | Avnac wins recency |
| React 19 smoke | Passed | Native React 19 app | Tie |
| Best role | Primary mechanics dependency | Algorithm, UX, and test reference | Use both in these roles |

## 7. Verification Results

### Moveable

- Frozen Yarn 1 install passed with isolated cache.
- `react-moveable` type test passed.
- Full `react-moveable` lint, type, bundle, and declaration build passed.
- Build reported multiple internal circular dependencies and old Storybook peer warnings; these are dependency-maintenance concerns, not Wiggly code errors.
- Built ESM: approximately 582 KB / 105 KB gzip before application bundler tree shaking.
- Current published `react-moveable`: `0.56.0`, last modified December 3, 2023.

### Selecto

- Frozen Yarn install requires `--ignore-engines` on Node 26 because an old development dependency supports only Node 8 through 17.
- Core `selecto` must build before the workspace `react-selecto` declaration build.
- After that ordered build, core and React wrapper bundles and declarations passed.
- Core ESM: approximately 56 KB before application bundling.
- React wrapper ESM: approximately 4.3 KB before application bundling.
- Current published `react-selecto`: `1.26.3`, last modified December 3, 2023.

### React 19 compatibility smoke

An isolated JSDOM smoke mounted and unmounted both published packages with:

- React `19.2.0`
- `react-moveable@0.56.0`
- `react-selecto@1.26.3`

Both the Moveable control box and Selecto selection element appeared, and unmount completed successfully. This proves basic React 19 lifecycle compatibility, not full pointer correctness inside Next.js.

## 8. Spike Acceptance Criteria

Build one disposable `/builder`-only experiment after `StaticAdScene` geometry exists:

1. Render Text, Image, Shape, and Group through `AdRenderSurface`.
2. Select by click and marquee with Selecto.
3. Drag, resize, rotate, snap, and group-transform with Moveable.
4. Keep selection and transient transaction data in the interaction store only.
5. Commit one complete scene at pointer-up.
6. Undo and redo one transaction with Zundo.
7. Verify the final complete scene through builder preview and image export.
8. Measure client bundle impact and interaction latency.
9. Test zoomed canvas, rotated layers, nested groups, pointer cancellation, text editing, locked layers, and touch.
10. Compare only the snapping behavior against Avnac's simpler algorithm; use the better result.

The spike passes only if no saved design state depends on DOM styles, Moveable state, or Selecto state.

## 9. Reproduction Commands

```bash
graphify clone https://github.com/daybrush/moveable
graphify clone https://github.com/daybrush/selecto

cd /Users/shaz/.graphify/repos/daybrush/moveable
graphify update . --no-cluster
graphify tree \
  --graph graphify-out/graph.json \
  --output graphify-out/GRAPH_TREE.html \
  --root . \
  --label Moveable

cd /Users/shaz/.graphify/repos/daybrush/selecto
graphify update . --no-cluster
graphify tree \
  --graph graphify-out/graph.json \
  --output graphify-out/GRAPH_TREE.html \
  --root . \
  --label Selecto
```

No `graphify extract`, `graphify label`, or LLM-backed clustering was used.
