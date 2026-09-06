# Repo Builder 0.1.0 baseline proof

Test date: 2026-09-06. This is a local coding-agent authoring kit, not an automatic video-cloning service or a creative-quality certification.

## Builder machinery

- 45 local tests passed on macOS arm64 with Node 26.0.0, FFmpeg/FFprobe 8.1.2, and system ZIP/unzip. Node 22 is the declared minimum; a Linux/Node 22 CI job is configured, not asserted to have run here.
- A clean ZIP extraction outside the Wiggly source tree passed the tests and the free `smoke` command. Smoke verifies controlled media → evidence → unresolved-blueprint rejection → benchmark approval → draft scaffold → draft-release rejection. It does not author a finished Format.
- The extracted package acquired the user's actual [YouTube Short](https://www.youtube.com/watch?v=1AFsqhV8lss) using yt-dlp 2026.07.04, without browser cookies, login, or paid calls. Final private evidence was rehashed independently: 58.234 seconds, 480 × 640, 25 fps, 24 sampled frames, audio present. Source SHA-256: `e7a0651f873f6ca0439cba6007d32a98249e79491971c8ca233a9acb6bbdb9c2`.
- The extracted package also ingested the local reference and ran its optional local Whisper command with an existing whisper.cpp 1.9.2 executable and English model. Result: 17 timestamped transcript segments, explicitly uncertain. No tool/model installation or paid API call was made by the package. Audio SHA-256: `c266245af176ea645d8435067abd20cdb113d12b0a830ab9ba18ba33a47870e8`.
- Tests cover file/hash integrity, bounded media, URL permission/allowlisting, transcript uncertainty and source binding, stale approvals, draft rejection, distinct semantic inputs and outputs, asset/release declarations, symlink rejection, no overwrites, executable permissions after extraction, and reproducible archive content.

## What the reference analysis did and did not discover

Sampled frames established a persistent comparison/question header, game imagery underneath, and short outlined captions. Machine transcription supported a question, surprising concession, follow-up, and final reframe in this particular episode. Moving-video timing, voice identity, music, and voice-generation method were not directly assessed.

The user supplied the crucial broader premise: imagined conversations between fan-favorite characters, recognizable cloned character voices, same-universe or crossover pairings, and gameplay from titles such as Batman: Arkham Knight or Spider-Man 2. The initial independent analysis missed that creative hook. The final interpretation is therefore **user-assisted**, not an unaided reverse-engineering success. A single episode's comparison topic and turn count are not established universal rules.

The builder guidance was updated to separate user context from observations, require the audience promise, and prevent no-paid fixtures from silently replacing the format's real media requirements.

## End-to-end author and consumer proof

Status: in progress. Fresh-agent analysis/scaffolding was performed from the extracted kit and private reference; interrupted author sessions left drafts, not finished-Repos. Completion requires the authored child runtime, two unchanged-runtime outputs, a clean child archive, and a separate consumer run on new inputs. Do not treat this section as a passed proof until those receipts are recorded.

## Failures caught and corrected

1. A live YouTube preflight exceeded the bounded metadata buffer because complete format/caption metadata was unnecessary. Preflight now requests only scalar metadata using yt-dlp's JSON projection. The bound was not increased; the live retry succeeded and a large-metadata regression test was added.
2. Review found archive output could follow a symlink ancestor. Output parents now use canonical ancestor validation before writes; a grandparent-symlink regression passes.
3. Review found executable entrypoints lost permission in ZIP staging. Archives now preserve normalized executable permissions and verify them after extraction; a shell-entrypoint extraction/execution regression passes.
4. Full automatic video interpretation was not established. User clarification repaired an incomplete creative hypothesis; that is preserved as an analysis limitation, not hidden behind a passing technical test.

## Limits and reproduction

No paid provider generations, voice cloning, automatic publication, or app renderer/editor changes occurred. Optional Whisper explicitly requests English; it does not establish speaker identities or voice similarity. Intake does not retrieve YouTube subtitles. Download availability remains dependent on YouTube and the installed downloader. Sampled frames can miss transient effects. Direct creative audiovisual review remains pending.

`check-repo` checks declared structure and checksum-bound technical receipts; it does not run arbitrary child code, certify media rights, prove semantic similarity, or independently authenticate a human approval statement. The operating agent is responsible for truthful decisions and actual execution. Only selected files are packaged; private reference media, transcripts, credentials, and model files are not distributed.

From a clean extracted builder, run `npm test`, `npm run doctor`, and `npm run smoke`. Use the documented `intake`, optional `transcribe`, `init`, `validate`, `approve`, `scaffold`, `inspect`, `check-repo`, and `package-repo` commands for an actual authoring run. Use explicit user approval for real projects; benchmark approval is not user or creative approval. The source checkout's `verify-kit.mjs <extracted-directory>` checks source/released-content parity.

Skill frontmatter and reference links were checked manually; the optional Python skill-validator could not run because PyYAML was unavailable. The focused overengineering review found no required complexity cuts. Platform portability, future downloader compatibility, and generalization to unrelated video genres are not established by this single baseline.
