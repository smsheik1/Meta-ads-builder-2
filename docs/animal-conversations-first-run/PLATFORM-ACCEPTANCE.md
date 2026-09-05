# Animal Conversations — Linux and WSL2 acceptance evidence

## Scope

These are actual GitHub-hosted **Linux x64** and **Ubuntu running inside WSL2 x64** executions, not cross-platform dependency resolution. The shared harness builds the source candidate, freshly extracts its ZIP, checks the exact source inventory, installs dependencies, and exercises the packaged runtime.

The target is **platform mechanics, isolated setup, and two real local-file intakes**. Synthetic render/review/export regression tests are explicitly mechanics tests. This does **not** certify a fresh coding agent's complete real-episode workflow, user script approval, perceptual playback review, or final real-episode delivery. Public catalog/download promotion is separate.

## First run — observed failure

- Run: [33939590840](https://github.com/smsheik1/wiggly/actions/runs/33939590840), September 5, 2026 UTC.
- Source commit: `c62e02b4ce590b5b371786e0404a87a829060571`, candidate **0.16.1**.
- Linux job: [101234260583](https://github.com/smsheik1/wiggly/actions/runs/33939590840/job/101234260583).
- WSL2 job: [101234260689](https://github.com/smsheik1/wiggly/actions/runs/33939590840/job/101234260689).

Both jobs passed fresh archive/inventory verification, doctor/bootstrap, and the default suite (**98 passed, 8 explicitly opt-in skipped**). The explicit media profile then passed **106 Node tests, zero skipped**, followed by **3 Python-dependent converter tests**.

Both subsequently failed compiling the optional converter's locked `libflate 2.3.1` dependency with `E0658` at `src/finish.rs:128–129`: its chained `if let` syntax is unsupported by the CI-selected **Rust 1.85.1**. This was a real compiler failure, not a failed approval or animation-quality assessment. Standalone smoke and real intake stages were not reached; those stages cannot be inferred from earlier tests.

WSL2 was genuinely running: the job reported kernel **`6.18.33.2-microsoft-standard-WSL2`** and used native Linux tools. It was not a native-Windows execution or a second ordinary Linux job.

## Scoped harness correction

Commit `aa44f461bff8a1e582d24cd7b09fdb29f91410c0` changes only CI tooling. [Rust 1.88 stabilized let chains](https://blog.rust-lang.org/2025/06/26/Rust-1.88.0/); the harness now pins official **Rust 1.89.0** compiler, Cargo, and standard-library archives. The three checksums were read from their official distribution checksum files and are verified before installation.

| Component | SHA-256 |
| --- | --- |
| rustc | `b42c254e1349df86bd40bc28fdf386172a1a46f2eeabe3c7a08a75cf1fb60e27` |
| cargo | `99fc10be2aeedf2c23a484f217bfa76458494495a0eee33e280d3616bb08282d` |
| rust-std | `2719470dcd78b3f97d78b978c8f85a1a58d84ff11b62558294621c01bca34d49` |

All three use target `x86_64-unknown-linux-gnu` and version `1.89.0`. Installation stays inside the disposable CI directory, with global linker/profile changes disabled. The harness checks exact compiler/Cargo/rustdoc versions and compiler host, and emits sanitized toolchain provenance. No package source, dependency lock, tests, gates, or version changed for this repair.

## Corrected run — WSL2 passed; Linux intake remains unresolved

[Run 33940070769](https://github.com/smsheik1/wiggly/actions/runs/33940070769), commit `aa44f461bff8a1e582d24cd7b09fdb29f91410c0`, started **2026-09-05 02:47:31 UTC** and completed **02:54:20 UTC**. Overall conclusion: **failure**, because the Linux job failed. The candidate remained **0.16.1**.

| Observed check | Linux x64, job [101235611585](https://github.com/smsheik1/wiggly/actions/runs/33940070769/job/101235611585) | WSL2 x64, job [101235611420](https://github.com/smsheik1/wiggly/actions/runs/33940070769/job/101235611420) |
| --- | --- | --- |
| Job conclusion | Failure during offline-intake stage | Success |
| Actual Linux kernel | `6.17.0-1022-azure` | `6.18.33.2-microsoft-standard-WSL2` |
| Node / Rust | 22.23.2 / 1.89.0, native Linux x64 | 22.23.2 / 1.89.0, native Linux x64 inside WSL2 |
| Fresh source ZIP and exact inventory | Passed | Passed |
| Doctor before npm ci; doctor after installation | Passed | Passed |
| Default suite | 98 passed, 8 intentional opt-in skips | 98 passed, 8 intentional opt-in skips |
| Explicit media profile | 106 Node tests passed, zero skipped | 106 Node tests passed, zero skipped |
| Optional converter profile | 3 Python-dependent tests + 7 Rust tests passed | 3 Python-dependent tests + 7 Rust tests passed |
| Standalone packaged synthetic smoke | Render and inspection passed | Render and inspection passed |
| Explicit isolated Python/model setup | Passed, reached next stage | Passed, reached next stage |
| Two real local sources, network disabled | Not proven; the combined intake/status stage returned nonzero | Both passed; evidence hashes verified |
| Real agent-authored draft, user approval, perceptual review, final real export | Not tested by this CI | Not tested by this CI |

The compiler correction is therefore verified on **both** environments, without removing converter tests or changing the locked package. The synthetic smoke created a real 4.5-second 1080×1920 H.264/AAC MP4 and inspectable contact sheet; its synthetic content/approval is not real-episode or perceptual acceptance.

### Successful actual WSL2 intakes

Both intakes ran inside an OS network namespace with external networking unavailable, after fresh explicit setup downloaded and verified the pinned public dependencies/model. Runtime was `faster-whisper 1.2.1`, CPU/int8, four CPU threads, `small.en` revision `d1d751a5f8271d482d14ca55d9e2deeebbae577f`, English word timestamps, beam size 5, no VAD, and no previous-text conditioning. Python reported **3.12.3**.

| Bundled approved source | Decoded audio duration | Transcript segments | Verified checkpoint |
| --- | ---: | ---: | --- |
| `goldens/we-listen-dont-judge.mp4` | 31.137959 s | 19 | `needs-script-draft` |
| `examples/i-made-a-mistake/evidence/final.mp4` | 30.023401 s | 20 | `needs-script-draft` |

The harness verified original-source hashes against the release's approved media, and verified the original-quality audio, separate ASR audio, and transcript hashes against intake receipts. It also asserted that neither run contained an imported draft, script approval, final video, playback review, or delivery receipt. Transcription remained explicitly uncertain; no speaker assignments or approvals were inferred.

Verified `RELEASE-CONTENTS.json` SHA-256: `d3c1b03a6c036e4a6e31265a06408b0e961477140ee5191c4b24677053804a06`.

| Evidence | We Listen | Mistake |
| --- | --- | --- |
| Source SHA-256 | `10c65799bff76421b2714b8afea84686cec44002ad039638e11b09aee04f7d24` | `189eafcb00e3b9fc553bc4d181a2a3704cea052c368ff9517ce1701c7b2c3701` |
| Audio SHA-256 | `24c7aa14b21577429987fcd27d7f3c153c0662e2cbdffafb0499978caf1b0f50` | `ec08d5d758f2c0afd3aa9db3060674bb76fed00e8404c4a2aa7ee57953a4e43c` |
| Transcript SHA-256 | `221cba99cc1e0dad9b8b295aa203b144f777806f28919e89c35230c7949e90f8` | `f633971a4f66fb1d5421d7efd65b35e4e0c635edf52453eecc44d5b364619128` |

### Linux diagnostic limitation

The Linux log reaches `two-real-approved-examples-with-os-network-disabled`, then reports exit code 1 before `verify-intake-evidence-and-no-invented-approval`. That stage contains **two intake commands and two subsequent read-only status commands**. It does **not** expose the specific failed command: their structured stdout was redirected to temporary files that were not in the artifact allowlist. The retained evidence does not establish whether either source intake failed or a later status check failed, nor whether the underlying cause was setup validation, decoding, transcription, access, or another condition. Do not label a guessed cause as diagnosed.

The next scoped diagnostic should preserve each intake/status substep's sanitized status/reason and exit code, then repeat actual Linux execution. That correction was **not implemented or dispatched during this read-only monitoring pass**. No dependency, model, approval, or review gate was weakened to turn this result green.

### Retained reports and honest remaining boundary

- [Linux report artifact 9961589900](https://github.com/smsheik1/wiggly/actions/runs/33940070769/artifacts/9961589900): four small files, no success summary; ZIP digest `662a13f854c208eb63e3e00341cb1da0caf8f2a5f08fe8d9a8ca5ee1c51683b6`.
- [WSL2 report artifact 9961601818](https://github.com/smsheik1/wiggly/actions/runs/33940070769/artifacts/9961601818): five small files including successful sanitized summary; ZIP digest `8764cb9964cf0e5d65c5ffdea2025ba3c630ae722a4616a3a1175cd12e0e7504`.
- Reports expire **September 8, 2026 UTC** under the three-day retention policy. No model cache, source/private audio, or run-directory media was uploaded. This checked-in report preserves the observed results beyond artifact expiry.
- WSL2 **platform mechanics/setup/offline intake** passed. Standalone Linux **offline intake** is unresolved. Neither result substitutes for a fresh host-agent real-episode proof through explicit approval, actual playback assessment, and verified export. The separate Mac real reviews still await user approval.
- The public stable download/catalog remain at their intentionally unpromoted version; this CI does not publish or certify a public release.
