# Wiggly Repo Builder

Give your coding agent a reference video and a brief. Build a reusable video format whose subject, script, and assets can change—not just a copy of one clip.

Version: **0.1.1 baseline**. The package provides local evidence extraction, blueprint and approval checks, an incomplete child scaffold, technical media inspection, and allowlisted ZIP packaging. Your agent supplies the analysis, implementation, and judgment. It does not contain a general-purpose video understanding model or an automatic renderer generator.

## Start with your agent

Open this extracted folder in your coding agent and ask:

> Read SKILL.md. Use this reference video and my brief to build a reusable Wiggly Format Repo. Explain the observed rules and uncertainties before implementation, and do not make paid calls.

Attach a local video or provide an accessible YouTube URL. A local file is the fallback when download access is unavailable. You do not need the Wiggly website, its private source checkout, or another skill installed.

## Requirements

- Node.js 22 or newer.
- FFmpeg and FFprobe for evidence and output inspection.
- `zip` and `unzip` for packaging and verification.
- Optional current `yt-dlp` for permitted YouTube acquisition; tested with 2026.08.19. `doctor` warns about older dated releases. HTTP 403 means the request was refused, not that the video is missing. Check the [official releases](https://github.com/yt-dlp/yt-dlp/releases/latest) within your setup permissions before trying another source. A successful title lookup is not a successful media download; an authorized local file remains supported.
- Optional already-installed `whisper.cpp` CLI and existing local model for English speech transcription.
- A coding agent able to edit files and run local commands. Direct video/audio review depends on that agent's capabilities or a human reviewer.

Run this from the extracted package before starting:

```sh
node bin/wiggly-repo-builder.mjs doctor
```

The package does not install tools, access your browser cookies, log in, download models, or call paid providers. Child Formats may require additional tools or assets; these must be declared before use. Native Windows or every coding-agent host is not implied to be verified.

## What happens

1. Acquire a bounded local copy and extract checksum-bound evidence.
2. Your agent writes a blueprint separating what it observed from its interpretation.
3. You decide whether that blueprint captures the format you want.
4. Your agent authors a new runtime and tests two different content inputs.
5. Inspect and review the outputs, then create a standalone local archive.

A draft scaffold is deliberately incomplete. Passing a technical inspection does not mean the video is creatively approved. The builder's `smoke` command tests only the path from local evidence to a draft scaffold.

## Command reference

All commands use `node bin/wiggly-repo-builder.mjs` from this folder.

| Command | Result |
| --- | --- |
| `doctor` | Read-only prerequisite report. |
| `intake --source <file-or-youtube-url> --run <new-directory> [--allow-download] [--max-seconds 180]` | Private source plus sampled frames and optional audio evidence. URL acquisition needs explicit download permission. |
| `transcribe --run <existing-run> --whisper-bin <absolute-installed-whisper.cpp-CLI> --model <absolute-existing-model>` | Optional English-only, local speech/timing evidence. Writes `transcript.json` and raw `evidence/whisper-transcript.json`; installs/downloads nothing. |
| `init --run <directory> --slug <slug> --title <title>` | Unresolved editable blueprint, not automatic analysis. |
| `validate --run <directory>` | Blueprint and reference-evidence validation. |
| `approve --run <directory> --reviewer <name> --note <decision> [--scope user\|benchmark]` | Receipt for the exact blueprint/evidence. Only record an actual decision; benchmark attestation is not user approval. |
| `scaffold --run <directory> --output <new-directory>` | Draft child Repo for the agent to implement. |
| `inspect --media <file> --output <new-report.json>` | Technical stream metadata and checksum; no creative verdict. |
| `check-repo --repo <directory>` | Child structure, declared assets, and two inspected proofs; does not execute the runtime. |
| `package-repo --repo <directory> --output <new-archive.zip>` | Allowlisted local archive with inventory/checksums; no upload. |
| `smoke` | Provider-free synthetic evidence-to-draft check. |

Default intake maximum: 180 seconds. Upper bounds: 600 seconds, 100 MB, and 24 samples. Sampling cannot reveal every cut, movement, word, or audio cue.

Output paths must be new and their parent directories must already exist. The default `build-kit.mjs` command creates its own `downloads` directory; it never replaces an existing archive.

YouTube intake acquires audio/video only, not subtitles. Optional transcription requires an existing executable/model and makes no provider calls or credential requests. Its separate hash-bound receipt leaves `evidence.json` unchanged. Machine words and timings can be wrong; they do not establish speaker identity, voice timbre, music, or direct audio review. The baseline explicitly requests English rather than detecting the language.

The canonical workflow is [SKILL.md](SKILL.md). Analysis detail lives in [reference-analysis.md](references/reference-analysis.md); child implementation and proof requirements are in [format-authoring.md](references/format-authoring.md).

Read [PROOF-REPORT.md](PROOF-REPORT.md) for the actual test coverage, interpretation limitations, and distinction between mechanical and creative proof.

## Reference assets stay private

Reference videos, extracted audio, and frames are evidence—not automatically distributable assets. Use original, appropriately licensed, or user-authorized assets in the child Repo and declare their provenance. Availability on YouTube is not itself redistribution permission. Publishing a finished Repo to any website or Git host is a separate user decision.
