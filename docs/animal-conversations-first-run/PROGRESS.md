# Animal Conversations — Feature delivery tracker

## Current checkpoint

- **Goal:** implement the approved first-run package workflow and verify the packaged result.
- **Status:** implementation delivered on a pushed development branch; required real-episode and platform acceptance is still open. Not a certified public release.
- **Baseline:** kit 0.15.1; upstream Wiggly commit `356a1b06`.
- **Branch:** `feat/animal-conversations-first-run`.
- **Worktree:** `/Users/shaz/.codex/worktrees/e3ba/Meta-ads-builder-2/.goal-worktrees/animal-conversations-first-run`.
- **Source kit:** `v3/public/format-repositories/animal-conversations-v1`.
- **Current candidate:** 0.16.1, source checkpoint `c62e02b4ce590b5b371786e0404a87a829060571`; public ZIP/catalog intentionally remain 0.15.1.
- **Current acceptance work:** full local release profile passed (106 Node + 3 Python + 7 Rust); fresh 0.16.1 Mac extraction/setup, smoke and two real intakes passed. Both real episodes correctly stop at user approval.
- **Next:** obtain real review corrections/approval, repair the now-diagnosed CI user-identity mismatch and rerun its Linux status checks, then render/review/export the real episodes and complete fresh-agent supported-system acceptance. CI's compiler mismatch is repaired; WSL mechanics and both offline intakes passed. Never use synthetic approval/playback attestations as evidence for real episodes.

## Planned versus delivered

| Feature | What is supposed to happen | What happened / evidence | Status |
|---|---|---|---|
| Complete agent workflow | Shared gates; accurate agent/user/operator next action; completion requires current evidence | Shared controller and CLI enforce the episode loop. Actual synthetic-render integration passes approval → interrupted render → inspection → required playback → verified export. Fresh host-agent operation reached two real reviews without user-written timestamps | Implemented/tested; real approval → delivery acceptance pending |
| Local extraction/transcription | Explicit isolated setup; supported accessible URL or local file; agent drafts; no user-authored timestamps required; full soundtrack separate | Pinned CPU small.en; actual setup/helper processed two different >30s clips and an offset fixture. Fresh 0.16.1 extraction reproduced both audio/transcript hashes. Full PCM24 soundtrack stays separate from ASR derivative; URL failure/local-file fallback paths tested | Verified on Mac with cached public model files; cross-platform intake pending. ASR is imperfect and not diarization |
| Playable protected approval | Exact audio + full creative choices; honest uncertainty; explicit approval bound to content/audio/displayed evidence | Exact full/beat WAVs, review IDs and protected approval implemented. Synthetic offline browser playback/layout/injection QA passed. All 38 real-review WAVs verify/decode; real uncertainty stays visible | Implemented/tested; user listening/corrections/approval pending. Real review browser access was security-blocked, with no workaround attempted |
| Reviewed verified delivery | Current technical/playback evidence, permitted limitations disclosed, safe verified export | Required checks fail closed; stale or missing receipts, empty visual review and fixture finalization rejected. Export is staged/hash-verified, excludes private inputs by default and detects later damage. Synthetic exported-page native video/WAV and mobile layout QA passed | Implemented/tested; neither real episode has approved rendering/playback/export yet |
| Reliable setup | Node-only doctor before installation; normal rendering without Python/Cargo; pinned optional intake/converter dependencies | Fresh extracted Mac doctor correctly identified only missing Sharp before npm ci; doctor/check passed afterward. Default suite: 98 pass, 8 opt-in skips with Python/Cargo unavailable. Actual isolated Python/model setup passed | Fresh Mac setup passed using caches. Linux and WSL setup/full test profiles passed after isolated CI Rust correction; see platform evidence |
| Resume/revisions/retry limits | Preserve history; locks/atomic persistence; 3 cycles per content+audio revision; unchanged reapproval never resets | Actual approval API regression proves reapproval and note-only changes cannot reset exhausted attempts. Interrupted cycles reuse their ID; unchanged failed retries stop; source/asset mapping/renderer/policy/output changes invalidate relevant evidence; modern runs cannot misuse legacy upgrade | Implemented; defensive and actual synthetic-render integration tests passed |
| Pause checker | Count complete quiet interval crossing beat boundaries without changing animation or threshold | Seven regressions; false failure repaired; all 48 decoded frames + audio unchanged; see PHASE-A-B-EVIDENCE.md | Implemented and locally verified |
| Supported systems | Fresh-install/end-to-end proof on macOS ARM64, Linux x64 and WSL Linux tooling | Mac artifact proof passed through real review. WSL2 passed fresh archive/setup, all profiles, smoke and both offline intakes. Diagnostic run 33940815264 proves both Linux intakes also succeeded; subsequent non-root status failed because CI created a private root-owned transcript during root intake | Partial, not full fresh-agent/perceptual acceptance. Correct CI identity and verify status; preserve private permissions and package code |
| Safe reproducible packages | Allowlisted archive, hashes/versioning, safe HTML/metadata, no private media/env/cache | 0.16.1 ZIP contains 136 allowlisted files + inventory; exact extraction sizes/hashes verified before/after fresh operation. Deterministic rebuild, privacy/symlink exclusions and immutable version checks pass. Public stable ZIP untouched | Candidate built/verified; intentionally not published or acceptance-certified |
| Legacy migration | Preserve historical run; new expanded approval/render/review evidence | Upgrade copies input/audio into a new run, leaves original unchanged and requires new expanded approval; synthetic preservation test passes | Implemented and locally verified |

## Acceptance ledger

| ID | Required proof | State |
|---|---|---|
| AC1 | Doctor before install; normal rendering/default tests without Cargo/Python | Passed on fresh 0.16.1 Mac archive; optional tools absent in default profile |
| AC2 | Prepared offline intake; missing-model setup state; clear mocked URL failures | Passed: local inference/setup/error tests and both actual OS-network-disabled intakes on WSL and Linux. The separate Linux status permission mismatch is a CI identity defect |
| AC3 | Intake → draft import → review without init collision | Passed on fresh archive for both real agent-authored drafts; no inherited approval |
| AC4 | Original/render/ASR audio separation; complete ends and timestamp offsets | Real two-input and +2.5s offset proof passed; no perceptual accuracy claim |
| AC5 | file:// playable exact clips; safe HTML/embedded metadata | Synthetic offline browser playback/layout/injection QA passed; all 38 real WAVs verify/decode. Real pages require user-controlled playback after browser security restriction |
| AC6 | Boundary-spanning pauses pass without media change; truly invalid pauses fail | Passed locally: regression and decoded-media parity proof |
| AC7 | Idempotent resume/review; approval preserved; locks; interrupted attempt identity | Unit and actual synthetic-render integration passed |
| AC8 | Unchanged reapproval never resets budget; note-only retries rejected | Pure state and actual approval-command integration passed |
| AC9 | Relevant input/audio/output/renderer/policy changes invalidate correct receipts | Passed, including identical MP4/new renderer, stale contact sheet and changed asset mapping regressions |
| AC10 | Missing approval, empty visual review and stale playback block finalization | Synthetic receipt and integrated gate tests passed; not actual playback acceptance |
| AC11 | Export cannot bypass gates; interruption/modified export cannot report complete | Staging/integrity tests and actual synthetic-render controller flow passed |
| AC12 | Historical upgrade preserved and fresh approval required | Synthetic legacy-state copy/preservation test passed |
| AC13 | Archive excludes private inputs, secrets, environments, model caches | Actual 0.16.1 candidate inventory and fresh extracted-file verification passed |
| E2E | Clean downloaded artifact, two different fresh-agent proofs, actual media review and verified export | Fresh Mac artifact/intake/drafts passed; both real episodes await user approval, then rendering + genuine playback + export |
| Platforms | macOS ARM64 + Linux x64 + WSL using Linux binaries | Mac partial acceptance; WSL mechanics/intake passed; Linux profiles/smoke/setup/intakes passed but normal-user status could not read CI's root-owned private transcript. Consistent-user rerun pending. CI is not fresh host-agent/perceptual acceptance |

## Evidence rules

Do not replace a pending row with “done” merely because code exists or tests use mocks. Record commands, results, relevant commits and media inspection scope. Keep unassessed perception explicit. Code completion, packaged proof, platform proof and public publication are distinct.

## Blockers / decisions

- The original tutorial worktree has a dangling Git metadata link. A new isolated worktree from current upstream main was created without repairing or changing the tutorial checkout.
- Linux/WSL environments now exist in isolated read-only GitHub Actions. Initial run `33939590840` exposed Rust 1.85 being too old for the locked converter dependency. Commit `aa44f461` pins/checksums an isolated official Rust 1.89 toolchain without changing the kit. Corrected run `33940070769` passed WSL; Linux failed within the combined offline-intake/status stage. Its structured failure was redirected to unretained scratch, leaving the cause unknown at that checkpoint. The following diagnostic correction preserved the exact failure without weakening a required check.
- Diagnostic commit `62500dd4`, run `33940815264`, resolved that uncertainty: both native Linux intakes returned `needs-script-draft` / exit 0; `status-one` returned EACCES / `intake-evidence-invalid`. Caller UID/GID 1001 contrasted with transcript owner 0:0/mode 0600. The Python helper publishes its atomic temporary file privately by design. Correct the harness's elevated-intake/non-elevated-status identity switch; do not change file privacy or the package.
- Real transcription is proven locally but inaccurate on some emotional/overlapping dialogue. The host agent must correct the draft and keep uncertainty visible; ASR never grants approval.
- Two user review questions have been sent. Approvals from earlier tutorial episodes do not approve these newly generated review IDs. Unknown speaker/overlap evidence must be resolved honestly, not filled by an approval timestamp.
- Required visual playback cannot be replaced by contact sheets, media counters, mocked attestations or a disclaimer. Missing required review remains a blocker.
- Public catalog/download and their existing version/hash tests intentionally remain at 0.15.1. No PR merge or promotion should pretend the new source is already the certified public package.
- Delivery sequencing differs from the plan's separate-PR outline: work is currently preserved as scoped commits on one isolated development branch. The pause hotfix is an independent commit, not a separately published patch. No PRs, merges, public patch or integrated feature release have been claimed or performed.
- The runtime verifies artifacts and required recorded attestations. It does not authenticate a chat participant, prove that a human/agent perceived media, prevent an unrestricted agent editing files, or continue after its host stops.
- Schema-1's 20 ms timing compatibility and legacy `cat` identity remain unchanged. New authoring guidance/tests cover separate reactions, delayed questions, elongated delivery and exact handoffs; word-aligned caption rendering and native Windows remain deferred as planned.

## Exact candidate and resumable real proofs

- ZIP: `tmp/animal-conversations-candidate-0.16.1/wiggly-animal-conversations-format-kit-0.16.1.zip`
- SHA-256: `0c4e8fcad2533aa05bc7c49454e18c4d65996d6793e1677c735c171833a5ea5b`; 18,921,637 bytes.
- Fresh extracted kit: `/private/tmp/wiggly-fresh-0161.ykivnk`; report: `acceptance-evidence/FRESH-ACCEPTANCE-0161.md`.
- We Listen: `fresh-0161-we-listen-20260904`, 16 beats, living room, 31.137959s. Review ID `ac0b93474534d1d13526613cb3924916a52580a5d443437d73efb0299fc8d05e`.
- Mistake: `fresh-0161-mistake-20260904`, 20 beats, backyard, 30.023401s. Review ID `fea5365cc1fbaa4958f6a54b995fec65751cf2851b67a5e4e0c5598e787c73cc`.
- Both runs are `needs-script-approval`, owner user. Neither contains real approval, final MP4, playback receipt or delivery. Recheck current hashes/status before resuming. Reused drafts/evidence are not reused approval.
- Supporting checked-in evidence: PHASE-A-B-EVIDENCE.md, ASR-PREFLIGHT.md, PHASE-C-EVIDENCE.md, REVIEW-PAGE-QA.md and EXPORT-PAGE-QA.md. Private media/review artifacts are intentionally not committed.

## Final report format

For every feature: **planned → implemented → verified → limitation/deviation → evidence**. Include exact kit version, archive checksum, proof media, branch/commits, and any unfulfilled acceptance criteria. Do not call the overall goal complete with required rows unfulfilled.
