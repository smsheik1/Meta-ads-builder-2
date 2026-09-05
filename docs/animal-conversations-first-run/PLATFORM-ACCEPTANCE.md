# Animal Conversations — Linux and WSL2 acceptance evidence

**Latest result: candidate 0.16.2 passed both actual platforms** [run 33967706772](https://github.com/smsheik1/wiggly/actions/runs/33967706772), commit `ff998959`. See [CHORUS-IMPORT-FIX.md](CHORUS-IMPORT-FIX.md) for exact archive and job evidence. This repeats fresh mechanics/setup/offline-intake verification after the instruction/test correction; real host-agent approval/playback/export acceptance remains separate. The 0.16.1 runs and earlier failures below are retained as history, not relabeled as 0.16.2 evidence.

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

## Diagnostic run — exact Linux cause established

[Run 33940815264](https://github.com/smsheik1/wiggly/actions/runs/33940815264), commit `62500dd4c4d9d619fd23e0979699b20a6387b69a`, ran **2026-09-05 03:03:56–03:10:32 UTC**. WSL2 succeeded again; Linux failed. Package contents remained **0.16.1**; the change only exposed existing command results, selected error fields, and file ownership/modes.

| Named substep | Linux [job 101237753421](https://github.com/smsheik1/wiggly/actions/runs/33940815264/job/101237753421) | WSL2 [job 101237753329](https://github.com/smsheik1/wiggly/actions/runs/33940815264/job/101237753329) |
| --- | --- | --- |
| `intake-one` | Exit 0; `needs-script-draft` | Exit 0; `needs-script-draft` |
| `intake-two` | Exit 0; `needs-script-draft` | Exit 0; `needs-script-draft` |
| `status-one` | Exit 1; `intake-evidence-invalid`; `EACCES: permission denied` | Exit 0; `needs-script-draft` |
| `status-two` | Not run after the first failure | Exit 0; `needs-script-draft` |

**Both actual Linux transcriptions succeeded.** The failure was a subsequent read-only status command, not model inference. Linux diagnostics show caller UID/GID **1001:1001**, while the elevated intake produced:

- Run directory owned **0:0**, mode **0755**.
- `state.json` and `intake.json` owned **0:0**, mode **0644**.
- `user-audio.wav` owned **0:0**, mode **0644**.
- `transcript.json` owned **0:0**, mode **0600** (both examples).

The helper's atomic Python temporary-file publication preserves a private 0600 transcript. CI had used `sudo unshare` to run intake as root, then returned to UID 1001 for status/evidence reads. That identity switch made the transcript unreadable to the caller. WSL2's script consistently ran as root, so both subsequent status checks passed. This is a **CI harness identity inconsistency**; the package's private transcript permission should not be relaxed.

The conditional helper diagnostic did not run: no `transcription-failed` result occurred. The true failing exit remained intact. The Linux run therefore proves both actual offline intake commands, but still does not constitute a fully passing same-user acceptance run.

- [Linux diagnostic artifact 9961798349](https://github.com/smsheik1/wiggly/actions/runs/33940815264/artifacts/9961798349), ZIP digest `ecee11c98c2179c4a6be1ff68e980f33087c8f5b1848e6a19f91374b13ab9245`.
- [WSL2 diagnostic artifact 9961841989](https://github.com/smsheik1/wiggly/actions/runs/33940815264/artifacts/9961841989), ZIP digest `38ddf6fa46fb1c5f0456acd4f5e65317e2e1f2775b8b9117f3c8d2840dee67b4`.
- Both artifacts expire September 8, 2026 UTC. No private media/model cache was uploaded.

### Identity correction — verified on both actual platforms

The scoped harness correction creates the network namespace with the existing elevation, then restores the original script UID/GID through `unshare --setgid=<caller-gid> --setuid=<caller-uid>` before executing any offline kit/helper command. The [util-linux documentation](https://man7.org/linux/man-pages/man1/unshare.1.html) and [v2.39 implementation](https://github.com/util-linux/util-linux/blob/v2.39/sys-utils/unshare.c) confirm group/user changes occur in the entered namespace before command execution. WSL2 retains its original root identity; Linux returns to its original unprivileged runner identity.

An explicit offline identity probe now checks actual UID/GID, and each successful intake checks that its transcript remains **0600 and owned by the caller**. No chmod, global permission repair, package changes, or gate bypass was introduced. Local command-assembly tests cover both nonroot Linux and root WSL2; diagnostic tests accept caller-owned 0600 and reject 0644. Shell/embedded-JavaScript syntax and diff checks pass.

[Run 33941276524](https://github.com/smsheik1/wiggly/actions/runs/33941276524), commit `9474a55bdc309048a0bb17b64c689d2a80bfcef9`, ran **2026-09-05 03:13:57–03:20:33 UTC** and completed **success**. Candidate contents remained **0.16.1**.

| Final observed check | Linux [job 101239069808](https://github.com/smsheik1/wiggly/actions/runs/33941276524/job/101239069808) | Actual WSL2 [job 101239069998](https://github.com/smsheik1/wiggly/actions/runs/33941276524/job/101239069998) |
| --- | --- | --- |
| Job conclusion | Success | Success |
| Kernel | `6.17.0-1022-azure` | `6.18.33.2-microsoft-standard-WSL2` |
| Offline child UID:GID = original caller | `1001:1001`, asserted | `0:0`, asserted |
| Both private transcripts | `0600`, owner `1001:1001`, asserted | `0600`, owner `0:0`, asserted |
| Fresh archive/inventory, doctor, npm install | Passed | Passed |
| Default / explicit Node suites | 98 passed + 8 opt-in skips / 106 passed, no skips | 98 passed + 8 opt-in skips / 106 passed, no skips |
| Optional converter profile | 3 Python-dependent + 7 Rust tests passed | 3 Python-dependent + 7 Rust tests passed |
| Synthetic render/inspect smoke; fresh isolated setup | Passed | Passed |
| `intake-one` / `intake-two`, external network disabled | Both exit 0 | Both exit 0 |
| `status-one` / `status-two` | Both exit 0, `needs-script-draft` | Both exit 0, `needs-script-draft` |
| Final exact inventory and intake evidence hashes | Passed | Passed |

Both final summaries independently report the same approved sources, durations, segment counts, source/audio/transcript hashes, model settings, and inventory hash recorded above. This equality was observed, not imposed as a cross-platform ZIP or MP4 byte-identity requirement. Both runs deliberately stopped before drafting or approving a real script; no real approval, perceptual review, or delivery was fabricated.

- [Linux final artifact 9961942886](https://github.com/smsheik1/wiggly/actions/runs/33941276524/artifacts/9961942886), ZIP digest `98b4b19a5ac8b636cc8ef900b92f1effc792fd6b1b0d20ca5cf00409c0dc2b7d`.
- [WSL2 final artifact 9961990764](https://github.com/smsheik1/wiggly/actions/runs/33941276524/artifacts/9961990764), ZIP digest `2cfb6db0cf96f68a02101094c9b7840197fb9d1604d6333d05e45e4818e70ac6`.
- Both small sanitized artifacts expire **September 8, 2026 UTC**; no private media or model cache was uploaded.

**Remaining boundary:** this closes Linux and WSL2 platform mechanics/setup/offline-intake acceptance, not a fresh host-agent real episode through explicit user approval, actual playback assessment, and verified export. The separate Mac real reviews still await user approval. Public stable download/catalog **0.15.1** remain intentionally unpromoted; this CI did not publish candidate **0.16.1**.
