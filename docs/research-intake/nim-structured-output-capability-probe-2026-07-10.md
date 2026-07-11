# NVIDIA NIM Structured-Output Capability Probe

- Date: 2026-07-10
- Scope: Provider transport and local-schema enforcement only; no product code changed
- Model: Gemma 4 31B IT through NVIDIA NIM
- Input: Existing Wiggly wordmark crop, not a tuned or holdout ad
- Result: **Pass after correcting the model-specific transport**

## Verdict

The versioned Field + List contract can be enforced by the hosted Gemma endpoint, but this model must receive it through OpenAI-style `response_format` with `type: json_schema`.

A top-level `guided_json` property is the wrong transport for this Gemma 4 NIM variant. NVIDIA accepted that request but ignored the constraint: the response was Markdown-fenced JSON and contained the forbidden property `capture_capture_chrome_present`. Wiggly's strict parser rejected it. No fence stripping, parser heuristic, repair model, or fallback ran.

NVIDIA's model-variant documentation explicitly recommends `response_format.json_schema` for Gemma 4 and other specialized VLM backends:

- [NVIDIA VLM container variants: structured generation](https://docs.nvidia.com/nim/vision-language-models/1.7.0/nim-container-variants.html#structured-generation-guided-decoding)
- [NVIDIA VLM structured generation](https://docs.nvidia.com/nim/vision-language-models/1.1.0/structured-generation.html#json-schema)

This is backend-specific. Generic NIM LLM documentation describes `guided_json` inside the `nvext` extension, so Wiggly must pin the structured-output transport in each model/provider profile instead of assuming one request shape works across NIM models.

## Contract Implemented

The benchmark now uses the checked-in Draft-07 schema [`field-list-analysis-v1`](./schemas/field-list-analysis-v1.schema.json) with:

- required top-level `suitability`, `formula`, `fields`, `lists`, `excluded_evidence`, `assets`, `reroll_groups`, `maker_questions`, and `uncertainties`;
- `additionalProperties: false` on contract objects;
- enumerated policies, roles, scopes, and kinds;
- confidence bounds from zero through one;
- typed List values and reroll-group members;
- exactly one Field or asset reference per List value;
- a maximum of three Maker questions.

The runner performs strict `json.loads` parsing only. It does not scan for a JSON substring or remove Markdown fences. Its existing semantic checks still run after schema decoding.

## Offline Tests

All checks passed:

1. The three existing Field + List contract fixtures passed.
2. The known-good Story analysis passed the Draft-07 schema.
3. Removing required `formula` was rejected.
4. Adding an unknown top-level field was rejected.

## Provider Probe

| Request | Transport | Provider result | Wiggly result |
| --- | --- | --- | --- |
| Diagnostic | Top-level `guided_json` | HTTP success, ordinary fenced output | Rejected; transport was not enforced |
| Corrected verification | `response_format.json_schema` | HTTP success in 71.225 seconds | Passed strict parse, Draft-07 validation, and semantic checks |

The corrected response:

- began directly with `{` and ended with `}`;
- passed Draft-07 validation with zero errors;
- accounted for the single OCR evidence item;
- returned one Field, two asset candidates, and one coherent reroll group;
- used 1,882 prompt tokens and 724 completion tokens.

Neither request used SAM, Replicate, image generation, a repair model, an automatic retry, or a fallback model.

## Decision

1. Keep the versioned Field + List JSON Schema.
2. Pin Gemma 4 semantic analysis to `response_format.json_schema`.
3. Do not describe the product contract as universally using `guided_json`; pin transport per NIM model/backend profile.
4. Keep local runtime validation after provider-constrained decoding.
5. Preserve fail-visible behavior for malformed output and provider errors.
6. Do not reuse the prior three references as untouched holdouts.
7. Run the next semantic gate on new untouched references before selecting the production pipeline or spending SAM requests.

## Evidence

External benchmark artifacts are stored at:

`/Users/shaz/.graphify/benchmarks/guided-json-probe-2026-07-10`

The guarded runner and its external working copy of the schema are stored at:

`/Users/shaz/.graphify/benchmarks/static-reference-corpus-5-2026-07-10`

Key files:

- `field-list-analysis-v1.schema.json`
- `run_gemma_corpus_item.py`
- `response-format-output/REQUEST_SENTINEL.json`
- `response-format-output/raw-response.json`
- `response-format-output/semantic-analysis.json`
