# Packet 4: Leverage Claims, Estimates, Risks, and UX Concepts

- Review status: Unverified
- Decision status: No schedule or custom-code estimate approved

## GLM's central thesis

The proposed stack changes Wiggly from building a canvas editor, reconstruction engine, campaign planner, and SaaS backend into integrating existing projects around Wiggly's creative logic.

GLM identifies Wiggly's remaining differentiated work as:

- Understanding the semantic formula of a reference ad
- Writing and refining one Format skill per Format
- Producing eight strategically distinct Campaign Plays
- Connecting reference analysis, brand understanding, editing, and delivery

## Leverage claims to review later

- Canvas editing, reconstruction, authentication, billing, files, realtime sync, structured output, scraping, and image editing are already solved.
- Two people could assemble the MVP in approximately two weeks.
- The team would not need a senior canvas engineer, reconstruction specialist, or backend engineer.
- Product risk would shift almost entirely from engineering feasibility to creative-output quality.
- The final expanded stack would reduce Wiggly-specific code to approximately 5–8%.

These claims are preserved without endorsement.

## Estimate progression inside the source

The response gives two different levels of optimism:

1. Initial stack: approximately two weeks of custom integration.
2. Expanded image-editing stack: approximately 5–8% custom code.

The response does not provide a counting method for either percentage or include integration, QA, deployment, state translation, maintenance, or failure-handling work explicitly.

## Dependency risk and mitigation proposed by GLM

### Risk

Wiggly becomes dependent on external projects and their schemas, updates, and maintenance.

### Proposed mitigation

- Fork selected projects
- Pin dependency versions
- Own translation layers between systems
- Treat glue code as insurance against upstream changes

## Avnac concepts mentioned in the source

### Prompt-driven Magic panel

Borrow the UX pattern where a Maker types a natural-language edit and previews the proposed change. The source suggests applying this pattern to Format skill editing.

### TanStack Router

The source notes alignment with one Convex starter, while also acknowledging that the existing Wiggly v3 application is Next.js.

## Questions intentionally deferred until the other packets are reviewed

- What percentage calculation should Wiggly use: lines of code, functional surface, engineering time, or maintenance ownership?
- How much work is translation and parity glue versus differentiated product code?
- Which borrowed systems would Wiggly actually operate in production?
- Does adopting a starter save more time than integrating the few primitives Wiggly needs into the existing app?
- Which estimates survive the one-renderer, immutable-version, complete-scene, and browser-QA requirements?
