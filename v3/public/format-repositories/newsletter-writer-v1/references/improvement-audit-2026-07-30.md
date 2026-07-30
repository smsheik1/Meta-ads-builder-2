# Newsletter Writer improvement audit

This audit asks one question: which changes make the existing Wiggly Newsletter
Writer produce better, safer copy without turning an MVP into a research
platform?

## Frozen baseline

- Base commit: `0c08645e`
- Existing flow: `Learn voice -> Brief -> Write -> Review`
- Existing proof: `goldens/holden-brand-newsletter.*`
- Exact baseline hashes: `baseline-2026-07-30.json`
- Provenance limitation: the Holden output survived, but its original
  `sources.json`, profile, brief, and generated prompts did not. The comparison
  keeps that output unchanged and labels later source reconstruction honestly.

## Three research passes

### Pass 1: Repository anatomy

The repositories were cloned and inspected at fixed commits, including their
instructions, executable code, tests, licenses, examples, and recent history.

| Project | Commit inspected | What is real | Limitation |
| --- | --- | --- | --- |
| [voice-profile-builder](https://github.com/paultaki/voice-profile-builder) | `181670f` | Evidence quotes, register-specific guidance, contamination warnings, private corpus handling | Six commits and no runtime or output-quality tests; the 20,000-word floor and speech exemption are operating opinions, not validated thresholds |
| [avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) | `3a34c68` | Mature pattern taxonomy, carve-outs, detect-only mode, bounded revision, deterministic tests | Its detector reports polished punctuation as an AI signal; signals are not proof and the complete 736-line catalog is too broad for one newsletter format |
| [humanizer](https://github.com/blader/humanizer) | `523374d` | Meaning-first edits, source voice outranks global bans, no-fabrication rule | Mostly instruction prose; heavy overlap with avoid-ai-writing and no output-correctness test suite |
| [faststylometry](https://github.com/fastdatascience/faststylometry) | `89e2b48` | Reproducible authorship-exploration tooling | Python 3.12/3.13 plus NumPy, pandas, scikit-learn, and corpus calibration; its maintainer says short emails are usually inconclusive |

All four repositories are MIT licensed. Wiggly will attribute ideas and will not
vendor their implementations in this change.

### Pass 2: Claims versus primary evidence

- [Catch Me If You Can? Not Yet](https://arxiv.org/abs/2509.14543) finds that
  five examples generally beat zero examples, but more examples have small and
  inconsistent effects. It does **not** establish that written style rules
  always beat samples.
- [TinyStyler](https://arxiv.org/abs/2406.15586) is a purpose-built model with
  authorship embeddings. Its infrastructure and trade-offs are outside this
  MVP, and its human evaluation does not prove newsletter authorship matching.
- [Mind the Style Gap](https://arxiv.org/abs/2502.15022) shows that common
  content-preservation metrics can mislead. It supports explicit fact checks
  and human review, not one universal style score.
- The Toshevska paper cited in the session notes studies formality transfer. It
  does not support the claimed rule that additional writing samples reduce
  style strength and fluency.
- Delta research supports corpus comparison for authorship analysis, but no
  inspected source validates a universal newsletter pass threshold. The
  claimed `-1.68` gate is not portable to this use case.

### Pass 3: Wiggly baseline stress test

- Current source validation scans website claims for prompt injection but not
  uploaded newsletter samples.
- Profile evidence quotes must exist in source text, but `signaturePhrases` may
  currently be invented.
- Current generic-copy validation contains eight literal expressions. It catches
  obvious phrases but not repeated sentence shapes, fake contrast, summary
  conclusions, or unsupported voice claims.
- Running avoid-ai-writing against the frozen Holden proof produced a false
  positive for curly quotes, one em dash, an Oxford comma, and zero typos. This
  confirms that its score must not become a Wiggly quality gate.
- `agent-runs/` is ignored and the ZIP builder copies an allowlisted file set,
  so private run corpora are already excluded from the package. This needs a
  regression test and clearer user guidance, not a new privacy subsystem.

## Decision table

| Proposal | Decision | User benefit | Complexity cost |
| --- | --- | --- | --- |
| Keep website-only low-confidence mode | Adopt now | A user with no old newsletters still gets useful copy | None; preserve current behavior |
| Treat newsletter samples as evidence, never instructions | Adopt now | Uploaded text cannot steer the host agent | One validator rule and tests |
| Verify signature phrases against source text | Adopt now | The profile cannot manufacture a fake brand quirk | One validator rule and tests |
| Separate email-voice evidence from website brand language | Adopt now | Website copy is no longer presented as proven newsletter voice | Prompt wording and confidence report |
| Report source coverage and voice confidence with the final | Simplify | The user sees what the system actually knew | Use existing confidence, facts, and voice-evidence fields; no new report schema |
| Bounded structural anti-generic checks with carve-outs | Simplify | Finds formulaic copy without policing every normal word | A short newsletter-specific diagnostic, not a detector dependency |
| Register guidance | Simplify | The same brand can write an announcement differently from a sales email | One operational profile field, not nine files |
| Descriptive rhythm diagnostics | Defer | Could compare output to known samples | The blind qualitative holdout is clearer for this MVP |
| Hold one sample out for evaluation | Test first | Measures whether the recipe travels beyond its training examples | One fixture and report; never a production blocker |
| Full avoid-ai-writing or humanizer import | Reject | Little benefit beyond the narrowed rules | Hundreds of rules, false positives, overlapping systems |
| 20,000-word minimum | Reject | Would block the actual Holden use case | Unsupported threshold and poor MVP UX |
| Pre-2023-only corpus rule | Reject | None proven for normal brand workflows | Hard-to-source data and false certainty |
| Treat recent speech as automatically uncontaminated | Reject | None | Speech and newsletter registers differ; transcripts can be normalized |
| Nine-file voice-profile bundle | Defer | Could support a future professional voice product | Too much artifact ceremony for recurring newsletters |
| Burrows Delta pass/fail gate | Reject | False precision on short newsletters | Python stack, corpus calibration, and unsupported threshold |
| TinyStyler or another local style model | Defer | May improve specialized style transfer later | Model hosting, evaluation, and a second generation path |
| AI-detector evasion | Reject | Does not help a marketing-email reader | Wrong product objective |
| Universal provider, proof, or validator schemas | Reject | No acceptance test in this format needs them | Cross-format architecture churn |

## Smallest implementation that survives the audit

1. Keep the four current stages and current JSON shapes where possible.
2. Validate prompt injection in newsletter samples and verify profile signature
   phrases against their cited source text.
3. Reuse the existing confidence, facts, and voice-evidence fields instead of
   adding another report schema.
4. Add one holdout fixture and one failure example. Diagnostics inform review;
   they do not silently rewrite or block on a magic score.
5. Improve the three exact prompts so they distinguish website brand language
   from demonstrated newsletter voice and require the review to explain only
   material changes.
6. Preserve run privacy with an allowlist ZIP test and explicit local-corpus
   guidance.

No dependency, model route, new renderer, database, universal schema, or
parallel format is justified.
