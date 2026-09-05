# Animal Conversations — Feature delivery tracker

## Current checkpoint

- **Goal:** implement the approved first-run package workflow and verify the packaged result.
- **Status:** in progress — no updated release or completion claim.
- **Baseline:** kit 0.15.1; upstream Wiggly commit `356a1b06`.
- **Branch:** `feat/animal-conversations-first-run`.
- **Worktree:** `/Users/shaz/.codex/worktrees/e3ba/Meta-ads-builder-2/.goal-worktrees/animal-conversations-first-run`.
- **Source kit:** `v3/public/format-repositories/animal-conversations-v1`.
- **Current acceptance work:** AC6 and AC1 locally verified; integrating review, intake and quality/controller/export.
- **Next:** save clean A/B checkpoints, then complete the integrated media-to-delivery workflow and packaged acceptance.

## Planned versus delivered

| Feature | What is supposed to happen | What happened / evidence | Status |
|---|---|---|---|
| Complete agent workflow | Shared gates; accurate agent/user/operator next action; completion requires current evidence | Existing runner inspected; controller not implemented | Pending |
| Local extraction/transcription | Explicit isolated setup; supported URL or local file; agent drafts; no timestamps required; full soundtrack separate | CPU small.en dependency/model proof underway; prior MLX proof does not count | In progress |
| Playable protected approval | Exact audio + full creative choices; honest uncertainty; approval bound to content and audio | Existing review hash gaps identified; new page/approval not implemented | Pending |
| Reviewed verified delivery | Current technical/playback evidence, permitted limitations disclosed, safe verified export | Existing finalize lacks playback gate/export; no replacement implemented | Pending |
| Reliable setup | Node-only doctor works before installation; optional converter tools; pinned supported deps | 55/55 default tests with Python/Cargo unavailable; extracted-kit doctor test and actual Mac doctor pass; see PHASE-A-B-EVIDENCE.md | Implemented; final archive/platform proof pending |
| Resume/revisions/retry limits | Preserve history; locks/atomic persistence; 3 cycles per content+audio revision; unchanged reapproval never resets | Spec explicit; implementation pending | Pending |
| Pause checker | Count complete quiet interval crossing beat boundaries without changing animation or threshold | Seven regressions; false failure repaired; all 48 decoded frames + audio unchanged; see PHASE-A-B-EVIDENCE.md | Implemented and locally verified |
| Supported systems | Fresh-install/end-to-end proof on macOS ARM64, Linux x64 and WSL Linux tooling | Local macOS available; no Docker/Colima/Podman found; Linux/WSL execution route not yet available | Unverified |
| Safe reproducible packages | Allowlisted archive, hashes/versioning, safe HTML/metadata, no private media/env/cache | Unsafe broad ZIP exclusions confirmed; new builder pending | Pending |
| Legacy migration | Preserve historical run; new expanded approval/render/review evidence | Not implemented; lowest priority, not silently dropped | Pending |

## Acceptance ledger

| ID | Required proof | State |
|---|---|---|
| AC1 | Doctor before install; normal rendering/default tests without Cargo/Python | Local bootstrap/default-test proof passed; final archive proof pending |
| AC2 | Prepared offline intake; missing-model setup state; clear mocked URL failures | In progress |
| AC3 | Intake → draft import → review without init collision | Pending |
| AC4 | Original/render/ASR audio separation; complete ends and timestamp offsets | In progress |
| AC5 | file:// playable exact clips; safe HTML/embedded metadata | Pending |
| AC6 | Boundary-spanning pauses pass without media change; truly invalid pauses fail | Passed locally: regression and decoded-media parity proof |
| AC7 | Idempotent resume/review; approval preserved; locks; interrupted attempt identity | Pending |
| AC8 | Unchanged reapproval never resets budget; note-only retries rejected | Pending |
| AC9 | Relevant input/audio/output/renderer/policy changes invalidate correct receipts | Pending |
| AC10 | Missing approval, empty visual review and stale playback block finalization | Pending |
| AC11 | Export cannot bypass gates; interruption/modified export cannot report complete | Pending |
| AC12 | Historical upgrade preserved and fresh approval required | Pending |
| AC13 | Archive excludes private inputs, secrets, environments, model caches | Pending |
| E2E | Clean downloaded artifact, two different fresh-agent proofs, actual media review and verified export | Pending |
| Platforms | macOS ARM64 + Linux x64 + WSL using Linux binaries | Unverified |

## Evidence rules

Do not replace a pending row with “done” merely because code exists or tests use mocks. Record commands, results, relevant commits and media inspection scope. Keep unassessed perception explicit. Code completion, packaged proof, platform proof and public publication are distinct.

## Blockers / decisions

- The original tutorial worktree has a dangling Git metadata link. A new isolated worktree from current upstream main was created without repairing or changing the tutorial checkout.
- Linux/WSL acceptance needs a real supported execution environment; local unit tests cannot substitute for it.
- Candidate transcription versions/model must be tested before they are described as proven.

## Final report format

For every feature: **planned → implemented → verified → limitation/deviation → evidence**. Include exact kit version, archive checksum, proof media, branch/commits, and any unfulfilled acceptance criteria. Do not call the overall goal complete with required rows unfulfilled.
