# Animal Conversations — Repo handoff

**Implementation checkpoint: 0.16.2. Not a fully accepted or published release.**

The repo changes are built and pushed. Video examples were verification fixtures—not additional tutorial-production deliverables. Further clip polishing is stopped. The remaining release-acceptance gaps are listed below, not silently waived.

## What changed

| Feature | Intended result | Delivered and verified | Remaining limitation |
|---|---|---|---|
| 1. Guided agent workflow | One intake → draft → approval → render → review → export loop | Shared controller, explicit next-action owner, required gates; synthetic integration plus one real completed episode | Full latest-candidate fresh-agent acceptance remains unfinished |
| 2. Local audio intake | Accessible link/file → preserved soundtrack + agent-authored timed draft | Locked CPU transcription, local-file fallback, two real offline intakes on Linux/WSL; separate full-resolution render audio | ASR can miss crying/overlap; supported accessible links only |
| 3. Protected approval | User approves the actual complete script and audio | Exact review media, role sheet, content/audio-bound approval, visible uncertainty; genuine We Listen approval recorded | Mistake is not approved; ASR is not diarization or approval |
| 4. Reviewed export | No “complete” until required evidence and exported files verify | Stale/missing review rejection, sanitized staged export, checksums; real We Listen export verified | Visual playback was user-reported; two permitted auditory criteria unscored |
| 5. Easier setup | Diagnose before installing; no Python/Cargo for prepared rendering | Node-only doctor, explicit kit-local setup, executable overrides and pinned optional dependencies; fresh-install checks passed | Mac reused public dependency/model caches; no native Windows support |
| 6. Resume and retry protection | Resume safely; three cycles per content-and-audio revision | Atomic state/run locks, interruption recovery, freshness checks; unchanged reapproval/note-only edits cannot reset attempts | Actual host must resume; no background model runtime was added |
| 7. Pause-check fix | Recognize valid pauses across beat boundaries | Seven regressions plus identical decoded frames/audio; thresholds and animation preserved | Independent patch was not published |
| 8. Platform verification | macOS ARM64/Linux x64; WSL with Linux tools | Mac fresh checks; actual Linux and WSL setup, smoke, full profiles, offline intake and ownership checks passed | Latest-candidate fresh-agent media-to-delivery runs still unproven on Mac/Linux |
| 9. Safe packages | Versioned, reproducible archives without private files | 0.16.2 allowlist, inventory/checksums, exclusion and immutability checks | Public stable download/catalog remains 0.15.1 |
| 10. Old-run migration | Preserve historical runs; require fresh expanded approval | Copy-preserving upgrade and approval/receipt tests | Tested with fixtures; no claim of real old-run migration proof |

The official renderer, packaged characters/backgrounds, camera grammar, caption renderer, deterministic animation, schema-1 timing tolerance and provider-free default remain intact. No AI image/video/voice provider or dedicated-GPU requirement was introduced.

## Checks actually completed

- 0.16.2 Node release profiles: **106 passed, zero skipped/failed**. Default profile: **98 passed, 8 explicit optional skips**.
- Fresh Mac archive: doctor, explicit dependency install, asset check, 17-gate smoke, inventory verification and 3 Python converter tests passed.
- Actual [Linux/WSL CI run 33967706772](https://github.com/smsheik1/wiggly/actions/runs/33967706772): terminal success; each passed 106 Node, 3 Python and 7 Rust tests, setup and two network-isolated local intakes. These are mechanics/intake checks—not claimed perceptual review.
- Real **We Listen, kit 0.16.1**: user-approved script, first-cycle render, **17/17 technical gates**, user-reported visual review and verified export. No rerender was needed after review.
- Its MP4: [finished example](../../tmp/verified-deliveries/we-listen-0.16.1-20260905/final.mp4). SHA-256: `9279f4dcf888b85440b2fb41619ed15798a7af7e2715ffca9b067c022972d356`.
- Review limitation: Codex inspected sampled frames and technical audio. Full visual playback was attributed to the user's feedback; audio intelligibility and perceived synchronization were left unscored, not invented.

## What is not done

1. **Full release acceptance:** the plan requires documented fresh-agent runs on macOS ARM64 and Linux x64, plus WSL verification using Linux binaries. Existing platform CI does not replace the missing fresh-agent media-to-delivery evidence. The 0.16.1 real episode is not relabeled as a 0.16.2 proof.
2. **Second-input proof:** the builder standard calls for two meaningfully different inputs. Mistake was the chosen second fixture; crying/reassurance are identified, but overlap, one pause and complete-script approval remain unresolved. This is not a requirement to produce or polish another marketing video.
3. **Publishing/release sequence:** no PR merge or public release occurred. Work is preserved as scoped commits on one branch rather than the plan's separate-PR sequence. Website publication remains separate.

No remaining gate was removed to label the overall goal complete. Resume acceptance from the saved checkpoint only with the missing source evidence/approval and suitable review capability; do not restart or polish We Listen.

## Files and rollback checkpoint

- Branch: `feat/animal-conversations-first-run`; source/test checkpoint `ff998959`, subsequent evidence commits through `ae064509` before this handoff.
- Source: `v3/public/format-repositories/animal-conversations-v1`.
- [0.16.2 candidate ZIP](../../tmp/animal-conversations-candidate-0.16.2/wiggly-animal-conversations-format-kit-0.16.2.zip), **18,922,042 bytes**.
- Candidate SHA-256, rechecked at handoff: `0762a04c20c8229d98427a158debf09063512c65bb54c95a90e28f24ce56565d`.
- [Detailed feature/evidence tracker and resumable review IDs](PROGRESS.md).
- [Exact candidate/platform evidence](CHORUS-IMPORT-FIX.md).

**Bottom line:** implementation is available now; full release certification is still incomplete. This handoff does not shrink the original goal or claim the outstanding acceptance has passed.
