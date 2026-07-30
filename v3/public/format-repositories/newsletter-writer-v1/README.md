# Wiggly Newsletter Writer

This agent-ready format learns a company's newsletter voice from its website and past emails, then turns a new topic into three subject lines, preview text, body copy, and a CTA.

## Quick start

Use Node 22 or newer and run commands from `v3`.

First prove the complete local workflow with the bundled fake company:

```bash
npm test
```

That test runs all four stages with the Brightmark fixture and golden JSON responses. It makes no network or provider calls. The goldens are test oracles, not production copy.

For a real company, replace the example URL, name, and file paths with the user's own material:

```bash
npm run format:newsletter -- check
npm run format:newsletter -- estimate
npm run format:newsletter -- init \
  --run=first-newsletter \
  --brand-url=https://example.com \
  --company="Example Company" \
  --samples=/path/to/newsletter-1.md,/path/to/newsletter-2.md,/path/to/newsletter-3.md
```

Open `SKILL.md` for the complete agent workflow.

## What makes it different

- Past newsletters determine writing behavior.
- Website pages supply current facts and terminology.
- Every profile rule cites source evidence.
- Drafting and review are separate stages.
- The review preserves meaning before changing style.
- There is no detector-bypass target and no paid Wiggly provider call.

## Source acknowledgements

The workflow was informed by the MIT-licensed projects documented in `references/research.md`. Wiggly uses a smaller newsletter-specific contract rather than importing their repositories or dependencies.
