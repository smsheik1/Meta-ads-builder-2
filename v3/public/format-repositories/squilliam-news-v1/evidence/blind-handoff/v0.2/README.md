# Blind-agent handoff — version 0.2

A fresh agent received only archive `49b8aed82350d6942e3db50754ab632f4025cf3caae78d97bf40d982b2d277a6` and the desired outcome: reproduce the packaged We The Artists thirty-second review through the official runtime, then stop at the human-review gate.

The agent installed the declared dependencies, ran smoke and requirement checks, initialized from the packaged example, validated, rendered, automatically inspected, and played the actual MP4 in packaged Chrome/Playwright. It used attempt 1 of 3, made zero provider calls, and did not change the renderer. It correctly did not run `finalize` or claim human approval.

The returned review video and contact sheet are byte-for-byte identical to:

- `../../../examples/we-the-artists/evidence/review.mp4`
- `../../../examples/we-the-artists/evidence/contact-sheet.png`

They are not stored twice. `handoff-receipt.json`, `state.json`, `validation.json`, and `quality-report.json` preserve the archive identity, gates, attempt, hashes, and inspection result. Historical v0.1 blind evidence is retained under `../history/v0.1/`.

Observed friction: the Mac GUI was locked, so QuickTime could not be used. The packaged Playwright/Chrome dependency successfully loaded and advanced the actual video and allowed nine sampled playback frames to be inspected. This required no fallback renderer or package change.
