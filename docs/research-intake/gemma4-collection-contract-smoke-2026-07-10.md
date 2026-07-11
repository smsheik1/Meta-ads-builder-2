# Gemma 4 Collection-Aware Contract Smoke

- Status: Structural collection contract passed; reusable Format policy needs correction
- Date: 2026-07-10
- Model: Gemma 4 31B IT through NVIDIA NIM
- Requests: Exactly one; no retry, repair, fallback, SAM call, Replicate call, or image generation
- Product-code impact: None

## Verdict

The revised Semantic Collection structure works. Gemma represented all seven integrations as one collection while independently marking `Slack` as the active item. It assigned the other six items to fixed supporting slots with no duplicates or drops.

The output is not yet a publishable reusable Format. Gemma marked the collection contents, logo, and relationship symbol as fixed and described adaptation only as selecting another Codex integration. That would preserve the reference but fail the David's Cookies transformation without Maker correction.

**Decision:** keep the collection contract, but make Format adaptation and asset replacement separate explicit policy axes in the corpus prompt and rubric.

## Structural Result

| Check | Result |
| --- | --- |
| OCR strings bound once | 9 of 9 |
| Integration membership | 7 of 7 exact |
| Active item | `Slack` |
| Supporting items | 6 of 6 exact |
| Presentation slots | 1 active + 6 supporting |
| Duplicates or dropped items | 0 |
| Coherence rules | 2 of 2 exact |
| Maker questions | 0 |
| Uncertainties | 0 |
| End-to-end NIM time | 103.31 seconds |
| Total tokens | 2,677 |

Gemma's visual evidence for the active item was correct: Slack used high-contrast black text aligned horizontally with Codex and the handshake, while the other integrations were faded.

## Policy Cleanup Required

Gemma proposed:

- collection items: fixed;
- active selection: variable;
- brand logo: fixed;
- relationship symbol: fixed;
- adaptation: rotate which Codex integration is active.

For the agreed Wiggly demo, the collection contents must be replaceable with brand- and campaign-specific concepts, the logo must bind to the Player brand, and the relationship symbol must follow Maker-approved content policy. The Maker ultimately decides these policies, but a high-confidence draft should propose the obvious reusable behavior.

The corpus contract must distinguish four scopes:

1. Reference interpretation: what belongs to the collection and what is active in this image.
2. Format adaptation: which item content and assets change for another brand or campaign play.
3. Active selection: whether a different collection member may become active.
4. Visual reroll: style-only changes that never alter collection content or active selection.

Conflating these scopes behind one `fixed` or `variable` label creates a technically valid but useless reusable Format.

## Local Evidence

```text
/Users/shaz/.graphify/benchmarks/gemma4-collection-codex-2026-07-10/
```

Key files include the guarded request script, one-shot sentinel, raw response, validated semantic output, and deterministic `assessment.json`.

## Next Step

Do not rerun the same image. Apply the clarified policy axes to the corpus contract, then run the finalized prompt once per structurally different assistant-saved reference.
