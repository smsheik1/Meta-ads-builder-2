# Repo Builder 0.1.1 baseline proof

Test date: 2026-09-06. This is a local coding-agent authoring kit, not an automatic video-cloning service or a creative-quality certification.

## Builder machinery

- 47 local tests passed on macOS arm64 with Node 26.0.0, FFmpeg/FFprobe 8.1.2, and system ZIP/unzip. Node 22 is the declared minimum; a Linux/Node 22 CI job is configured, not asserted to have run here. Version 0.1.1 adds an old-downloader warning and explicit HTTP 403 diagnostics without retries or credential access.
- A clean ZIP extraction outside the Wiggly source tree passed the tests and the free `smoke` command. Smoke verifies controlled media → evidence → unresolved-blueprint rejection → benchmark approval → draft scaffold → draft-release rejection. It does not author a finished Format.
- The extracted package acquired the user's actual [YouTube Short](https://www.youtube.com/watch?v=1AFsqhV8lss) using yt-dlp 2026.07.04, without browser cookies, login, or paid calls. Final private evidence was rehashed independently: 58.234 seconds, 480 × 640, 25 fps, 24 sampled frames, audio present. Source SHA-256: `e7a0651f873f6ca0439cba6007d32a98249e79491971c8ca233a9acb6bbdb9c2`.
- The extracted package also ingested the local reference and ran its optional local Whisper command with an existing whisper.cpp 1.9.2 executable and English model. Result: 17 timestamped transcript segments, explicitly uncertain. No tool/model installation or paid API call was made by the package. Audio SHA-256: `c266245af176ea645d8435067abd20cdb113d12b0a830ab9ba18ba33a47870e8`.
- Tests cover file/hash integrity, bounded media, URL permission/allowlisting, transcript uncertainty and source binding, stale approvals, draft rejection, distinct semantic inputs and outputs, asset/release declarations, symlink rejection, no overwrites, executable permissions after extraction, and reproducible archive content.

## What the reference analysis did and did not discover

Sampled frames established a persistent comparison/question header, game imagery underneath, and short outlined captions. Machine transcription supported a question, surprising concession, follow-up, and final reframe in this particular episode. Moving-video timing, voice identity, music, and voice-generation method were not directly assessed.

The user supplied the crucial broader premise: imagined conversations between fan-favorite characters, recognizable cloned character voices, same-universe or crossover pairings, and gameplay from titles such as Batman: Arkham Knight or Spider-Man 2. The initial independent analysis missed that creative hook. The final interpretation is therefore **user-assisted**, not an unaided reverse-engineering success. A single episode's comparison topic and turn count are not established universal rules.

The builder guidance was updated to separate user context from observations, require the audience promise, and prevent no-paid fixtures from silently replacing the format's real media requirements.

## Original 0.1.0 author and synthetic consumer proof

Authoring proof passed for a user-assisted, mechanical baseline. Fresh agents started from only the extracted kit, private reference and brief. Interrupted sessions left drafts; the completing author corrected the interpretation, authored a standalone child, and used the same official runtime for both content proofs. Root review caught media-protocol/time-bound and receipt-path issues before the final two renders. This was a reviewed authoring workflow, not an autonomous creative-interpretation success.

Child: `character-gameplay-conversations` 0.1.0. It accepts supplied gameplay and per-turn audio, cast/universe choices, topic, header and timed captions. Its bundled diagnostic video and tone files exercise that supplied-media path without cloning voices. Node/FFmpeg/FFprobe are its only runtime requirements; bitmap ASCII typography and mono concatenated audio are explicit limitations.

| Final author proof | Content change | Output | SHA-256 |
| --- | --- | --- | --- |
| `same-universe` | Four-turn leadership conversation | 8 seconds, 480 × 640, 25 fps, H.264/AAC | `36e602488edd86a42c98b4101c0417cc52050d7a47a27c21c45ffbb65f734703` |
| `crossover` | Three-turn exchange about finding the way home; different cast, header, captions, video and tones | 6 seconds, same encoding contract | `af8e7e23d0c1a9f1892f7413263ac760fff6868876318c7af08bf56a236d3f6f` |

Both final receipts bind runtime SHA-256 `9c660fecfb0f8055bd2558c4b82a5de6eb5c7704a1a766392844898fb2acbe0b`. Nine child contract tests and numerical stream/caption-pixel/tone-frequency checks passed. The main reviewer independently probed the outputs, inspected sampled frames for the changed content, and measured non-silent audio. Those are mechanical checks, not direct audiovisual creative approval.

The child archive has 26 files, 2,347,893 bytes, SHA-256 `e2a65ef6290dcde7e8d7dcdd197fd20b9b227b2fd80e5d7fec0510270a756ae5`. Its clean extraction verified every inventory hash, passed the nine tests, and reproduced both packaged outputs byte-for-byte using the documented commands. The child and private source evidence are not included in this builder release or published as a Format listing.

Separate new-content consumer proof passed. A different agent received only the child ZIP and created two new JSON inputs using its declared original fixture assets. It did not use the builder or Wiggly source checkout, edit the renderer, install dependencies, or generate paid media.

| Fresh consumer input | Content | Output | SHA-256 |
| --- | --- | --- | --- |
| `midnight-garden` | Two-character, two-turn same-universe discussion about seeds and moonlight | 4 seconds | `924764420cf610c8738f0a6ad578838161be106433915178734c96d9b316febe` |
| `sky-market` | Three-character, four-turn crossover about trading and sharing a star | 8 seconds | `9fc67353535a5ff6ad53c3afd321aead1a7ce114406604c17af53e8d27fda131` |

Both new outputs retain the same 480 × 640/25 fps contract and exact runtime hash above. The consumer passed nine contract tests, the packaged-example checks, full output decoding, metadata, tone-routing and caption-pixel checks, and sampled-frame inspection. The main reviewer independently rehashed all 25 inventoried shipped files and both new input/output receipts, confirming the runtime and all other shipped content remained unchanged, and inspected sampled output frames for the changed text/cast/layout. All four successful content renders are mechanical supplied-media proofs, not speech/voice or creative-fidelity passes.

## Real-media refinement and blind consumer

The first real-media run exposed crude bitmap typography that the synthetic checks had not ruled out. The child was refined to version 0.1.1 with pinned Sharp 0.34.5 text overlays through the same FFmpeg compositor. Eleven child tests now include legible title size, antialiasing and safe margins for wide text. Both synthetic proofs were rerun against runtime SHA-256 `23a39095a50150d67930b5d8b318481f422fdc772dc41e38e12971aceb30f929`.

Independent gameplay came from the user's [Arkham source](https://www.youtube.com/watch?v=k-T-stiSYgw); the user's [Spider-Man source](https://www.youtube.com/watch?v=K6iqWvPPGeo&t=40s) was also downloaded successfully. Installed yt-dlp 2026.07.04 could read the latter's metadata but received HTTP 403 for its media request. A checksum-verified isolated official 2026.08.19 release downloaded both 30-second 720p excerpts. No browser cookies, login or system-wide installation changes were used. This proves access to those sources with that version, not permanent support for every YouTube URL.

The maintainer prepared two new conversations using twelve total voice clips from exactly Fish `s2.1-pro-free`, whose current pricing table listed $0.00 per million UTF-8 bytes. The user explicitly authorized verified-free calls; no paid fallback or paid call occurred. Voice preparation was outside the Creator and child packages. The child only consumes supplied media.

The maintainer rendered an 18-second Batman/Sonic conversation over independent gameplay. Output SHA-256: `7d216486452562520188633de5df6900615734c7cb47e18448628050d6b0a96a`. The final real-media consumer then received only a frozen child ZIP, a different Batman/SpongeBob brief, raw gameplay and six new dialogue clips. With no conversation history, implementation coaching or source-tree access, it installed declared dependencies, passed eleven tests and both smoke proofs, and produced the new episode on its first render attempt without changing any of the 28 original package files.

| Real blind-consumer artifact | Verified result |
| --- | --- |
| Child 0.1.1 ZIP | 2,377,823 bytes; SHA-256 `11dd2d78226101fb7c6aca9f950e61bf41443a746e4932d24eb7622e8bca5972` |
| New Batman/SpongeBob episode | 16.76 seconds; 480 × 640; 25fps H.264/AAC; 3,195,723 bytes |
| Output SHA-256 | `63de842509644808f9e519818ad9bba7a483cdef7d33e2a8c951fd2d796d5dff` |
| Consumer report SHA-256 | `c53dcd155ee90a43c5e76a5af92ba6311746ce024ee45f5090916f5a4cfa9ab3` |
| Passed | Clean setup, both smoke proofs, full output decoding, source/runtime preservation, and 18 sampled caption frames |
| Still pending | Direct moving-video/audio review, voice recognition, performed quality and caption-to-speech synchronization |

This is a real supplied-media execution pass, not a creative-fidelity pass. Caption phrase timings were estimated, not forced-aligned. No public redistribution permission is inferred from successful downloading or generation, so the private gameplay, character clips and derived real-media outputs are not bundled. The child release contains only its original diagnostic media. The original authoring interpretation remains user-assisted; this later test does not retroactively establish unaided reverse engineering.

## Failures caught and corrected

1. A live YouTube preflight exceeded the bounded metadata buffer because complete format/caption metadata was unnecessary. Preflight now requests only scalar metadata using yt-dlp's JSON projection. The bound was not increased; the live retry succeeded and a large-metadata regression test was added.
2. Review found archive output could follow a symlink ancestor. Output parents now use canonical ancestor validation before writes; a grandparent-symlink regression passes.
3. Review found executable entrypoints lost permission in ZIP staging. Archives now preserve normalized executable permissions and verify them after extraction; a shell-entrypoint extraction/execution regression passes.
4. Full automatic video interpretation was not established. User clarification repaired an incomplete creative hypothesis; that is preserved as an analysis limitation, not hidden behind a passing technical test.
5. An outdated yt-dlp client returned HTTP 403 for accessible source videos. A current release resolved the tested cases; the Creator now warns about older versions and explains access failures without repeatedly downloading, requesting cookies or claiming the video is missing.
6. Real-media review exposed inadequate bitmap typography. The refined child uses measured antialiased text with regression checks, and its new blind consumer retained that exact runtime.

## Limits and reproduction

The Creator itself makes no provider calls, generates no voices and does not automatically publish. The separate real-media preparation used explicitly authorized free character-voice generation; no paid test generation occurred. Optional Whisper explicitly requests English; it does not establish speaker identities or voice similarity. Intake does not retrieve YouTube subtitles. Download availability remains dependent on YouTube and the installed downloader. Sampled frames can miss transient effects. Direct creative audiovisual review remains pending.

`check-repo` checks declared structure and checksum-bound technical receipts; it does not run arbitrary child code, certify media rights, prove semantic similarity, or independently authenticate a human approval statement. The operating agent is responsible for truthful decisions and actual execution. Only selected files are packaged; private reference media, transcripts, credentials, and model files are not distributed.

From a clean extracted builder, run `npm test`, `npm run doctor`, and `npm run smoke`. Use the documented `intake`, optional `transcribe`, `init`, `validate`, `approve`, `scaffold`, `inspect`, `check-repo`, and `package-repo` commands for an actual authoring run. Use explicit user approval for real projects; benchmark approval is not user or creative approval. The source checkout's `verify-kit.mjs <extracted-directory>` checks source/released-content parity.

Skill frontmatter and reference links were checked manually; the optional Python skill-validator could not run because PyYAML was unavailable. The focused overengineering review found no required complexity cuts. Platform portability, future downloader compatibility, and generalization to unrelated video genres are not established by this single baseline.
