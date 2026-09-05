# Animal Conversations — Feature delivery tracker

## Current checkpoint

- **Goal:** implement the approved first-run package workflow and verify the packaged result.
- **Status:** in progress — no updated release or completion claim.
- **Baseline:** kit 0.15.1; upstream Wiggly commit `356a1b06`.
- **Branch:** `feat/animal-conversations-first-run`.
- **Worktree:** `/Users/shaz/.codex/worktrees/e3ba/Meta-ads-builder-2/.goal-worktrees/animal-conversations-first-run`.
- **Source kit:** `v3/public/format-repositories/animal-conversations-v1`.
- **Current acceptance work:** A/B checkpoints pushed; 0.16.0 integrated controller, intake, protected review, quality and export are under final integration review.
- **Next:** finish integration checks, build an allowlisted candidate, then test a fresh extraction and two fresh-agent inputs. No platform or perception gaps will be marked passed.

## Planned versus delivered

| Feature | What is supposed to happen | What happened / evidence | Status |
|---|---|---|---|
| Complete agent workflow | Shared gates; accurate agent/user/operator next action; completion requires current evidence | Shared controller and CLI implemented; synthetic actual-render integration passes approval → interrupted render → inspection → required playback → verified export gates | Implemented; fresh-agent acceptance pending |
| Local extraction/transcription | Explicit isolated setup; supported URL or local file; agent drafts; no timestamps required; full soundtrack separate | Pinned CPU small.en and actual setup/helper processed two different >30s clips plus timestamp-offset fixture; mocked link/fallback checks; see ASR-PREFLIGHT.md | Implemented and locally verified; final archive/platform proof pending |
| Playable protected approval | Exact audio + full creative choices; honest uncertainty; approval bound to content and audio | Expanded review identity, protected explicit approval, exact full/beat WAVs; real offline file:// playback, narrow/wide layout and injection QA passed; see REVIEW-PAGE-QA.md | Implemented and browser-verified; fresh episode approval pending |
| Reviewed verified delivery | Current technical/playback evidence, permitted limitations disclosed, safe verified export | Technical/playback/finalization gates and safe export implemented; synthetic tests reject stale or missing evidence, fixture finalization and damaged exports | Implemented; real playback/export acceptance pending |
| Reliable setup | Node-only doctor works before installation; optional converter tools; pinned supported deps | 55/55 default tests with Python/Cargo unavailable; extracted-kit doctor test and actual Mac doctor pass; see PHASE-A-B-EVIDENCE.md | Implemented; final archive/platform proof pending |
| Resume/revisions/retry limits | Preserve history; locks/atomic persistence; 3 cycles per content+audio revision; unchanged reapproval never resets | Run locks, atomic state, preserved revision history, same-ID interrupted-cycle resume; real approval API test confirms unchanged reapproval cannot reset exhausted attempts | Implemented; final defensive review pending |
| Pause checker | Count complete quiet interval crossing beat boundaries without changing animation or threshold | Seven regressions; false failure repaired; all 48 decoded frames + audio unchanged; see PHASE-A-B-EVIDENCE.md | Implemented and locally verified |
| Supported systems | Fresh-install/end-to-end proof on macOS ARM64, Linux x64 and WSL Linux tooling | Local macOS available; no Docker/Colima/Podman found; Linux/WSL execution route not yet available | Unverified |
| Safe reproducible packages | Allowlisted archive, hashes/versioning, safe HTML/metadata, no private media/env/cache | Exact allowlist and pinned public example hashes; archive tests verify extracted bytes and reject private paths/symlinks/reused changed versions | Implemented; candidate build pending |
| Legacy migration | Preserve historical run; new expanded approval/render/review evidence | Upgrade copies input/audio into a new run, leaves original unchanged and requires new expanded approval; synthetic preservation test passes | Implemented and locally verified |

## Acceptance ledger

| ID | Required proof | State |
|---|---|---|
| AC1 | Doctor before install; normal rendering/default tests without Cargo/Python | Local bootstrap/default-test proof passed; final archive proof pending |
| AC2 | Prepared offline intake; missing-model setup state; clear mocked URL failures | Actual helper/offline inference and mocked error states passed; extracted artifact pending |
| AC3 | Intake → draft import → review without init collision | Synthetic controller-boundary test passed; fresh-agent archive proof pending |
| AC4 | Original/render/ASR audio separation; complete ends and timestamp offsets | Real two-input and +2.5s offset proof passed; no perceptual accuracy claim |
| AC5 | file:// playable exact clips; safe HTML/embedded metadata | Actual offline browser playback/layout/injection QA passed |
| AC6 | Boundary-spanning pauses pass without media change; truly invalid pauses fail | Passed locally: regression and decoded-media parity proof |
| AC7 | Idempotent resume/review; approval preserved; locks; interrupted attempt identity | Unit and actual synthetic-render integration passed |
| AC8 | Unchanged reapproval never resets budget; note-only retries rejected | Pure state and actual approval-command integration passed |
| AC9 | Relevant input/audio/output/renderer/policy changes invalidate correct receipts | Core tests passed; defensive identical-MP4/new-renderer playback check being strengthened |
| AC10 | Missing approval, empty visual review and stale playback block finalization | Synthetic receipt and integrated gate tests passed; not actual playback acceptance |
| AC11 | Export cannot bypass gates; interruption/modified export cannot report complete | Staging/integrity tests and actual synthetic-render controller flow passed |
| AC12 | Historical upgrade preserved and fresh approval required | Synthetic legacy-state copy/preservation test passed |
| AC13 | Archive excludes private inputs, secrets, environments, model caches | Exact selection/real ZIP fixture tests passed; actual candidate pending |
| E2E | Clean downloaded artifact, two different fresh-agent proofs, actual media review and verified export | Pending |
| Platforms | macOS ARM64 + Linux x64 + WSL using Linux binaries | Unverified |

## Evidence rules

Do not replace a pending row with “done” merely because code exists or tests use mocks. Record commands, results, relevant commits and media inspection scope. Keep unassessed perception explicit. Code completion, packaged proof, platform proof and public publication are distinct.

## Blockers / decisions

- The original tutorial worktree has a dangling Git metadata link. A new isolated worktree from current upstream main was created without repairing or changing the tutorial checkout.
- Linux/WSL acceptance needs a real supported execution environment; local unit tests cannot substitute for it.
- Real transcription is proven locally but inaccurate on some emotional/overlapping dialogue. The host agent must correct the draft and keep uncertainty visible; ASR never grants approval.

## Final report format

For every feature: **planned → implemented → verified → limitation/deviation → evidence**. Include exact kit version, archive checksum, proof media, branch/commits, and any unfulfilled acceptance criteria. Do not call the overall goal complete with required rows unfulfilled.
