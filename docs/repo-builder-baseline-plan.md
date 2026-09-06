# Repo Builder baseline

Scope: a standalone, agent-operated local package, not a video-understanding model, editor, automatic publisher, or universal renderer. No paid calls. Preserve the existing internal skill and app surfaces.

Package: `v3/public/format-repositories/repo-builder-v1`, version `0.1.0`.

The host agent interprets the reference and authors the new Format runtime. The package provides executable evidence extraction, blueprint/approval validation, a draft scaffold, technical media inspection, and allowlisted release packaging. A scaffold is never a completed Format. Sampled frames cannot certify motion or audio. Missing direct review remains explicit.

Commands (`node bin/wiggly-repo-builder.mjs`):

- `doctor`: required Node 22+, FFmpeg/FFprobe, zip/unzip; optional yt-dlp for URLs.
- `intake --source <local file or YouTube URL> --run <new directory> [--allow-download] [--max-seconds 180]`: bounded full-video acquisition and evidence extraction, never paid.
- `transcribe --run <directory> --whisper-bin <installed whisper.cpp CLI> --model <existing local model>`: optional English-only local transcript, separately hash-bound to source/audio. No automatic setup or paid call. Observations may cite `local-transcript`; approval binds it when used.
- `init --run <directory> --slug <slug> --title <title>`: unresolved blueprint; does not invent analysis.
- `validate --run <directory>`: evidence hashes, observed timecodes, classifications, inputs, proof descriptions, and honest review state.
- `approve --run <directory> --reviewer <name> --note <decision> [--scope user|benchmark]`: exact blueprint/evidence hash receipt. User approval must actually come from the user; benchmark approval is explicitly not user/creative approval.
- `scaffold --run <directory> --output <new directory>`: draft child Repo with instructions, contracts, manifest, and runtime authoring boundary. Never copies private reference media.
- `inspect --media <file> --output <new report.json>`: technical dimensions/duration/streams/checksum only, not creative approval.
- `check-repo --repo <directory>`: validate completed child manifest, requirements, official runtime, allowlist, declared assets, two distinct proof inputs and inspected outputs. Does not execute child code or certify semantic equivalence.
- `package-repo --repo <directory> --output <new archive.zip>`: clean ZIP, explicit file inventory/checksums, no private paths or symlinks. No upload.
- `smoke`: fully local controlled video -> evidence -> validated benchmark blueprint -> draft scaffold. Child authoring is tested separately by a fresh agent.

Intake module owned separately: `runtime/intake.mjs` exports `doctor()`, `intake({source, runDirectory, allowDownload=false, maxSeconds=180})`, `inspectMedia({media, output})`; injectable executor for isolated tests permitted. Receipts: `evidence.json` contains `schemaVersion:1`, `source:{sha256,file,durationSeconds,width,height,fps,hasAudio}`, `sampling:{method:"uniform",limitations:[...]}`, `frames:[{atSeconds,file,sha256}]`, optional `audio:{file,sha256}`, no transcript/model required. Original media is under `private/`; frames/audio are evidence, never implicitly public assets. Local intake works with silent videos. Max 600 seconds, 100 MB, 24 samples. No automatic installs, login/cookie access, or model downloads.

Blueprint shape: `schemaVersion:1`, `slug`, `title`, `referenceSha256`, `summary`, `observations:[{id,atSeconds,description,channel:"visual"|"audio"|"audiovisual",basis:"frame"|"direct-playback"|"user-transcript"}]`, `rules:[{id,description,classification:"fixed"|"variable"|"optional"|"unsupported",observationIds:[],reasoning}]`, `inputs:[{name,type:"string"|"number"|"boolean"|"asset"|"array",description}]`, `runtime:{approach,entrypoint}`, `review:{visual:"sampled-frames"|"direct"|"unavailable",audio:"direct"|"transcript-only"|"unavailable"|"not-applicable",limitations:[]}`, `assets:[{path,source,usage:"original"|"licensed"|"user-supplied"|"reference-only",notes}]`, `proofs:[{id,description}]` (at least two different briefs). This is an editable JSON contract with runtime validation, not a separate schema framework.

Child manifest `FORMAT-REPO.json`: `schemaVersion:1`, `kind:"wiggly-format"`, `slug`, `version`, `status:"draft"|"ready-for-review"`, `runtime` (official relative entrypoint), `releaseFiles:[]`, `assets` (same usage declarations as blueprint), `proofs:[{id,input,output,inspection}]`; `review:{status:"pending"|"approved",reviewer,notes}`. Required files: root `SKILL.md`, `README.md`, `AGENTS.md`, `requirements.json`, `blueprint.json`, manifest, official runtime. `requirements.json` declares `localTools`, `providers`, and `paidApprovalRequired:true`. Pending creative review must remain visible in archive metadata. No finalized/creative-approved claim from technical checks alone.

Verification: adversarial contract/path/hash tests, no-network local smoke, clean extraction with no source-tree dependencies, fresh-agent authoring from only package+reference, separate consumer proof on two content inputs without runtime edits, skill validation, correctness/overengineering review. Record actual evidence and limitations; do not claim live YouTube retrieval or direct audiovisual perception without performing it. Commit and push the clean baseline; public app listing/deployment is a separate step.

Actual benchmark: the supplied YouTube Short `1AFsqhV8lss`. Initial analysis identified layout and dialogue but missed the fan-conversation premise. User clarification established the role of recognizable cloned character voices, game footage, and same-universe/crossover appeal. Preserve this as user-assisted interpretation. The child must accept real supplied gameplay/audio; original synthetic fixtures only test that real composition path, never substitute for proof of voice recognition or finished creative quality.
