# Talking Fish News: Blind Handoff Record

## Test Setup

A fresh agent received only:

- the Editorial Desk rules;
- the Episode Director rules;
- the asset inventory; and
- a short, closed Recall.ai evidence pack.

It had no Wiggly conversation history, source episode clips, browsing access, or paid tools.

## First Pass Finding

The first agent correctly rejected unsupported customer/origin ideas and planned clear proof
assets, but it opened with an industry thesis rather than a reportable event. That exposed an
ambiguous instruction, not a model-quality problem.

**Rule added:** source-faithful report mode must start exactly `Breaking news.` followed by a
6-13 word concrete event.

## Clean Retest

A second fresh agent, receiving the revised rules, succeeded.

| Requirement | Result |
| --- | --- |
| Five concept lanes | Delivered; unsupported lanes were explicitly failed. |
| Best concept | Category change: one meeting becomes three records. |
| Opening | `Breaking news. A meeting can now become three usable records.` |
| Runtime / word count | Four sentences, 56 words; within the 14-20 second / 38-60 word target. |
| Evidence plan | Every line mapped to a meeting grid, output trio, or simple two-path diagram. |
| Claim restraint | Avoided customer outcomes, savings, accuracy, compliance, adoption, and real-time claims. |
| Source safety | Did not name or imitate the source fish or station. |

## Outcome

The handoff is good enough for a later original proof-of-concept. It does **not** authorize a
public kit by itself: the kit still needs original visual assets and one controlled visual run.
