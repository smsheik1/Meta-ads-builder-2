# Animal Conversations

Give a coding agent a supported, accessible video link or downloaded clip. It drafts the dialogue, shows you a playable plan to approve, then renders, reviews, and delivers a 1080×1920 talking-animal video.

You do **not** need to write timestamps. A transcript/timeline is optional if you already have one. A regular chat window without local file and command access is not enough.

## What's included

The blue Dog and pink Bunny, five backgrounds, three camera angles, progressive captions, audio-driven mouths, deterministic blinks, and sparse emphasis motion. The existing local engine is preserved: no AI image/video/voice API calls and no dedicated GPU required. Your coding agent may have its own plan, limits, or costs.

The Dog's internal ID remains `cat` for compatibility. Neither character has a fixed narrative role; your approved script decides who performs each part.

## First-time setup

Node >=20.9.0 is the first prerequisite. The doctor runs before dependencies are installed and reports missing tools together without changing global installations.

```sh
node runner.mjs doctor
npm ci
npm test
node runner.mjs doctor
node runner.mjs smoke --run=first-smoke
```

Normal rendering needs Node, FFmpeg/FFprobe, and kit-local Sharp—not Python or Cargo. `FFMPEG`, `FFPROBE`, and `PYTHON` optionally select executable paths. `check` is another name for the read-only doctor.

Optional local transcription uses Python 3.12. Explicit setup installs locked dependencies into `.intake-env/` and about 486 MB of pinned `small.en` model files into `.intake-models/`:

```sh
node runner.mjs setup-intake
```

It runs on CPU, is English-first, and processes local files offline after setup. Missing tools or weights return `setup-required`; intake does not silently download them. Setup targets Apple Silicon macOS and Linux x64, including Linux tools inside WSL. Native Windows is not supported. Platform targets are not a substitute for the documented release acceptance results.

## Make an episode

Your coding agent follows [SKILL.md](SKILL.md), the single complete workflow. These are its checkpoints, not technical work you must do:

| Checkpoint | What happens |
| --- | --- |
| Intake | `intake --run=<fresh-id> --source=<link-or-local-file>` preserves the original, extracts full-quality audio, and creates an uncertain transcript. |
| Draft | The agent writes dialogue, character assignments, timing, and creative choices, then imports with `review-script --run=<id> --input=/absolute/draft.json`. |
| Review | Open `agent-runs/<id>/script-review.html`. Hear exact clips, check the full plan and uncertainty, and ask the agent for corrections. No server is needed. |
| Approve | After you approve the displayed version, the agent records its review ID, your name, and your actual confirmation using `approve-script`. |
| Produce | `run --run=<id>` renders and inspects, then stops for actual playback review. |
| Deliver | Once required reviews pass, `run` finalizes and verifies the export, and the agent shows you the video. |

All commands use `node runner.mjs` as their prefix. [SKILL.md](SKILL.md) gives the exact approval/playback arguments, required observation fields, and current media/render/policy identities. For existing work, start with `node runner.mjs status --run=<id> --json`.

If a link is blocked or needs login, provide a downloaded file: `node runner.mjs run --run=<id> --source=/absolute/downloaded-video.mp4`. The kit does not automatically access cookies or credentials, and it cannot retrieve every link.

Transcription is a draft, not proof of who spoke. Overlaps, emotional sounds, and elongated words need particular care. The agent prepares and corrects timing; you approve the content. Use a clip you have permission to remix.

## Changes and honest completion

- Changed words, timing, roles, background, cameras, emphasis, title, or audio invalidate the relevant approval/results. For changed creative choices in a progressed run, `review-script --input=... --new-revision` preserves prior outputs. New source audio uses fresh intake.
- There are **three render/inspection cycles per content-and-audio revision**, including the first. Reapproving unchanged content does not reset the budget. Interrupted work resumes; a note alone cannot unlock an unchanged failed retry.
- Required technical and direct visual review must pass. Only policy-permitted auditory judgments may be explicitly unscored when sound cannot be perceived. Disclosure is not permission to skip required checks.
- `complete` means the current finalized export verifies—not that a file merely rendered, or that you watched it. Missing access/approval, exhausted retries, and required review limitations remain blockers.

An advanced agent with prepared real audio and an input JSON may use `init --run=<fresh-id> --audio=/absolute/audio.wav --input=/absolute/draft.json`. Displayed review and explicit approval still apply. `upgrade-run --run=<old-id> --new-run=<fresh-id>` preserves old work and requires a new expanded review, approval, render, and quality evidence.

## Your files

Private work stays in `agent-runs/<id>/`. Full-quality `user-audio.wav` is separate from the lower-resolution ASR derivative; the derivative never replaces the soundtrack.

The verified public export defaults to `outputs/<id>/`: `final.mp4`, a viewing page, sanitized review evidence, and checksums. Source video, downloader metadata, credentials, and machine paths stay private. Review WAVs are omitted unless requested with `--include-review-media`. Export refuses unrelated existing folders; changed exported files invalidate completion.

The intentionally distributable examples are `goldens/we-listen-dont-judge.mp4` and `examples/i-made-a-mistake/evidence/final.mp4`, with their approved soundtracks. The sine-tone smoke test is only a mechanics proof, never user approval or playback review of a real episode.

## Developer and converter checks

`npm test` covers JavaScript runtime/converter logic and packaged assets. `npm run test:converter` adds Python converter tests and Cargo; these are unnecessary for normal episodes. [PACKAGING.md](PACKAGING.md) describes exact-file release selection and the explicit real-ZIP test profile. Archive integrity does not certify fresh-agent or supported-platform acceptance.

To rebuild a pose from an operator-supplied Harmony rig:

```sh
npm run convert -- --rig=/absolute/path/CAT_LOOP_1 --manifest=cat-frame1 --mouth=2 --eyes=1 --output=/absolute/path/cat.png
```

The optional converter uses Cargo, Node, and Sharp without Harmony. See `converter/RECOVERY.md`. Normal episodes keep the shipped assets and renderer.
