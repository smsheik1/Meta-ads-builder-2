# Animal Conversations Wiggly Repo

This runnable format kit turns user-supplied audio plus a timed dialogue file into a 1080x1920 blue-dog-and-bunny conversation video. It includes the fixed characters, five supplied backgrounds, three camera angles, captions, speaker-driven mouths, deterministic blinks/reactions, validation, render inspection, and delivery receipts. It does not call a voice provider.

The blue dog is the grounded, wise lead and uses the legacy runtime ID `cat`; the pink bunny is the secondary questioner/foil. Keep those roles stable for the whole episode. A detected audio voice must never change characters merely because a caption, sentence, or apparent dialogue turn ended.

## Quick start

```bash
npm install
npm test
npm run check
npm run smoke -- --run=smoke-proof
```

Start a real episode with an absolute audio path and an absolute timing JSON path:

```bash
node runner.mjs init --run=my-episode --audio=/absolute/path/dialogue.wav --input=/absolute/path/input.json
node runner.mjs apply-speakers --run=my-episode
node runner.mjs validate --run=my-episode
node runner.mjs render --run=my-episode
node runner.mjs inspect --run=my-episode
node runner.mjs finalize --run=my-episode
```

The timing JSON follows [input-contract.json](input-contract.json). Copy `fixtures/sample/input.json` as a starting point. Its timeline must begin at zero, stay contiguous, and finish at the measured audio duration. The only camera values are `two-shot`, `cat-close`, and `bunny-close`; provisional speakers are `cat`, `bunny`, `both`, or `none`. `both` means simultaneous speech only. Never use it for uncertain identity or a rapid exchange: stop for stronger evidence when uncertain, and split alternating voices into contiguous single-speaker beats.

Neutral talking uses mouth movement only. The renderer measures the supplied audio locally, derives mouth-open changes from syllable-sized energy rises and falls, and holds the verified speaker's mouth closed during sustained pauses. Slow sustained sounds hold a pose instead of flapping on a fixed clock; faster syllabic speech produces more frequent changes. A two-frame minimum pose suppresses jitter. This is automatic and has no authoring field, model, transcription step, or provider call.

Vertical jumping is reserved for explicit emphasis events: add an optional `bounceAt` array to a beat with one or two offsets in seconds from that beat's start. Use one cue for a punchline, interruption, or strong reaction; use two only for an intentionally frantic line. Omitting `bounceAt` guarantees that the speaker remains vertically still.

The renderer automatically turns each beat's full caption into progressive one-to-three-word chunks. They stay in a dedicated lower lane inside the bottom third—below character faces and above the episode label—as outlined text without a background panel. Keep `caption` as the complete spoken line; do not pre-split it or add manual caption-only beats.

Blinking is automatic and has no authoring field. Each character follows an independent deterministic cadence with irregular three-to-six-second gaps; due blinks move to a nearby dialogue boundary when possible, offscreen blinks are skipped, and near-simultaneous two-shot blinks are staggered. Each blink lasts three frames at 24 fps. Do not add manual blink cues or runtime randomness.

`init` requires both the actual user audio and an absolute real-episode timing JSON. It never falls back to the bundled sample; the sample is exercised only by `smoke`. `init` then extracts every beat into `agent-runs/<run>/speaker-review/` and creates `speaker-review.json`. Prefer listening to each clip. If audio perception is unavailable, require another explicit channel: documented local audio analysis, a user-provided label, a checksum-matched documented reference video, or confirmed silence. Set `confirmedSpeaker` plus the matching `evidence` (`direct-audio-review`, `local-audio-analysis`, `user-provided-label`, `reference-video`, or `silence`), disclose the limitation, then run `apply-speakers`. For `local-audio-analysis`, define each stable detected voice ID once in `voiceCharacterMap`, list the matching `detectedVoices` on every analyzed beat, and add an `evidenceNote` naming the ASR/diarization basis. The dog/wise-lead voice maps to `cat`; the bunny/foil voice maps to `bunny`. `apply-speakers` rejects a later attempt to recast the same detected voice. A confirmed `both` additionally requires mapped dog and bunny voices, `overlapConfirmed: true`, and an `evidenceNote` that documents simultaneous speech; it writes that note into the final beat as `overlapEvidence`. Validation rejects unproven `both` assignments. That command makes the confirmed values authoritative and writes a receipt bound to the audio checksum and full speaker timeline. `validate` refuses to proceed if any beat is unconfirmed or if the audio/timeline changed afterward. Run `review-speakers` to regenerate the clips and start the confirmation again.

## Audio policy

Episode audio is always supplied by the user. `init` copies it into the ignored run folder and extracts local review clips; nothing is uploaded. Rendering maps the original audio stream into the MP4 as AAC; it does not synthesize, rewrite, transcribe, or guess voice identity. An operator may use an external local ASR/diarization tool to author the timing JSON and document that basis in speaker review, but the kit intentionally does not ship a large model or a second media pipeline. The smoke command creates a local sine tone solely to prove review receipt and muxing mechanics without provider spend.

## Toon Boom conversion

The packaged character PNGs came from the supplied Harmony projects through the official local converter:

```bash
npm run convert -- --rig=/absolute/path/CAT_LOOP_1 --manifest=cat-frame1 --mouth=2 --eyes=1 --output=/absolute/path/cat.png
npm run convert -- --rig=/absolute/path/BUN_LOOP_1 --manifest=bunny-frame1 --mouth=2 --eyes=1 --output=/absolute/path/bunny.png
```

The converter requires Cargo, Node, and Sharp but not Harmony. It writes a checksum receipt beside each PNG. Character manifests define required opaque interior points, and tests verify those points in every packaged idle, blink, and mouth-open pose. See `converter/RECOVERY.md` for the recovered TGCO fill behavior and pose-manifest details.

## Output

Every run stays under `agent-runs/<run-id>/`. A successful inspection proves dimensions, frame rate, duration, H.264/AAC codecs, an audible audio stream, approved cameras, captions, and a current all-beat speaker-assignment receipt. `finalize` then writes a hash-bound `delivery.json` beside `final.mp4`.
