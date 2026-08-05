# Squilliam News Wiggly Format Repo

This Repo turns a real promotion into a thirty-second breaking-news segment presented by a rigged Squilliam anchor. The studio, character, camera, presenter-derived gestures, desk collision behavior, real-mouth lip sync, screen layouts, and rendering pipeline are fixed. Promotion facts, story images, copy, timing labels, pronunciation overrides, and voice inputs are replaceable.

The two supplied proofs intentionally differ: We The Artists promotes an Indianapolis event with photographs, while Wiggly Format Lab promotes a software workflow with synthetic diagrams. Their results and the portability bug found by the second proof are recorded in `PROOF-REPORT.md` and `lessons.json`.

## Quick start

```bash
npm install
npm run smoke
npm run check
node runner.mjs init --run=my-promotion --from=we-the-artists
node runner.mjs validate --run=my-promotion
node runner.mjs render --run=my-promotion
node runner.mjs inspect --run=my-promotion
node runner.mjs finalize --run=my-promotion --human-review=pass
npm run package
```

If the run has no approved narration, copy `.env.example` to `.env.local`, supply the named Fish variables locally, validate first, obtain provider approval when required, and add `--approve-provider` to `render`.

## Fixed and replaceable boundaries

| Fixed Format mechanics | Replaceable promotion content |
| --- | --- |
| Three.js renderer and 1280×720 studio | Headline, location bug, ticker |
| Rigged anchor and real mouth bones | 65–112 word narration |
| Presenter-derived pose source | Pronunciation overrides and approved voice |
| Desk-safe arm retargeting | Poster and three story images |
| Ten monitor layouts and 30-second output | Slide copy, facts, CTA, sign-off |
| Render, inspect, and finalize gates | Run-local provenance and evidence |

## Run outputs

Each production lives under `agent-runs/<run-id>/`. Rendering never overwrites another run. Disposable PNG frames stay inside the run and are ignored by Git. A finalized run contains `final.mp4`, `contact-sheet.png`, `quality-report.json`, `finalization.json`, its exact `content.json`, and its asset provenance.

`npm run package` creates `downloads/wiggly-squilliam-news-format-kit.zip` plus a SHA-256 sidecar. The archive includes the runtime, contracts, fixed assets, smoke fixture, and tracked proof evidence. It excludes API secrets, dependencies, temporary frames, run state, and older downloads.

## Provider and rights boundary

API keys and private voice model IDs are environment values, never package data. The included character files were supplied by the user for this private proof. Review distribution rights before publishing a downloadable public kit; the runtime is designed so a compatible licensed character pack can replace the private pack as a whole.
