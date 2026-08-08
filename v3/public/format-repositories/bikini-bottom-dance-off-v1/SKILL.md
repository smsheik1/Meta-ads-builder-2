---
name: bikini-bottom-dance-off
description: "Create a replayable 47-second vertical four-character dance-off from a local song using the verified Character Dance Lab renderer."
---

# Bikini Bottom Dance Off

1. Run `npm run check` and the free `npm run smoke` before a real run.
2. Initialize with `node runner.mjs init --run=<id> --song=/absolute/path/to/song.mp3`.
3. Run `npm run list-motions`. Choose `motionId`, `finaleMotionId`, and `reactionMotionId` independently for each character in the run's `input.json`. Finale motions must be at least nine seconds. Do not change the runtime to change choreography.
4. If the desired motion is absent, have the operator download one Mixamo Collada file with skin and run `node runner.mjs import-motion`. The frozen 25 starters stay untouched; imports go to the separate extensible `user-motions/` library. Do not automate Mixamo's private browser endpoints or package the source DAE.
5. Review the detected excerpt and the complete input, then run `validate`. Report its exact `motionSelections` and `providerPlan` before any provider call.
6. If Fish clips are missing, confirm `FISH_STUDIO_APIKEY` and the private `SQUILLIAM_VOICE_ID` without printing them, show the eight-line script and current estimate, obtain approval, then run `render --approve-provider`. Accepted dialogue is cached. Do not replace the Character Dance Lab renderer or retargeter.
7. Run `inspect` and watch the MP4. Confirm countdown beeps have no song underneath, opening and taunts use the assigned voices, all four voices begin the closing line together without music, the song plays only during dances, every solo lasts at least five seconds, every finale motion covers the full nine seconds without a hold or clip loop, selected reaction motions keep speakers and waiting characters alive, captions stay in their reserved lane below the cast, the closing bridge joins the opening countdown, and eyes, Reel-safe framing, captions, and CTA remain sound.
8. Read `eval-report.md` with the person. It must show measured automatic evidence, a pending human section, and no invented final grade before approval.
9. Finalize only with `--human-review=pass` after a person approves the rendered proof. Return the generated `final.mp4`, `eval-report.md`, and `delivery.json` to the user; do not stop at a local path or a raw pass/fail summary.

Keep operator-supplied songs and generated dialogue inside ignored run folders. Never package API keys or the private Squilliam clone ID.
