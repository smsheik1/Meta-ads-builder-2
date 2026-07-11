# Gemma 4 Vision-Challenger Smoke

- Status: Two credible NVIDIA NIM challengers tested; Gemma 4 remains the provisional semantic leader
- Date: 2026-07-10
- Challengers: NVIDIA Nemotron 3 Nano Omni 30B-A3B Reasoning and Mistral Large 3 675B
- Product-code impact: None

Related documents:

- [Gemma 4 smoke](./gemma4-codex-smoke-2026-07-10.md)
- [MiniMax M3 smoke](./minimax-m3-codex-smoke-2026-07-10.md)
- [Open-source ledger](../static-format-package-open-source-ledger.md)

## Verdict

Gemma 4 31B remains the provisional semantic leader for Wiggly's reference-to-Format task. Nemotron was a credible runner-up. Mistral Large 3 was dramatically faster but failed to mark `Slack` as the currently active item.

The comparison used an incomplete legacy rubric that forced each text item into either `core_claim` or `supporting_list`. Contract review later established the correct representation: all seven tool names share one integration collection, while `Slack` has the current `active` display role and the other six have `supporting` display roles. None of the models was asked to emit that complete structure, so this smoke cannot score collection recovery.

All three models received the same image, nine PaddleOCR strings, semantic-only instructions, required IDs, output shape, and Wiggly Reroll Group contract. Each challenger received exactly one request with no repair, retry, fallback, SAM call, or image generation. Inference sampling followed each challenger's published recommendation rather than forcing identical sampling settings.

| Measurement | Gemma 4 31B | Nemotron 3 Nano Omni | Mistral Large 3 |
| --- | ---: | ---: | ---: |
| Elapsed time | 69.13s | 86.00s | 9.80s |
| Total tokens | 1,848 | 4,566 | 2,408 |
| Current active item recognized | Pass | Pass | Fail |
| Complete collection membership | Not tested by legacy schema | Not tested by legacy schema | Not tested by legacy schema |
| Legacy `core_claim` conformance | Pass | Fail: omitted handshake | Fail: omitted Slack |
| Legacy `supporting_list` conformance | Pass | Pass | Fail: included active Slack |
| Exact `footer_brand` members | Pass | Pass | Pass |
| Unnecessary Maker questions | 1 | 3 | 3 |
| Reported uncertainties | 0 | 1 | 2 |

## Nemotron Result

Nemotron correctly understood that the ad asserts a Codex/Slack partnership and correctly separated the six faded integrations. Its asset record placed the handshake in `core_claim`, and its coherence rule mentioned the handshake, but the authoritative group member list omitted `relationship_symbol`. That internal contradiction would require normalization or Maker cleanup.

It also:

- asked whether the handshake can be replaced, although the Format policy already answers that;
- asked whether supporting items must be real integrations, which is a Maker policy rather than missing reference evidence;
- asked whether the footer logo must stay beside the CTA, despite having already inferred that rule;
- expressed uncertainty about whether the gray list might be “visual clutter,” even though its own formula correctly identified it as supporting evidence;
- took longer and used more than twice Gemma's tokens.

Nemotron remains a useful runner-up or later self-hosting comparison, but it did not beat Gemma on quality, consistency, latency, or cleanup burden.

## Mistral Large 3 Result

Mistral completed valid structured output in 9.8 seconds and correctly recognized `Slack` as one of the integrations, but it failed to mark Slack as the currently active partner. Consequently under the legacy response shape:

- `core_claim` contained only `Codex` and the relationship symbol;
- `supporting_list` placed all seven items together but lost Slack's active display state;
- the logo was described imprecisely as a “stylized C”;
- the proposed SAM concepts were less literal than Gemma's prompts;
- it asked three questions and reported two uncertainties that a competent brand brief or Format policy should resolve.

Mistral Large 3 remains a speed reference, not the primary Wiggly semantic candidate from current evidence. The 9.8-second number is one hosted end-to-end request, not a controlled steady-state throughput result.

## Decision

Do not test the remaining models from the NVIDIA screen on this reference. Llama 4 Maverick, Nemotron Nano 12B v2 VL, Ministral 14B, Phi-4 Multimodal, Llama 3.2 Vision, and PaliGemma have weaker published evidence, smaller or older architectures, a stronger successor already tested, impending endpoint deprecation, or a fine-tuning-oriented purpose.

The next useful work is not another model on the Codex ad. Run Gemma's revised Semantic Collection contract across 8 to 10 structurally different references saved by the internal assistant. Reopen model selection only if that corpus exposes a repeatable Gemma failure.

## Local Evidence

```text
/Users/shaz/.graphify/benchmarks/vision-challengers-codex-2026-07-10/
```

The directory contains the guarded runner, request sentinels, raw NIM responses, prepared inputs, validated semantic outputs for both challengers, and `semantic-comparison.png`. The image visualizes the legacy mutually exclusive grouping rubric; it is not a valid collection-recovery score.
