# Integrated workflow — implementation and candidate evidence

## Scope and checkpoint

Candidate kit **0.16.0** preserves the shipped characters, backgrounds, camera/caption painter and deterministic animation engine. It adds local intake, protected review, resumable gates, current quality/playback evidence and verified delivery. No tutorial media, production website, public download alias, or provider key was changed.

The development loop is not an autonomous AI executor inside the kit. The host coding agent performs drafting, diagnosis and genuine review; the Node runtime enforces the checkpoints and reports the next owner/action.

## Implemented and checked

- Node-only doctor starts before Sharp is installed. Normal tests and rendering do not require Python or Cargo.
- Explicit Python 3.12 setup pins all dependencies and four model files. Actual CPU inference on two different >30s clips plus a +2.5s source-offset case passed; see ASR-PREFLIGHT.md. ASR made real emotional/overlap errors, so its output remains uncertain draft evidence.
- Intake preserves acquired media and a full-rate/channel soundtrack separately from 16 kHz mono ASR audio. Supported URL failures offer a user-provided local file, never automatic credential/cookie access.
- Existing-run draft import validates before replacement. It does not call init or require the user to supply timestamps.
- The full playable review binds every creative choice, audio, evidence and uncertainty. Changing evidence after display invalidates the displayed review ID. Explicit approval does not manufacture casting evidence.
- File URL review page plays exact full/beat WAVs offline. Narrow/wide and hostile-text QA passed after wrapping long text and collapsing technical JSON; see REVIEW-PAGE-QA.md.
- Content-and-audio revision IDs ignore approval time and local audio filename. Failed-cycle fingerprints exclude notes; three cycles include the first. Interrupted work retains its attempt ID. Modern runs cannot misuse legacy upgrade to reset history.
- Synthetic actual-render integration verified init collision preservation, pending approval, render→inspect interruption/resume, playback gate, idempotence, verified export, damaged export rejection, preserved revision history and legacy migration.
- Playback requires both named passes and all criteria. Only explicitly permitted unavailable auditory judgments may be unscored. Submitted observations bind the render identity as well as the MP4 and policy.
- Render identity binds actual asset bytes **and asset mappings**, content, soundtrack, renderer code and environment. A changed renderer cannot reuse old playback observations even if the MP4 bytes happen to match.
- Contact sheets are staged/renamed and hash-bound before inspection passes. Interrupted generation cannot promote stale sheets as current evidence.
- Finalization requires current approval, required technical/playback checks and exact canonical evidence. Fixture approval cannot finalize an episode.
- Exports are staged, verified and kept separate from private runs. They omit raw source media and review WAVs by default, retain canonical evidence unchanged, refuse unrelated destinations and stop reporting completion after exported files change.
- Legacy upgrade creates a fresh reviewed run and preserves the old input/audio/state without copying old approvals into authority.
- Exact-file release selection rejects private paths, environments, weights, credentials, symlinks and altered example MP4s. Fresh ZIP builds are byte-identical in the tested environment after source-mtime changes.

These synthetic tests assess enforcement, not real user approval or perception. No receipt test is substituted for actual episode acceptance.

## Candidate artifact

Final local release-profile run: **106/106 Node tests passed, no skips; 3/3 optional converter Python tests and 7/7 Rust tests passed.** The default no-Python/no-Cargo run separately passed 98 tests with eight explicitly opted-in media/archive cases skipped. `git diff --check` passed.

Built locally with the safe builder into ignored `tmp/animal-conversations-candidate-0.16.0/`:

- Archive: `wiggly-animal-conversations-format-kit-0.16.0.zip`
- Bytes: **18,921,507**
- SHA-256: `4133202f1542a7019eab499dda7711be1473d0bf18d7a1e388b31bc28a9fea12`
- Inventory SHA-256: `9d65cf893cc6013f40c46fbaebb6afaf6ff239f7f53e22b1ad62cfa9995b78c0`
- 136 exact source files plus generated RELEASE-CONTENTS.json; extracted archive contents verified.
- Metadata explicitly says `acceptanceStatus: not-certified-by-packaging` and `publication: local-only`.

Fresh operator extraction: `/private/tmp/wiggly-fresh-acceptance.COGnI2`. It verified all inventory sizes/hashes, observed the expected missing-Sharp preinstall diagnosis, completed fresh `npm ci`, passed postinstall doctor and actual smoke, and passed default tests (106 total: 98 pass, 8 explicit profile skips, 0 fail). Fresh source intake and two playable approval drafts are in progress.

## Required work still not claimed complete

### Export QA follow-up: current candidate 0.16.1

Actual offline export-page QA caught a long-heading overflow at 390 px and Chrome opening the local MP4 rather than honoring its download attribute. The small repair wraps the heading and labels the link **Open video file**, with a note that the MP4 is already included. Wide/narrow, hostile-text, native MP4 and optional WAV playback checks pass; see EXPORT-PAGE-QA.md. These are presentation changes, not a new renderer or approval rule.

A new version preserves the immutable 0.16.0 candidate rather than overwriting it:

- Current ZIP: `tmp/animal-conversations-candidate-0.16.1/wiggly-animal-conversations-format-kit-0.16.1.zip`
- Bytes: **18,921,637**
- SHA-256: `0c4e8fcad2533aa05bc7c49454e18c4d65996d6793e1677c735c171833a5ea5b`
- Inventory SHA-256: `d3c1b03a6c036e4a6e31265a06408b0e961477140ee5191c4b24677053804a06`
- Final 0.16.1 release profile: 106/106 Node, 3/3 optional Python converter and 7/7 Rust tests pass.
- Fresh extraction/intake/review replay for 0.16.1 passed at `/private/tmp/wiggly-fresh-0161.ykivnk`. All 136 package sizes/hashes stayed unchanged. Fresh npm ci, doctor/check, default tests (98 pass/8 explicit skips) and 17/17 smoke passed. A new Python environment with verified cached public model files processed both real clips again; full soundtrack and transcript hashes match. All 38 newly generated review WAVs decode and verify. This was cached-model setup, not a cold download. Both real runs correctly stop at user approval. Reused agent drafts/evidence are never reused approval.

The isolated GitHub Actions workflow tests actual Linux x64 and Ubuntu inside WSL2 with read-only repository permissions, no production secrets, and small sanitized reports only. It tests fresh archives, all profiles, synthetic rendering/export mechanics and two actual CPU intakes with network isolation. It deliberately does not invent real script approval, fresh-agent interaction or perceptual playback.

### Actual platform follow-up

See PLATFORM-ACCEPTANCE.md for retained run/job evidence. Corrected run `33940070769` passed WSL2's full mechanics/setup/offline-intake scope. Diagnostic run `33940815264` then established that **both native Linux intakes also succeeded**; the failing command was the following normal-user `status` call. The harness had run intake as root inside the network namespace, leaving the Python helper's intentionally private `transcript.json` owned by root with mode 0600. The normal runner UID 1001 could not read it and correctly reported `intake-evidence-invalid` / EACCES.

The scoped repair is to preserve the original caller identity inside the isolated namespace. Do not loosen transcript permissions, alter package code, or call the failed status a successful check. The corrected identity must be verified by actual CI before platform mechanics are considered passed. Fresh host-agent approval/playback/export acceptance remains separate.

### Remaining acceptance

1. Explicit approval of the two newly generated episode reviews, followed by actual rendering and documented playback review plus verified exports.
2. Finish supported-system acceptance. The isolated CI Rust 1.89 correction already passed all converter tests on both platforms. WSL mechanics/offline intake passed; Linux needs the observed harness identity mismatch repaired and its status/evidence checks rerun. Neither CI substitutes for a fresh host-agent real-episode proof.
3. Final end-to-end acceptance of the packaged artifact, not just independent phase success.

Website promotion is deliberately separate. The existing public ZIP/catalog remain 0.15.1 while source development is 0.16.1. The public-page version/hash assertions must be updated together with a certified release during a separately scoped promotion; do not weaken them or merge this branch as though publication had already occurred.

## Bounded reviews

Correctness review found and repaired playback re-binding, stale contact sheets and untracked asset mapping changes, each with regression coverage.

Over-engineering review: **Lean already. Ship.** This is the ponytail complexity assessment only, not permission to skip the still-pending release acceptance. The implementation adds no alternate renderer, autonomous executor, global Python install or paid provider.
