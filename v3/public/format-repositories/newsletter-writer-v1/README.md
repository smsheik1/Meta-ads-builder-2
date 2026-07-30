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
- Exact website passages provide only a low-confidence brand-language fallback.
- Website fact snapshots supply current claims and terminology.
- Every profile rule cites source evidence.
- Imported newsletters receive provenance hashes and stay in a gitignored run folder.
- Drafting and review are separate stages.
- The review preserves meaning before changing style.
- There is no detector-bypass target and no paid Wiggly provider call.

## Source acknowledgements

The workflow was informed by the MIT-licensed projects documented in `references/research.md`. Wiggly uses a smaller newsletter-specific contract rather than importing their repositories or dependencies.

## Private source material

Real newsletter samples remain in `agent-runs/`, which is ignored by Git and
excluded from the built ZIP. The packaged Brightmark samples are synthetic test
fixtures. Never publish a user's source corpus as a golden or proof artifact.
