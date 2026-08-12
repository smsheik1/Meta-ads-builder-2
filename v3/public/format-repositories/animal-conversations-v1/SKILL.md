---
name: animal-conversations
description: Render an Animal Conversations vertical video from user-provided audio and a contiguous timed cat/bunny dialogue timeline, or rebuild the packaged character poses from supplied Toon Boom Harmony rigs without Harmony.
---

# Animal Conversations

Use `runner.mjs` as the only episode entry point and `runtime/render.mjs` as the only renderer.

1. Run `npm test` and `npm run check`.
2. Before episode rendering, obtain a local user-provided audio file and an input JSON that follows `input-contract.json`.
3. Run `init`. It extracts one local WAV clip per timeline beat and creates `speaker-review.json`.
4. Directly listen to every clip. Set each `confirmedSpeaker` and `evidence` in `speaker-review.json`; never infer a speaker from caption text or camera alone.
5. Treat vertical motion as emphasis, never as the default talking state: neutral talking uses mouth movement only; jumping must be explicitly attached to an emphasis event with that beat's optional `bounceAt` offsets. Use no more than one bounce for a normal punchline or reaction and two only for an intentionally frantic line.
6. Run `apply-speakers`, then `validate`. Validation rejects missing or stale speaker confirmation and invalid bounce cues.
7. Run `render`, `inspect`, and `finalize` in that order.
8. Directly watch the final MP4 with sound and inspect the contact sheet before returning it.
9. Never call a voice provider or treat the supplied reference MP4 as a required runtime input.

Use `npm run smoke -- --run=<id>` for the free end-to-end mechanics proof. Use `npm run convert` only when an operator supplies a Harmony project to rebuild a character pose.
