# Blind evaluator calibration

Rubric candidate: `1.1.0`
Format: `0.9.0`
Status: runtime and negative controls pass; qualified independent double-score remains pending.

## Baseline pilot

One capability-qualified blind agent watched the complete public proof twice with sound under rubric `1.0.0` and scored every creative criterion `3 — Ready`: `85/100`, pass. All 16 technical gates passed separately.

An independent agent saw the visual sequence but could not perceive audio. Its record is retained as a protocol finding, not a valid competing score. It returned audio `not-assessable` and surfaced an ambiguity between intentional Reels-safe outer-background space and unfinished empty space. Rubric `1.1.0` addresses both findings with playback qualification, an inconclusive outcome, and criterion-specific composition anchors.

## Controlled negative results

| Fixture | Technical result | Blind result | Expected isolation |
| --- | --- | --- | --- |
| Original public proof | 16/16 pass | 85, pass | Baseline |
| Frozen 34–43s finale | `finaleMotionContinuity` fails; other 15 pass | Not needed | Deterministic motion failure |
| Audio stream removed | Audio, beep, music, and dialogue gates fail; other 12 pass | Not needed | Deterministic audio failure |
| Caption lane hidden | 16/16 pass | 72.75, fail; composition 3→0, edit 3→2 | Subjective/accessibility failure caught after technical pass |
| Packet content changed | Rejected before scoring | Not accepted | Evidence integrity |
| Video hash changed | Rejected before scoring | Not accepted | Stale or substituted render |
| Reviewer lacks audio/video | Technical result unchanged | Inconclusive, no grade | Measurement limitation, not video failure |

The hidden-caption result changed only its intended primary dimension by more than one rating point. Its secondary edit-flow effect was one point; character, motion, dance readability, audio, and replay ratings were unchanged.

## Inter-rater findings

The initial visual ratings were `[3,3,3,2,0,1,2]` and `[3,3,3,3,3,3,3]`, but the first record is not a qualified complete review because audio was unavailable. Counting it as a failed video would have produced a false negative, so rubric `1.1.0` excludes incomplete playback from decision agreement.

Three subsequent clean-room agents correctly failed the new playback preflight because the Mac was locked and continuous audiovisual playback was unavailable. Their zero-pass, not-assessable records demonstrate that the guard works. They do not satisfy the independent double-score acceptance gate.

## Acceptance gate still required

After the Mac is unlocked, two distinct capability-qualified reviewers must score the same rubric `1.1.0` packet. Calibration is accepted only when:

- both complete two audiovisual passes;
- decision agreement is 100%;
- at least 80% of criterion ratings are within one point;
- no unresolved two-point criterion disagreement remains;
- any near-threshold pass is independently confirmed rather than averaged.

The runtime already enforces the same second-review and adjudication boundary for production finalization. Until this double-score is recorded, the evaluator is a research-informed release candidate, not a claimed fully calibrated judge.
