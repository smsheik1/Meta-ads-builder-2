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

## Scope Of This Pass

This proves a fresh agent can reproduce the bundled Wiggly example without hidden project context. The kit remains version `0.1.0-proof`: a second meaningfully different content input is still required before calling the Format broadly reusable across brands.
