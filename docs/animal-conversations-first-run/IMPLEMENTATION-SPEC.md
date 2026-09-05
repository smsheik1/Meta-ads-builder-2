# Animal Conversations — Implementation specification

Status: approved for implementation; not a release-completion claim.

This is the approved supplied plan, with the following clarifications controlling implementation:

- Development loop: read checkpoint → select next unmet acceptance criterion → scoped change → tests and actual inspection → evidence → bounded repair → advance only when the criterion passes.
- Episode loop: intake → host-agent-authored draft → explicit approval → render → technical and playback review → verified export. The host agent drives drafting and diagnosis; no new autonomous model service or scheduler.
- An approved revision is identified by approved semantic content plus audio bytes, never an approval timestamp. Reapproval of unchanged content does not reset its three technical-cycle budget. Development work does not inherit this episode-attempt ceiling.
- No user-authored timestamps are required; advanced supplied input remains supported. Only supported, accessible links or local files are accepted. On retrieval failure, explain the specific problem and offer a user-supplied local file, not a claim that every URL can be downloaded.
- Disclose only permitted perception limitations. Unresolved required checks still block completion. Review receipts record actual assessment; do not invent perception or approval.
- Missing approval/access, exhausted episode retries, or out-of-scope work produces an explicit resumable blocker, never a completion claim.
- Final acceptance is against a clean packaged artifact: fresh install, at least two meaningfully different proof inputs using the same renderer, actual output review and verified export, plus the stated supported-system matrix. Phase-level success alone is insufficient.
- Preserve the renderer/assets, deterministic animation and provider-free default. No tutorial-edit work, website publication, automatic publishing, or paid service calls are included.
- Retain the plan's legacy migration feature at lowest priority; any deferral must be explicit in the final feature report, not silently omitted.

## Supplied plan

# Animal Conversations — Reviewed Implementation Plan

## 1. Objective and fixed decisions

Improve the 0.15.1 kit so a first-time coding agent can move from supplied media to an approved, verified, accessible video without inventing installation, intake, approval, or recovery procedures.

This replacement corrects gaps in the earlier plan: intake/run collisions, doctor’s dependency-loading problem, ambiguous retry accounting, incompatible timing changes, incomplete migration rules, and premature claims that dependent phases could ship independently.

Confirmed decisions:

- Support macOS ARM64 and Linux x64; WSL uses Linux tooling inside WSL. Native Windows is deferred.
- Package optional runnable, English-first local transcription tools.
- Use a static playable review page and explicit approval in chat.
- Use the existing coding agent for drafting and diagnosis, with runtime-enforced gates and persistent progress.
- Preserve the existing renderer, assets, camera grammar, captions, deterministic animation, and provider-free default.

The runtime enforces artifact consistency and required attestations. It cannot authenticate a chat conversation, prove perception, prevent an unrestricted agent from editing files, or keep executing after its host terminates.

## 2. Release sequence

### Release A: Pause-check hotfix

- Measure complete audio-inactive intervals that intersect speaking beats, preserving their continuation through silence.
- Keep the existing threshold and animation behavior.
- Test boundary-spanning pauses and genuinely invalid short intervals.
- Compare decoded frames and audio in the same environment; do not require cross-platform byte-identical MP4s.
- Ship independently as a patch.

### Release B: Bootstrap improvements

- Keep all existing JavaScript runtime and packaged-asset tests in `npm test`; move the Cargo proof into optional converter/release testing.
- Add a dependency doctor that uses Node built-ins before loading Sharp-dependent modules. It must run on an extracted kit without `node_modules`.
- Report missing dependencies together, including executable paths, versions, required FFmpeg capabilities, and asset problems.
- Centralize `FFMPEG`, `FFPROBE`, and `PYTHON` overrides across every subprocess. Use the running Node executable for Node subprocesses.
- Document Node as the initial prerequisite. Never automatically repair global installations.

### Release C: Integrated first-run workflow

Develop intake, review, controller, quality enforcement, and export as separate PRs, but release their completed workflow together. Do not ship a controller whose completion gates depend on unavailable features.

Include release packaging and end-to-end tests before publishing this feature release.

## 3. Workflow and public interfaces

### Optional setup and intake

Add:

- `setup-intake`: explicitly provisions a kit-local Python environment and model cache.
- `intake --run=<id> --source=<URL-or-file>`: creates a new intake run, prepares media, and produces transcription evidence.

Use Python 3.12, the locally proven yt-dlp/faster-whisper versions, locked transitive dependencies, and a pinned model revision with checksums. Default to `small.en`, CPU/int8, English word timestamps, beam size 5, no VAD, and no previous-text conditioning.

Separate setup downloads from execution: with prepared dependencies and model cache, local intake must work offline. Missing dependencies or weights return `setup-required`, rather than downloading implicitly.

For URL retrieval:

- Retrieve one item using generated local filenames.
- Ignore global downloader configuration and plugin directories.
- Do not acquire cookies, credentials, or paid services automatically.
- Preserve source metadata privately; record selected provenance and credits as source assertions.
- Distinguish inaccessible sources, login requirements, network errors, missing audio, and transcription failures.

Preserve original media and full-duration render audio separately from the ASR audio derivative. The downsampled transcription WAV must never become the soundtrack accidentally.

### Explicit intake-to-draft handoff

Intake ends in `needs-script-draft`. The host agent authors a candidate episode input using transcript, source evidence, and user preferences; ASR does not assign or approve characters.

Extend:

`review-script --run=<id> --input=<absolute-draft-path>`

This command validates and imports the draft into the intake run using its preserved audio, then generates review artifacts. It must not call `init`.

Keep `init --audio=… --input=…` as the advanced fresh-run path. Both initialization paths reject existing run collisions.

Changes to a progressed run require an explicit `--new-revision`. Validate the candidate before replacing canonical input; preserve prior receipts and outputs. Unchanged review regeneration is idempotent.

### Review and approval

Generate a static review page that works through `file://`, without a server or local JSON-fetch assumptions. Include exact WAV playback and all approval-covered choices: wording, timings, roles, vocalizations, overlap, camera, emphasis, background, title, and episode label.

Enhance:

`approve-script --run=<id> --review-id=<id> --approved-by=<name> --note=<confirmation>`

The command computes hashes internally and records the explicit chat approval. Approval covers audio bytes and all displayed semantic choices; cosmetic page changes do not invalidate it.

Separate transcription, timing, casting, diarization, and overlap evidence. Require voice mappings only when genuine diarization supplies that evidence. Preserve explicit simultaneous-speech requirements.

The normal episode path requires user approval. Mechanics-only fixture approval must not become a way to finalize arbitrary episode content.

### Persistent gate-driven loop

Add:

- `status --run=<id> --json`: read-only reconciliation.
- `run --run=<id>`: advances eligible deterministic work until completion or a specific required action.

Return the current phase, unmet gates, evidence references, preview/export paths, and the next action’s owner: **agent, user, or operator**. An agent-owned drafting or diagnosis action must not be presented as a request for the user to supply timestamps.

Persist revisions, attempts, failures, and evidence using atomic writes and exclusive run locks. Reconcile artifacts after interruption; do not trust a saved phase label alone. Existing commands must use the same gate logic.

One attempt means one technical cycle: render if required, then inspect. Allow three cycles per approved semantic revision, including the first.

- Revision identity derives from approved content and audio, not approval timestamps.
- Reapproving unchanged content does not reset the budget.
- Interrupted cycles resume under the same attempt ID.
- Read-only diagnosis consumes no attempt.
- An explanatory note alone cannot unlock an unchanged retry; require a relevant change or verified repair.
- Exhaustion and package defects become explicit blockers, never automatic threshold changes or runtime patches.

Update the canonical skill to drive this loop through the existing host agent. No standalone model runtime, scheduler, or automatic publishing is included.

## 4. Integrity, quality, delivery, and compatibility

### Freshness and quality

Bind render receipts to the canonical input, audio content, selected assets, renderer identity, and produced MP4 hash. Inspection and finalization must reject stale media even when replacement audio has the same filename and duration.

Use one authoritative quality policy. Policy changes invalidate relevant quality evidence, not unchanged script approval.

Add:

`record-playback-review --run=<id> --input=<review-record>`

Require the two named playback passes and results for every required review criterion, bound to the MP4 and rubric. Empty or entirely unscored visual reviews cannot pass.

Separate visual, technical-audio, and perceptual-audio criteria. Required visual checks and technical audio checks must pass. Unavailable perceptual-audio judgments may remain explicitly unscored under the existing perception policy. Playback counters alone are not evidence that the review criteria were assessed.

Finalization requires current technical and playback receipts.

### Timing compatibility

Retain schema-1’s existing 20 ms boundary tolerance in this release. Document it accurately, generate exactly shared boundaries for new drafts, and expose discrepancies before approval.

Remove the earlier proposed one-microsecond validation change. A stricter public timing contract is a separately versioned decision.

Retain the current caption renderer. Add authoring examples and tests for separate reactions, delayed questions, elongated delivery, and speaker handoffs; defer word-aligned caption rendering.

### Export and completion

Add:

`export --run=<id> --output=<directory> [--include-review-media]`

Default destination: `outputs/<run-id>`.

- Direct export requires current finalization.
- Stage and verify the bundle before publishing it.
- Refuse unrelated or nonmatching existing destinations; an already verified matching bundle is an idempotent success.
- Include the defined deliverables and a checksum manifest. Separate the publishable MP4 from clearly labeled supporting evidence.
- Exclude original source/review audio by default; identify omitted evidence and hide unavailable media controls.
- Never rewrite hash-bound canonical evidence just to repair presentation links.
- Exclude raw downloader metadata, credentials, signed media URLs, and machine-generated absolute paths from exported presentation/provenance.
- Missing or modified exported artifacts invalidate completed status.

The controller’s `complete` state means required artifacts are finalized and the export verifies. It does not claim the user received or watched them. The host-agent handoff must show the actual video and its status.

Static pages must escape HTML and embedded data, including `</script>` payloads; use no remote scripts, fonts, or telemetry.

### Legacy runs and release packaging

Add:

`upgrade-run --run=<old-id> --new-run=<new-id>`

Copy preserved inputs into a new run without altering the historical run. Require a newly displayed expanded review, fresh approval, and new render/quality evidence. Never manufacture upgraded approval or playback receipts.

Keep schema-1 episode inputs, legacy `cat` identity, and existing command names. Version changed state and receipt formats explicitly.

Build archives from an explicit publishable-file selection. Exclude runs, private media, credentials, environments, caches, and model weights. Generate versioned archives, checksums, and release metadata while retaining the stable download filename. Website publication remains separate.

## 5. Acceptance and verification

Tests accompany each PR. Browser, local-ASR, and converter tests belong to explicit release profiles so default testing does not recreate the dependency problem.

Required acceptance cases:

1. Doctor works before package installation; normal rendering needs neither Cargo nor Python.
2. Prepared local intake works offline; missing weights request setup; mocked URL failures produce actionable results.
3. Intake → draft import → review succeeds without an initialization collision.
4. Original/full-duration audio remains distinct from ASR audio, including first/last words and source timestamp offsets.
5. Static review works without a server, plays exact clips, and safely displays malicious-looking metadata.
6. Pause reporting passes legitimate intervals without media changes; true invalid intervals still fail.
7. Resume is idempotent, preserves approval, rejects concurrent mutation, and retains interrupted attempt identity.
8. Same-content reapproval does not reset attempts; a corrective note without a repair does not permit another unchanged cycle.
9. Changed audio, MP4, renderer dependencies, or policy invalidates the appropriate receipts.
10. Missing approval, empty visual review, or stale playback evidence blocks finalization.
11. Direct export cannot bypass finalization; interrupted export cannot mark completion; changed exported files invalidate completion.
12. Legacy upgrade preserves the old run and requires fresh expanded approval.
13. Release archives contain no private media, credentials, environments, or model caches.

Use rights-cleared or synthetic fixtures. Automated tests may exercise receipt validation with test data but must not claim that CI performed perceptual review.

Release acceptance includes a documented fresh-agent run on macOS ARM64 and Linux x64, plus WSL verification using Linux binaries. Live Instagram availability and cross-platform byte-identical encoding are not release requirements.

Success is a verified media-to-delivery workflow with explicit human approval, honest review evidence, actionable recovery, and an immediately accessible generated video.

