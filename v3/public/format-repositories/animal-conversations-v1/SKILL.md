---
name: animal-conversations
description: Render an Animal Conversations vertical video from user-provided audio and a contiguous timed blue-dog/bunny dialogue timeline, or rebuild the packaged character poses from supplied Toon Boom Harmony rigs without Harmony.
---

# Animal Conversations

Use `runner.mjs` as the only episode entry point and `runtime/render.mjs` as the only renderer.

The blue dog is the grounded, wise lead and uses the legacy runtime ID `cat`; the pink bunny is the secondary questioner/foil. Character roles come from the user-approved complete script, never from anonymous diarization labels alone.

When operating a downloaded kit, read `KIT-MANIFEST.json` first and report its `formatVersion` as the exact resolved version.

1. Run `npm test` and `npm run check`.
2. Before episode rendering, obtain a local user-provided audio file and an input JSON that follows `input-contract.json`. `init` fails closed without the JSON; it never substitutes sample timing for a real episode.
3. Run `init`. It extracts one local WAV clip per timeline beat and creates `script-review.json`.
4. Draft the complete timed role script. Every active beat contains exactly one of `caption` for words or `vocalization` for a named nonverbal sound such as an emotional gasp or shriek; silence uses `speaker=none`. Split words and nonverbal performance into separate contiguous beats. Automated transcription, diarization, dialogue context, and cameras may propose a draft but never approve character roles.
5. Show the entire written script to the user before rendering: every spoken line, nonverbal vocalization, silence, and Dog/Bunny assignment in order. Incorporate corrections, regenerate `script-review.json`, then set its `approval` only after the user explicitly approves the complete version. Confirm every beat through the strongest evidence channel available. For `local-audio-analysis`, use `voiceCharacterMap` and `detectedVoices` only when anonymous clusters genuinely represent distinct stable speakers; do not force one voice-to-character map onto a multi-character performance. `both` means proven simultaneous speech only. Record the approval basis, approver, and note.
6. Treat vertical motion as emphasis, never as the default talking state: neutral talking uses mouth movement only; jumping must be explicitly attached to an emphasis event with that beat's optional `bounceAt` offsets. Use no more than one bounce for a normal punchline or reaction and two only for an intentionally frantic line.
7. Leave mouth timing to the official renderer. It analyzes the supplied audio locally, varies the two-pose cadence with syllable-sized energy rises and falls, holds slow sustained sounds instead of flapping on a fixed clock, closes for sustained pauses, and suppresses jitter; do not add lip-sync cues, viseme tools, thresholds, or model dependencies.
8. Keep each spoken beat's complete line in `caption`; the official renderer—not the agent—turns it into progressive one-to-three-word chunks in a dedicated lower lane inside the bottom third, below character faces and above the episode label, using outlined text without a background panel. A `vocalization` is approval evidence and is not displayed as caption text.
9. Leave blinking to the official renderer. Its independent deterministic tracks vary cadence, prefer nearby dialogue boundaries, skip offscreen events, and avoid mechanical synchronization; do not add blink cues or runtime randomness.
10. Run `approve-script`, then `validate`. Validation rejects missing or stale complete-script approval, omitted nonverbal events, any unproven `both` assignment, and invalid bounce cues.
11. Run `render`, `inspect`, and `finalize` in that order.
12. Directly watch the final MP4 and inspect the contact sheet before returning it. If sound is perceptible, review it too; otherwise verify the audio stream, duration, codec, and level and explicitly state that intelligibility was not scored.
13. Never call a voice provider or treat the supplied reference MP4 as a required runtime input.

Use `npm run smoke -- --run=<id>` for the free end-to-end mechanics proof. Use `npm run convert` only when an operator supplies a Harmony project to rebuild a character pose.
