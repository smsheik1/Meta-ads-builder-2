# Chorus draft instructions — candidate 0.16.2

Status: scoped instruction/test correction verified from a fresh Mac archive and actual Linux/WSL platform mechanics/setup/offline-intake checks. Not complete fresh-agent real-episode release acceptance.

## Observed problem and fix

During the user's opening-line correction, the actual 0.16.1 importer required nonempty `overlapEvidence` on a `speaker=both` draft. The input contract incorrectly described that field as writable only by `approve-script`. Following that wording literally could prevent an agent from importing a correctly identified chorus.

- The contract and canonical skill now explicitly describe evidence-backed draft import. Draft overlap evidence is not a review confirmation or user approval.
- Approval still requires the separate review evidence, explicit overlap confirmation, and the complete displayed-review approval. No gate or runtime implementation changed.
- The skill also describes preserving valid observations when changed draft content regenerates review evidence. Never copy approval fields, fingerprints, review IDs, or receipts.
- The existing intake/import integration test now covers missing-overlap rejection before input replacement, successful chorus import, correct caption ownership, pending review fields, and continued refusal to render without approval. Its labels and audio are synthetic test data, not human/perceptual proof.

## Exact candidate

- Version: **0.16.2**.
- ZIP: `tmp/animal-conversations-candidate-0.16.2/wiggly-animal-conversations-format-kit-0.16.2.zip`.
- Bytes: `18922042`.
- SHA-256: `0762a04c20c8229d98427a158debf09063512c65bb54c95a90e28f24ce56565d`.
- Inventory SHA-256: `758efbb4943c722008247e48f55ae3c7564d47a5d58074283048435d7fe4b9fa`.
- 136 allowlisted files plus generated inventory. Archive build/extraction integrity passed.
- Seven changed release files compared with 0.16.1: SKILL, input contract, existing workflow test, and the four version-declaration files. All other 129 listed files are byte-identical, including every runtime implementation, renderer, asset, quality policy and intake tool.
- Dependency lock is identical after normalizing only the kit's top-level/root-package version. No dependency or model change.
- Original 0.16.1 ZIP rechecked unchanged: `0c4e8fcad2533aa05bc7c49454e18c4d65996d6793e1677c735c171833a5ea5b`.
- Public stable download/catalog remain **0.15.1**, untouched.

## Actual local verification

Fresh archive extraction: `/private/tmp/wiggly-fresh-0162.9Gl3J7`.

1. Preinstall doctor returned `setup-required`, identifying only missing kit-local Sharp. The first external verification assertion used the wrong expected label (`missing` instead of the existing `missing-or-unusable`); it stopped before installation. Correcting that assertion, without changing the package, verified the actual result.
2. Explicit `npm ci --offline --cache /private/tmp/wiggly-animal-conversations-npm-cache` installed nine packages. This reused the public npm cache; it is not a cold-download claim. Postinstall doctor passed.
3. Source and fresh-artifact default tests: **106 total, 98 passed, 8 explicit release-profile skips, zero failures**.
4. Source and fresh-artifact all-Node release profiles: **106 passed, zero skips/failures**. These include actual synthetic render/review/export and archive mechanics; they do not establish real human approval or perception.
5. Focused workflow media profile: **5/5 passed**, including the expanded chorus import regression.
6. Fresh asset check passed. Fresh mechanics smoke `fresh-0162-macos-smoke-20260905` passed **17/17 technical gates**, using the official renderer; no episode was finalized or exported.
7. Every fresh inventory size/hash rechecked after operation: **136/136 unchanged**.
8. `git diff --check` passed. Ponytail complexity review: **Lean already. Ship.** This is only the complexity assessment, not a release-completion claim.

No new frontend/layout code changed; no browser workaround or additional UI/perceptual claim was made. The three Python-dependent converter tests additionally passed in the fresh Mac extraction using the existing explicit Python 3.12 executable. Rust was not rerun locally because Cargo is absent from the normal PATH; its seven tests passed in both actual platform jobs below.

## Actual Linux and WSL verification

[Run 33967706772](https://github.com/smsheik1/wiggly/actions/runs/33967706772), commit `ff9989591b5d67e76f843734829a5e0389b0c6c7`, completed **success** on 2026-09-05, 13:01:49–13:09:34 UTC.

| Evidence | Linux x64 | Actual Ubuntu in WSL2 x64 |
|---|---|---|
| Job | `101310632683` | `101310632552` |
| Terminal result | Success | Success |
| Kernel | `6.17.0-1022-azure` | `6.18.33.2-microsoft-standard-WSL2` |
| Default profile | 98 pass, 8 explicit skips | 98 pass, 8 explicit skips |
| Explicit profiles | 106 Node + 3 Python-dependent converter + 7 Rust pass | 106 Node + 3 Python-dependent converter + 7 Rust pass |
| Caller / transcript ownership | UID:GID 1001:1001; mode 0600 | UID:GID 0:0; mode 0600 |
| Explicit setup + two real offline intakes | Pass | Pass |
| Both subsequent status checks | `needs-script-draft` | `needs-script-draft` |

Both summaries identify **0.16.2** and inventory hash `758efbb4943c722008247e48f55ae3c7564d47a5d58074283048435d7fe4b9fa`. Both verify fresh installation, exact release inventory, the synthetic smoke and intake with the OS network namespace disconnected after explicit setup. Four transcript stat records per platform independently show caller ownership and mode 0600.

The two real inputs remain the pinned distributable source clips: 31.137959s and 30.023401s. Both use the pinned small.en revision, CPU/int8 and declared English settings. No script approval, fresh host-agent interaction, perceptual review or real-episode delivery was fabricated. All jobs are terminal; no rerun is needed.

## Remaining acceptance

- Existing real reviews stay in the original fresh 0.16.1 workspace; no files or approvals were silently migrated. We Listen's opening correction is recorded in PROGRESS.md. Its remaining pause and Mistake's reaction/pause questions still require honest resolution and complete-review approval.
- Candidate 0.16.2 has not yet completed fresh host-agent real-episode rendering, actual playback assessment and verified export. Previous 0.16.1 platform evidence is not relabeled as a 0.16.2 run.
- Linux/WSL candidate mechanics/setup/intake checks are now complete as recorded above; they do not replace the pending host-agent approval/playback/export proof.
