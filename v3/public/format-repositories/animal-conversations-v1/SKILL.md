---
name: animal-conversations
description: Render an Animal Conversations vertical video from user-provided audio and a contiguous timed cat/bunny dialogue timeline, or rebuild the packaged character poses from supplied Toon Boom Harmony rigs without Harmony.
---

# Animal Conversations

Use `runner.mjs` as the only episode entry point and `runtime/render.mjs` as the only renderer.

When operating a downloaded kit, read `KIT-MANIFEST.json` first and report its `formatVersion` as the exact resolved version.

1. Run `npm test` and `npm run check`.
2. Before episode rendering, obtain a local user-provided audio file and an input JSON that follows `input-contract.json`. `init` fails closed without the JSON; it never substitutes sample timing for a real episode.
3. Run `init`. It extracts one local WAV clip per timeline beat and creates `speaker-review.json`.
4. Confirm every beat through the strongest explicit evidence channel available. Prefer direct clip listening; otherwise require documented local audio analysis, a user-provided label, a checksum-matched documented reference video, or confirmed silence. For `local-audio-analysis`, add an `evidenceNote` naming the ASR/diarization basis and any creative voice-to-character mapping. Set each `confirmedSpeaker` and `evidence` in `speaker-review.json`, disclose any perception limitation, and never infer a speaker from caption text or camera alone. `both` means proven simultaneous speech only: also set `overlapConfirmed: true` and document the overlap in `evidenceNote`. Never use `both` for uncertainty or alternating voices; stop for stronger evidence or split alternating turns into contiguous single-speaker beats.
5. Treat vertical motion as emphasis, never as the default talking state: neutral talking uses mouth movement only; jumping must be explicitly attached to an emphasis event with that beat's optional `bounceAt` offsets. Use no more than one bounce for a normal punchline or reaction and two only for an intentionally frantic line.
6. Leave mouth timing to the official renderer. It analyzes the supplied audio locally, varies the two-pose cadence with syllable-sized energy rises and falls, holds slow sustained sounds instead of flapping on a fixed clock, closes for sustained pauses, and suppresses jitter; do not add lip-sync cues, viseme tools, thresholds, or model dependencies.
7. Keep each beat's complete spoken line in `caption`; the official renderer—not the agent—turns it into progressive one-to-three-word chunks in a dedicated lower lane inside the bottom third, below character faces and above the episode label, using outlined text without a background panel.
8. Leave blinking to the official renderer. Its independent deterministic tracks vary cadence, prefer nearby dialogue boundaries, skip offscreen events, and avoid mechanical synchronization; do not add blink cues or runtime randomness.
9. Run `apply-speakers`, then `validate`. Validation rejects missing or stale speaker confirmation, any unproven `both` assignment, and invalid bounce cues.
10. Run `render`, `inspect`, and `finalize` in that order.
11. Directly watch the final MP4 and inspect the contact sheet before returning it. If sound is perceptible, review it too; otherwise verify the audio stream, duration, codec, and level and explicitly state that intelligibility was not scored.
12. Never call a voice provider or treat the supplied reference MP4 as a required runtime input.

Use `npm run smoke -- --run=<id>` for the free end-to-end mechanics proof. Use `npm run convert` only when an operator supplies a Harmony project to rebuild a character pose.
