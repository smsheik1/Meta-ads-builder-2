# Blind evaluator calibration

Rubric candidate: `1.1.1`
Format: `0.9.1`
Status: runtime, negative controls, and reviewer-capability rejection pass; qualified direct-audiovisual double-score remains pending.

## Baseline pilot

The archived rubric `1.0.0` pilot produced `85/100`, with every creative criterion rated `3 — Ready`, while all 16 technical gates passed separately. A later capability audit established that the agent saw continuous video but inferred audio from burned-in captions and QuickTime's unmuted player state; it did not receive sound. The score remains preserved as a visual/caption-assisted historical pilot, not a qualified current shipping judgment.

Another visual-only agent returned audio `not-assessable` and surfaced an ambiguity between intentional Reels-safe outer-background space and unfinished empty space. Rubric `1.1.0` added criterion-specific anchors and an inconclusive outcome. Rubric `1.1.1` now also requires each reviewer to attest whether video and audio were perceived directly, indirectly, or not at all.

## Controlled negative results

| Fixture | Technical result | Blind result | Expected isolation |
| --- | --- | --- | --- |
| Original public proof | 16/16 pass | Historical visual/caption pilot: 85; current audiovisual score pending | Baseline |
| Frozen 34–43s finale | `finaleMotionContinuity` fails; other 15 pass | Not needed | Deterministic motion failure |
| Audio stream removed | Audio, beep, music, and dialogue gates fail; other 12 pass | Not needed | Deterministic audio failure |
| Caption lane hidden | 16/16 pass | 72.75, fail; composition 3→0, edit 3→2 | Subjective/accessibility failure caught after technical pass |
| Packet content changed | Rejected before scoring | Not accepted | Evidence integrity |
| Video hash changed | Rejected before scoring | Not accepted | Stale or substituted render |
| Reviewer lacks audio/video | Technical result unchanged | Inconclusive, no grade | Measurement limitation, not video failure |
| Reviewer sees captions/player controls but receives no sound | Technical result unchanged | Inconclusive under `1.1.1` | Indirect evidence cannot impersonate hearing |

The hidden-caption result changed only its intended primary dimension by more than one rating point. Its secondary edit-flow effect was one point; character, motion, dance readability, audio, and replay ratings were unchanged.

## Playback-capability findings

Three clean-room agents correctly failed the playback preflight while the Mac was locked. After unlock, a fresh agent watched two full moving-video passes but correctly refused to score because the Computer Use channel did not expose sound. A separate audit retracted an earlier controls-and-caption-assisted submission that had incorrectly claimed audible playback.

These records prove the need for a direct-perception gate. Under `1.1.1`, a reviewer must record `playback.perceptionBasis.video` and `.audio`. Only `direct` counts toward a shipping score. `indirect` or `unavailable` returns `inconclusive`, even when the player shows a valid audio track at full volume.

No qualified inter-rater statistic is reported yet. Counting incomplete playback as either a score or disagreement would measure reviewer tooling, not video quality.

## Acceptance gate still required

Two distinct reviewers with genuine moving-video and audio input must score the same hash-bound rubric `1.1.1` packet. Calibration is accepted only when:

- both complete two direct-audiovisual passes;
- decision agreement is 100%;
- at least 80% of criterion ratings are within one point;
- no unresolved two-point criterion disagreement remains;
- any near-threshold pass is independently confirmed rather than averaged.

The runtime already enforces the same qualification, second-review, and adjudication boundaries for production finalization. Until a directly audio-capable review environment completes this double-score, the evaluator is a research-informed release candidate, not a claimed fully calibrated judge.
