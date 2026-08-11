# Animal Conversations Wiggly Repo

This runnable format kit turns user-supplied audio plus a timed dialogue file into a 1080x1920 cat-and-bunny conversation video. It includes the fixed characters, five supplied backgrounds, three camera angles, captions, speaker-driven mouths, deterministic blinks/reactions, validation, render inspection, and delivery receipts. It does not call a voice provider.

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
node runner.mjs validate --run=my-episode
node runner.mjs render --run=my-episode
node runner.mjs inspect --run=my-episode
node runner.mjs finalize --run=my-episode
```

The timing JSON follows [input-contract.json](input-contract.json). Copy `fixtures/sample/input.json` as a starting point. Its timeline must begin at zero, stay contiguous, and finish at the measured audio duration. The only camera values are `two-shot`, `cat-close`, and `bunny-close`; speakers are `cat`, `bunny`, `both`, or `none`.

## Audio policy

Episode audio is always supplied by the user. `init` copies it into the ignored run folder. Rendering maps that audio stream into the MP4 as AAC; it does not synthesize, rewrite, transcribe, or upload the audio. The smoke command creates a local sine tone solely to prove the muxing path without provider spend.

## Toon Boom conversion

The packaged character PNGs came from the supplied Harmony projects through the official local converter:

```bash
npm run convert -- --rig=/absolute/path/CAT_LOOP_1 --manifest=cat-frame1 --mouth=2 --eyes=1 --output=/absolute/path/cat.png
npm run convert -- --rig=/absolute/path/BUN_LOOP_1 --manifest=bunny-frame1 --mouth=2 --eyes=1 --output=/absolute/path/bunny.png
```

The converter requires Cargo, Node, and Sharp but not Harmony. It writes a checksum receipt beside each PNG. See `converter/RECOVERY.md` for the recovered TGCO fill behavior and pose-manifest details.

## Output

Every run stays under `agent-runs/<run-id>/`. A successful inspection proves dimensions, frame rate, duration, H.264/AAC codecs, an audible audio stream, approved cameras, and captions. `finalize` then writes a hash-bound `delivery.json` beside `final.mp4`.
