# Research decisions

Wiggly adapts ideas, not whole codebases.

## Adopted

- Evidence quotes, register awareness, source provenance, and local corpus
  privacy from
  [paultaki/voice-profile-builder](https://github.com/paultaki/voice-profile-builder)
  (MIT; commit inspected: `181670f`).
- Bounded pattern review, context carve-outs, and the rule that signals are not
  proof from
  [conorbronsdon/avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing)
  (MIT; commit inspected: `3a34c68`).
- Meaning-first editing, source voice outranking global bans, and no fabrication
  from [blader/humanizer](https://github.com/blader/humanizer)
  (MIT; commit inspected: `523374d`).
- Human review plus explicit fact preservation instead of one magic style score,
  consistent with
  [Mind the Style Gap](https://arxiv.org/abs/2502.15022).

## Rejected for this MVP

- AI-detector evasion as a product goal.
- Giant banned-word catalogs as the main quality system.
- Random typos, slang, fragments, or disfluency injection.
- Five mandatory feedback rounds before the first useful output.
- A vector database or semantic RAG service.
- Scraper-specific dependencies.
- Best-of-N generation and commercial detector scoring.
- Automatic learning from every user edit.
- A 20,000-word hard minimum or pre-2023-only corpus.
- A nine-file voice-profile bundle.
- Burrows Delta as a newsletter pass/fail gate.
- `faststylometry`, TinyStyler, or another model/dependency path.
- Any universal provider or validator schema change.

## Wiggly's newsletter-specific decision

Three to five real newsletters determine high-confidence email behavior. Exact
website passages provide a low-confidence fallback; paraphrased website facts
never masquerade as voice evidence. Website facts determine current claims.

The writer produces one draft, and a separate review prompt performs one
meaning-first fact-and-voice revision. The local runner validates source
provenance, exact fact snapshots, signature phrases, prompt injection,
structure, and saved progress without calling a provider.

The full three-pass audit, including corrections to overstated research claims,
is in `improvement-audit-2026-07-30.md`.
