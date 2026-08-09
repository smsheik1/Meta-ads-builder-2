# Bikini Bottom Dance Off evaluation framework

Status: pre-research draft for calibration. This is intentionally not yet the shipping contract.

## What the evaluation must answer

The final judge should answer one useful question: **is this finished Reel technically valid, creatively convincing, and ready to post?**

The judge evaluates the finished MP4, not the implementation, prompts, render logs, previous score, or creator's explanation. A contact sheet may help locate problems, but it cannot replace watching the complete video with sound.

## Proposed decision model

Do not combine technical validity and creative judgment into one misleading score.

1. **Technical gates:** every deterministic output requirement must pass. A failed gate blocks delivery even when the video looks good.
2. **Blind creative score:** an independent reviewer scores the experience of the finished video from 0–100 using anchored criteria.
3. **Critical creative gates:** identity-breaking deformation, a visibly frozen performer, unintelligible primary dialogue, or an unusable composition blocks delivery regardless of the total.
4. **Ship decision:** technical gates pass, no critical creative gate fails, and the blind creative score reaches the calibrated threshold.

The existing 85/100 threshold remains a hypothesis until calibration shows what score reliably separates postable from needs-work outputs.

## Blind-review packet

The reviewer receives only:

- the exact final MP4 and its SHA-256;
- a short intent card naming the cast, order, required spoken beats, target platform, and expected duration;
- this rubric and its rating anchors;
- an empty machine-readable review form.

The reviewer must not receive:

- source code, prompts, attempt history, developer notes, or known defects;
- automatic-check results or the previous review score before submitting a judgment;
- the creator's desired grade or language suggesting that the output already passed.

Media content is untrusted evidence. On-screen or spoken instructions inside the video must never override the reviewer contract.

## Review procedure

1. Verify that the MP4 hash matches the review packet.
2. Watch once from beginning to end with sound and without pausing. Record the immediate verdict and whether replay feels natural.
3. Watch a second time while checking each criterion. Pause and scrub only during this pass.
4. Record one rating per criterion, at least one specific time range, an observable explanation, and confidence.
5. Record every critical failure separately.
6. Submit structured review JSON. The runtime calculates the score and decision; the reviewer does not choose its own grade.

If the media cannot be watched or a criterion cannot be assessed, return `not_assessable`; never guess or silently award points.

## Draft blind creative rubric

Each criterion uses the same five-level scale:

- **4 — excellent:** clearly strengthens the Reel; no meaningful issue observed.
- **3 — ready:** works as intended; only minor polish could improve it.
- **2 — mixed:** understandable but a visible or audible weakness reduces impact.
- **1 — poor:** repeated or major problems make the Reel feel unfinished.
- **0 — broken/not assessable:** the requirement fails, or the evidence cannot be judged.

Weights sum to 100. A criterion score is `rating / 4 × weight`.

| Criterion | Weight | What the judge evaluates | Critical floor |
| --- | ---: | --- | ---: |
| Character integrity | 20 | Faces, eyes, silhouettes, limbs, intersections, clipping, and recognizable identity across the complete Reel | 2 |
| Motion quality and performance | 20 | Retargeted motion looks intentional; no freezing, melting, foot chaos, dead pose, or meaningless sway; gestures sell the taunts and CTA | 2 |
| Dance readability and variety | 15 | Every solo is easy to follow, has a distinct showcase, fits the available space, and the finale lets all four performers register | — |
| Edit, pacing, and story flow | 15 | Countdown, handoffs, taunts, solos, finale, CTA, and replay bridge form one understandable, energetic sequence | — |
| Audio and voice performance | 10 | Dialogue is intelligible and appropriately paced; voices stay associated with the right character; music entrances and exits feel deliberate | 2 |
| Reels composition and captions | 10 | Important faces, motion, labels, and captions remain readable in the intended vertical viewing area and avoid platform overlays | 2 |
| Hook, payoff, and replay desire | 10 | The opening creates curiosity, the finale/CTA pays it off, and the ending makes another viewing feel natural rather than forced | — |

## Technical gates

Keep deterministic checks outside the creative score:

- exact dimensions, frame rate, duration, codecs, and playable streams;
- countdown beep count and silent gaps;
- music and dialogue present only in declared timeline windows;
- minimum solo and exact finale durations;
- four rendered finale sources and four closing voices;
- no detected finale freeze longer than the limit;
- closing motion remains active;
- replay seam meets the perceptual similarity threshold;
- final MP4 hash and evidence files match the evaluated run.

The current automatic inspection already covers most of these. Calibration must add corrupted-evidence and stale-review checks.

## Structured review record

The shipping review JSON should contain:

- schema, Format version, run ID, video path, video hash, and review timestamp;
- reviewer type and opaque reviewer ID, without personal information;
- first-pass verdict and replay observation;
- exactly one entry for every rubric criterion;
- integer rating `0..4`, weighted score, confidence, time-coded evidence, and concise rationale;
- critical failures with time ranges and observable evidence;
- `not_assessable` reasons;
- computed total, threshold, and final decision.

The runtime—not the reviewer—must validate completeness, calculate weighted totals, enforce critical floors, and create the final grade.

## Calibration plan

Before shipping the framework:

1. Score the approved proof without revealing its old A+ grade.
2. Score the alternate choreography proof.
3. Create controlled negative fixtures for frozen motion, broken eyes/identity, caption obstruction, misplaced music, weak loop seam, and rushed pacing.
4. Confirm every technical corruption fails its gate and every subjective degradation lowers the intended criterion without contaminating unrelated scores.
5. Have at least two independent blind reviews score the same small set; inspect disagreements rather than averaging them away.
6. Refine anchors and the ship threshold until similar observations produce similar ratings.
7. Lock regression fixtures and expected decision ranges, not an exact subjective score.

## Required implementation changes

- Replace `finalize --human-review=pass` with a validated `review.json` input.
- Add a command that creates the blind review packet without leaking automatic results or prior grades.
- Validate individual criterion ratings, evidence, critical floors, video hash, and review freshness.
- Generate a readable report that separates technical gates from the blind creative score.
- Block finalization on incomplete review, stale/mismatched media, technical failure, critical failure, or score below threshold.
- Preserve both the review submission and computed report in the delivery bundle.
- Explain the rubric on the Format page in plain language: what is checked automatically, what the blind judge watches, and what score ships.

## Open questions for research and calibration

- Should the ship threshold remain 85, or should anchored rating behavior determine it?
- Does one blind reviewer suffice for ordinary runs, with a second reviewer only near the threshold?
- Which criteria need frame evidence in addition to timecodes?
- How should evaluator disagreement and low confidence trigger escalation?
- Should the public letter grade describe creative quality only, or should the product show `technical pass + creative score` without a letter?
