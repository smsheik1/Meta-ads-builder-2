# Minimal Maker Analysis — Three Known-Ad Regressions

Date: 2026-07-11

## Result

Three known references tested the five observed semantic rules. They are regression cases, not untouched holdouts.

| Reference | Time | Local contract | Main result |
| --- | ---: | --- | --- |
| Codex integrations | 25.100s | Pass | Strong formula/assets/groups; Slack split out of the six-item supporting List instead of remaining its active seventh item |
| LinkedIn Effect | 104.604s | Pass | Correct four-row List, duplicate name evidence, persona assets, and null active item; hot-take text and decorative assets omitted |
| Dumb vs Smart | 76.625s | Fail visible | Correct 3+3 Lists, but one item referenced undeclared asset `text_07`; adaptation rule and asset coverage were weak |

Operationally, Gemma 31B passed 3/3 with no timeout. The previous overbuilt request's 504 class remains fixed.

Semantically:

- local contract validity: 2/3;
- full semantic acceptance: 0/3;
- automatic retries, fallbacks, SAM, and media generation: 0.

## Decision

Keep Gemma 31B and the six-key minimal contract. Do not add another schema version or resume model shopping.

These old ads were useful because they exposed regressions against known hard patterns. They do not prove unbiased generalization. The assistant's next naturally saved ad becomes the real-world validation without delaying the MVP.

Stop prompt tuning on these references. The Maker must be able to correct partial drafts, while invalid cross-references remain fail-visible. The next work is the Maker `/builder` implementation plan, not another benchmark loop.
