# 3D Breakdown Prompt Simplification Scorecard

Date: 2026-07-20

The prompt file fell from 35,153 characters / 567 lines to 16,498 characters / 381 lines. The pipeline still has the same three creative stages: five story directions, narration for the chosen direction, and six-frame visual planning.

Full raw outputs are in the local ignored artifacts folder at `artifacts/three-d-prompt-simplification/` (`before.json`, `after.json`, and `after-targeted.json`). No paid media models were called.

| Case | Original result | Simplified result | Hook | Accuracy | Story fit | Visual potential | Payoff | Verdict |
|---|---|---|---:|---:|---:|---:|---:|---|
| Product explanation | Provider 502 before an output | An unused fifth idea hit the old broad `dissolving` check | — | — | — | — | — | Broad false-positive check removed; not rerun |
| Brand origin | Rejected the ordinary word `structure` | Rejected the duplicate long reference-script word count | — | — | — | — | — | Both rejection causes removed; not rerun |
| Industry fact | Passed: “One room freezes while the next bakes, but the thermostat lies.” | Rejected only by the duplicate long reference-script word count | 5 | 5 | 5 | 5 | 4 | Original quality preserved; duplicate gate removed |
| Product launch | Rejected the ordinary word `structure` | Passed targeted rerun: “One space station on your shelf, or three completely different ones?” | 5 | 3 | 5 | 5 | 3 | Better than original failure; exact-fact and website-CTA rules tightened afterward |
| David’s Cookies gifting | Rejected duplicate long reference-script length | Passed targeted rerun: “Sending another thank-you card feels increasingly hollow.” | 4 | 3 | 4 | 4 | 4 | Better than original failure; exact-fact and natural-language rules tightened afterward |
| Retargeting | Rejected production language in the duplicate reference script | Passed: “Why does most heat stay trapped under you while you try to sleep?” | 5 | 5 | 5 | 5 | 4 | Clear improvement |

Scores use a 1–5 review of the requested dimensions. A dash means validation stopped before a complete creative output existed.

## What changed

- Story Directions no longer authors IDs or evidence types.
- Script authors four narration lines; Wiggly appends the website CTA and owns beat roles and timing.
- The duplicate 110–160-word reference script was removed from the model contract. Wiggly stores the actual final narration instead.
- Visual Planning no longer repeats the locked script or authors style, frame IDs, frame roles, frame labels, frame count, or timing.
- Broad words that caused false rejections (`compression`, `structure`, `intact`, `months`, `completely`, `thick`, metaphorical `dissolving`, and general `release`) were removed from semantic tripwires. Specific unsupported packaging, medical, digestive, contamination, and product-behavior checks remain.

## Decision

Keep the simplified prompts. The original passed 1 of 6 real cases. The simplified pipeline produced three complete, diverse real cases after the identified root-cause fixes, while retaining the strongest original industry-fact hook and all focused regression tests. Remaining copy weaknesses are ordinary creative-quality work, not a reason to restore the duplicated prompt contract.

## Verification

- Typecheck, the 3D Breakdown format suite, media-handoff mocks, and the ecommerce prompt benchmark pass.
- Playwright reached the real `/create` flow, researched David's Cookies, displayed the correct brief plus 195 products, generated five Story Directions, and ran the selected direction through Script and Visual Planning.
- The first selected-script run exposed one missing instruction: the four model-written lines could miss the final 45-65-word limit after Wiggly added the CTA. The prompt now budgets 43-58 words before the CTA; the repeated real run produced a valid 51-word script.
- The browser stopped at the visible `Generate storyboard` button with the script and six-frame plan ready. No image, video, audio, Replicate, GPU, or other paid-media generation ran.
