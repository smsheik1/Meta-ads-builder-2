# Chorus draft instructions — candidate 0.16.2

Status: scoped instruction/test correction verified locally from a fresh archive. Not complete real-episode or supported-platform release acceptance.

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

No new frontend/layout code changed; no browser workaround or additional UI/perceptual claim was made. The optional Python/Rust converter profile was not rerun locally for this instruction-only change; its implementation/locks remain byte-identical to the previously tested candidate.

## Remaining acceptance

- Existing real reviews stay in the original fresh 0.16.1 workspace; no files or approvals were silently migrated. We Listen's opening correction is recorded in PROGRESS.md. Its remaining pause and Mistake's reaction/pause questions still require honest resolution and complete-review approval.
- Candidate 0.16.2 has not yet completed fresh host-agent real-episode rendering, actual playback assessment and verified export. Previous 0.16.1 platform evidence is not relabeled as a 0.16.2 run.
- Linux/WSL candidate checks follow the existing push-triggered acceptance workflow. Record the actual run and outcome after dispatch; never infer success from the previous version.
