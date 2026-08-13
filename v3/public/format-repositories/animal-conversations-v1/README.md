# Animal Conversations Wiggly Repo

This runnable format kit turns user-supplied audio plus a timed dialogue file into a 1080x1920 blue-dog-and-bunny conversation video. It includes the fixed characters, five supplied backgrounds, three camera angles, captions, speaker-driven mouths, deterministic blinks/reactions, validation, render inspection, and delivery receipts. It does not call a voice provider.

The blue dog uses the legacy runtime ID `cat`; the pink bunny uses `bunny`. Narrative roles are episode-specific: either character may be the mentor, questioner, lead, or foil. The user-approved complete script is the only role authority. Diarization supplies anonymous voice clusters only and cannot decide character or narrative role.

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
node runner.mjs approve-script --run=my-episode
node runner.mjs validate --run=my-episode
node runner.mjs render --run=my-episode
node runner.mjs inspect --run=my-episode
node runner.mjs finalize --run=my-episode
```

The timing JSON follows [input-contract.json](input-contract.json). Copy `fixtures/sample/input.json` as a starting point. Its timeline must begin at zero, stay contiguous, and finish at the measured audio duration. The only camera values are `two-shot`, `cat-close`, and `bunny-close`; provisional speakers are `cat`, `bunny`, `both`, or `none`. Each active beat contains exactly one of `caption` for spoken words or `vocalization` for a named nonverbal performance. Split a gasp, shriek, laugh, or other audible reaction into its own contiguous beat instead of hiding it in a neighboring line. `both` means proven simultaneous speech only. When a `both` beat contains captioned words, `captionSpeaker` identifies whether the caption belongs to the dog, bunny, or a true synchronized chorus.

Neutral talking uses mouth movement only. The renderer measures the supplied audio locally, derives mouth-open changes from syllable-sized energy rises and falls, and holds the verified speaker's mouth closed during sustained pauses. Slow sustained sounds hold a pose instead of flapping on a fixed clock; faster syllabic speech produces more frequent changes. A two-frame minimum pose suppresses jitter. This is automatic and has no authoring field, model, transcription step, or provider call.

Vertical jumping is reserved for explicit emphasis events: add an optional `bounceAt` array to a beat with one or two offsets in seconds from that beat's start. Use one cue for a punchline, interruption, or strong reaction; use two only for an intentionally frantic line. Omitting `bounceAt` guarantees that the speaker remains vertically still.

The renderer automatically turns each spoken beat's full caption into progressive one-to-three-word chunks. They stay in a dedicated lower lane inside the bottom third—below character faces and above the episode label—as outlined text without a background panel. Keep `caption` as the complete spoken line; a `vocalization` is recorded for approval and animation but is not shown as caption text.

Blinking is automatic and has no authoring field. Each character follows an independent deterministic cadence with irregular three-to-six-second gaps; due blinks move to a nearby dialogue boundary when possible, offscreen blinks are skipped, and near-simultaneous two-shot blinks are staggered. Each blink lasts three frames at 24 fps. Do not add manual blink cues or runtime randomness.

`init` requires both the actual user audio and an absolute real-episode timing JSON. It never falls back to the bundled sample. It extracts every beat into `agent-runs/<run>/script-review/` and creates `script-review.json` plus `timed-role-sheet.md`. Prefer listening to each clip. External ASR or diarization may draft words, timing, and anonymous voice clusters, but the agent must show the user the generated sheet containing every exact time range, line, named nonverbal vocalization, silence, character assignment, caption owner, and overlap. Keep elongated phrases, internal dramatic pauses, and trailing words with the same speaker through the final audible word; slow delivery is not a speaker boundary, but the next character's first audible word is. After corrections, regenerate with `review-script`, complete each beat's evidence, and set the top-level `approval` only after explicit whole-sheet approval. `approve-script` rewrites the sheet as approved and writes `.script-approval.json`, both bound to the audio checksum and complete performance timeline. `validate`, `render`, `inspect`, and `finalize` reject missing or stale approval. Any change to audio, timing, words, caption owner, vocalization, camera, or role requires review and approval again.

When local diarization genuinely identifies distinct stable people, `voiceCharacterMap` prevents one anonymous voice from jumping characters at a caption boundary. Do not use that constraint when one performer voices multiple characters or when a nonverbal reaction breaks the clustering assumption; the user-approved role script is authoritative. A confirmed `both` still requires mapped dog and bunny voices, `overlapConfirmed: true`, and written simultaneous-speech evidence.

## Audio policy

Episode audio is always supplied by the user. `init` copies it into the ignored run folder and extracts local review clips; nothing is uploaded by the official runtime. Rendering maps the original audio stream into the MP4 as AAC; it does not synthesize, rewrite, transcribe, or guess voice identity. An operator may use an external local or explicitly approved BYOK transcription/diarization tool to draft the timing JSON, but the kit intentionally ships no model, provider dependency, or second media pipeline. Those tools never replace whole-script approval. The smoke command creates a local sine tone solely to prove approval and muxing mechanics without provider spend.

## Included examples

- `goldens/we-listen-dont-judge.mp4` is the original fixed proof.
- `examples/i-made-a-mistake/evidence/final.mp4` is the corrected unseen-audio proof with the Dog reaction, Bunny reassurance overlaps, complete elongated Dog line, and Bunny handoff preserved by the v0.15 approval rules.

Both public examples intentionally retain their approved soundtracks. Raw audio and review clips from new runs remain excluded.

## Toon Boom conversion

The packaged character PNGs came from the supplied Harmony projects through the official local converter:

```bash
npm run convert -- --rig=/absolute/path/CAT_LOOP_1 --manifest=cat-frame1 --mouth=2 --eyes=1 --output=/absolute/path/cat.png
npm run convert -- --rig=/absolute/path/BUN_LOOP_1 --manifest=bunny-frame1 --mouth=2 --eyes=1 --output=/absolute/path/bunny.png
```

The converter requires Cargo, Node, and Sharp but not Harmony. It writes a checksum receipt beside each PNG. Character manifests define required opaque interior points, and tests verify those points in every packaged idle, blink, and mouth-open pose. See `converter/RECOVERY.md` for the recovered TGCO fill behavior and pose-manifest details.

## Output

Every run stays under `agent-runs/<run-id>/`. A successful inspection proves dimensions, frame rate, duration, H.264/AAC codecs, an audible audio stream, approved cameras, captions, and a current complete-script approval covering all spoken, nonverbal, silent, and overlapping beats. `finalize` then writes a hash-bound `delivery.json` beside `final.mp4` and the approved `timed-role-sheet.md`.
