# Lego Music Video — standalone Repo

## Scope

A brand ad presented as a Lego music video. It is a separate Wiggly Repo from Brand Jingle, with its own downloadable package, guided workflow, costs, proof, and Discover page. Shared music-generation and rendering code remain shared; users do not operate Brand Jingle first. The operator has authorized the Lego name and brand assets. Do not imply a broader partnership or permission for unrelated third-party assets.

The existing implementation is the baseline: brand research → song/lyrics → three lyric-led miniature events in one coherent Lego world → full-quality reference and shot stills → animated shots → timed assembly → shared renderer with song and lyrics. Do not replace it with a static slideshow or generic video wrapper.

## Contracts before code

1. Instructions: one host-agent-authored workflow, with one short user question at a time; source-grounded ad claims and a coherent music-video idea.
2. Inputs: brand URL or brief, song direction, optional approved song and local media, authorized brand assets.
3. Fixed assets: shared renderer, local fonts, source-backed format references. Generated customer imagery is example evidence, not a universal input default.
4. Generated content: music, lyrics, world reference, three separate production stills, three animated shots. The agent authors research and story plans without a separate LLM service.
5. Composition: explicit contiguous shot timing derived from actual song duration; one consistent hero motif/world, three distinct events, lyric captions and brand identity.
6. Runtime: reuse the existing FFmpeg preparation and `AdRenderSurface`/Remotion path. No database, server, or Wiggly login required by the kit.
7. Audio: generated or supplied song; preserve actual media duration. Never fabricate caption timing or pretend ASR is human review.
8. Requirements: Node, FFmpeg/FFprobe, packaged Remotion dependencies; ElevenLabs for optional new music and Replicate for optional new stills/clips. No NIM requirement. Explicit approval before every paid batch; persisted prediction IDs and no blind retries.
9. Checks: missing/invalid assets and timing fail before spend; free actual-render smoke; attempt limits; hash-bound final inspection and honest audiovisual review; two distinct recovered inputs through the same runtime.
10. Output: final MP4, local inputs/scene, provenance, contact sheet, technical quality report, version, and review status.

## Current evidence and remaining work

- Existing production database contains completed three-shot sequences; recovery uses readonly queries only. Some source clip storage UUIDs match files in Downloads.
- `v3/scripts/recover-lego-music-video-evidence.mjs` recovers only completed music-video records into ignored local storage. It is not part of the consumer runtime.
- No paid test generations are authorized. Reuse existing media, test request contracts with mocks, and disclose that current provider execution is not freshly certified.
- Recovered seven completed silent stitched sequences. Two distinct songs/stories (cheesecake surprise and fresh-baked cookie tin) now have captioned local exports, made with their original media and the same standalone renderer. Both passed eight technical checks; neither has direct audiovisual creative approval.
- Implemented the standalone CLI, contracts, host-agent planning, optional BYOK stages, approval/budget gates, persisted prediction IDs, interrupted-output collection, attempt limits, validation/inspection/finalization and a free actual-render smoke.
- Added a separate rich Repo profile, two Discover cards on one Lego shelf, source media and a 62 MB self-contained ZIP. Brand Jingle remains audio-only and separate.
- The full test suite and typecheck pass. Desktop/mobile QA passed, including the real ZIP download hash and 1080 × 1920 video playback. In-app mobile captures were blank; the documented Playwright fallback provided inspectable screenshots.
- Blind consumer proof caught an undeclared Tailwind dependency. The corrected archive declares the exact dependency and setup checks resolve it. Isolated install/tests/check passed; its second render attempt hit host ENOSPC. Attempt state was preserved. CI now checks the actual ZIP with paid calls disabled; no media artifact upload is configured.
- CI run [33992486041](https://github.com/smsheik1/wiggly/actions/runs/33992486041) passed both the app build/all-page browser checks and the actual ZIP smoke plus second-input render on Linux. Both package renders passed all eight checks; the smoke reported zero paid calls.
- The final candidate additionally pins patched `ws` 8.21.0 and the bundler's `esbuild` 0.28.1, leaving Remotion 4.0.473 unchanged. A fresh consumer install and explicit audit reported zero vulnerabilities; tests/check passed and the earlier local attempt ledger stayed intact. These address [the ws advisory](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) and [the esbuild advisory](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr). Final candidate CI, deployment and production verification remain.
- Historical finished media may predate the current image/video model defaults. Record historical provider provenance accurately; do not relabel old examples as newly generated runs.

## Acceptance ledger

| Requirement | State |
| --- | --- |
| Two distinct existing music-video inputs recovered | Passed: two songs, hero objects and stories; same brand |
| Standalone runnable kit with host-agent planning | Implemented, packaged, contract-tested |
| Shared official render path | Two local exports passed eight technical checks |
| Paid approval and resumable job gates | Mock tests passed; no fresh paid end-to-end certification |
| Free actual-render package smoke | Passed on clean CI; final dependency-patched candidate being rechecked |
| Fresh-agent operation from artifact | Install/tests/check passed; renderer reached, then disk blocked |
| Standardized separate page and Discover listing | Local desktop/mobile/controls/download/playback passed |
| Production page and archive verification | Pending |

First successful isolated CI evidence: cookie fixture input `474f61bd73f13b34e8da34d9a398a781b1a910c5ab55b9c986a25b7f739eeee7`, output `842635829e1ca47beefa53f6b16361ba4f7bc352aaa72359b963ad7a9665b39d`; cheesecake input `aefebb36a3c934eaac4282e59e3b4d8c6c84f561e5d3fa7a3f5ca2223b0a730b`, output `30938a444e455f0dd7a32af45884f0cf6fdf796c1147e8b9c98c3b28241b5dea`. These are technical results, not audiovisual creative approvals. CI media was not uploaded as an artifact; local source exports and evidence remain reviewable.

## Proof limits and cleanup

No historical final captioned export was found: the examples are new local exports of recovered sources. Both stories advertise David's Cookies, so cross-brand creative generalization is not claimed. Section-based captions are not word-aligned. Product-shape continuity and sung intelligibility still need direct audiovisual review; metadata and contact sheets do not establish those qualities.

Only temporary failed-render bundles/public copies, repeated contract-test fixtures and this task's stopped Next.js dev cache were removed to recover disk space. Original media, completed MP4s, input hashes, quality reports and attempt ledgers remain intact. Removed intermediates are reproducible from those sources.
