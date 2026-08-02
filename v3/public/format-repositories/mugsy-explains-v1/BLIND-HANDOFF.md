# Mugsy Explains Blind Handoff

## Raw Proof Audit: Failed

A fresh agent received only `tmp/pocket-explainer-proof`.

It correctly failed because the proof had no starting instructions, hardcoded content, parent-repo asset paths, undeclared dependencies, no smoke command, ambiguous final attempts, and no packaged validator.

## Smallest General Fix

The proof was packaged as the Mugsy Explains Wiggly Repo with:

- one first question;
- editable `content.json` instead of hardcoded story content;
- bundled fixed pose and voice-reference assets;
- declared tools, packages, key name, and free-model estimate;
- one official runner with `smoke`, `validate`, `render`, `inspect`, and `finalize`;
- automatic content-signature invalidation for cached narration;
- a human voice and creative review gate before finalization;
- one canonical final MP4 and contact sheet.

## Isolated Operator Run: Passed

A second fresh agent received only an isolated copy at `/tmp/wiggly-fast-explainer-blind.LB5VBR` with no completed render.

It:

1. read the packaged instructions;
2. ran the free smoke and validation commands;
3. rendered through the official runner;
4. showed the playable MP4 and contact sheet;
5. asked one human-review question;
6. finalized only after approval;
7. reported zero provider calls because the bundled example reused its approved cached narration.

## Release Cold Run: Passed

A new operator and a separate adversarial auditor each received only a sealed copy of the final package.

The operator completed `smoke`, `validate`, `render`, `inspect`, and approval-gated `finalize` without project context, secrets, network access, or provider calls. It inspected all 27 visual states and all 756 encoded frames before finalization.

The auditor found and forced fixes for four real handoff risks before its final pass:

- tall proof images were cropped instead of contained;
- interrupted narration could mix sentence caches from different scripts;
- the inspected MP4 and voice were not hash-bound to the manifest;
- truncated Fish clips could be trusted as finished cache entries.

The release package now preserves full proof images, pins the pose pack, validates and hash-pins narration clips, promotes new clips atomically, preserves accepted cache on a no-key mismatch, inspects frames extracted from the final MP4, and emits a hash-bound final receipt.

Final independent result: `PASS`, with zero shipping blockers and zero provider calls.

## Recall.ai Cold Run: Mechanical Pass, Human Review Failed

A fresh agent received only the public Mugsy Explains page plus: `Make this for recall.ai.` It asked the correct first question, researched official Recall.ai pages, ran the free smoke and validation steps, stopped for voice approval, rendered through the official runner, and passed every automatic media check without image or video generation.

Human review rejected the creative as a second proof because:

- `This is separate integration.` was awkward spoken grammar;
- `BOT TEAM` versus `USAGE PRICING` named two unlike artifacts instead of the clear build-versus-buy decision;
- one proof image was only 259 pixels wide and several screenshots asked viewers to read too much at phone size.

The smallest general fixes were to require natural read-aloud copy, A/B sides that answer one viewer question, labels that state the contrast, tight one-point proof crops, and proof images at least 400x200 pixels. These rules now apply before narration is generated.

## Scope Of This Pass

This proves a fresh agent can reproduce the bundled Wiggly example without hidden project context. The Recall.ai run proved that BYOK, research, rendering, inspection, and failure behavior transfer to a second brand, but its creative did not pass human review. A second meaningfully different approved output is still required before calling the Format broadly reusable across brands.

## Recall.ai Root-Cause Correction

The failed run exposed that the first package preserved the rendering grammar but skipped the creative discovery process used to make the Wiggly proof. Version 0.2.0 adds two required, hash-bound checkpoints before narration:

- an evidence-backed beginner brief followed by exactly five teaching concepts and explicit concept approval;
- a six-image visual plan and phone-size proof board with explicit image approval.

The runner now rejects stale approvals after any brief, concept, script, visual-plan, or proof-image change. This correction still needs a second Recall.ai cold run and human creative pass before the Format can be called broadly reusable.

## Recall.ai Second Cold Run: Clear But Forgettable

A new agent received only the sealed version 0.2.0 package plus `Make this for https://www.recall.ai/`. It independently researched Recall, produced five concepts, followed the approval gates, built six readable local proof images, generated free Fish narration, and rendered a mechanically valid MP4 without image or video provider calls.

The second run fixed beginner comprehension and visual proof, but human review still rejected it because all three comparisons restated product surface versus infrastructure and the video never landed a memorable Recall-specific conclusion.

The root cause was the story contract, not the renderer or research. It validated three comparisons independently, forced the same spoken scaffold three times, and prohibited sales language without distinguishing a teaching payoff from a CTA.

Version 0.2.1 keeps the source format's repeated A-versus-B grammar but requires one escalating arc:

- `setup` corrects the beginner's assumption;
- `mechanism` reveals how the subject works;
- `payoff` applies that mechanism and lands the approved subject-specific takeaway.

The complete script now has its own hash-bound approval before proof-image work. A fresh script-only Recall handoff must pass this gate before another narration render is justified.

## Recall.ai Script-Only Cold Run: Passed

The first fresh 0.2.1 handoff produced a clear setup, mechanism, and payoff, but its final line still used forgettable product language: `supplies the meeting-recording layer`. Human review rejected that line before proof-image or narration work.

The package now limits `finalTakeaway` to 16 words and requires a concrete line a viewer can repeat after one listen. A second fresh agent received only the newly sealed ZIP plus `Make this for https://www.recall.ai/`. It independently produced five valid concepts and the approved direction's complete 15-sentence script with zero provider calls.

The final arc was:

- setup: AI notetaker versus Recall.ai;
- mechanism: meeting link versus bot participant;
- payoff: capture versus decide.

It ended with: `Recall.ai captures the meeting; your product decides what happens next.` The runner passed the 96-word script, and the agent stopped at script approval before sourcing images. This verifies the creative system now fixes comprehension, progression, and the missing memorable payoff without another paid render.
