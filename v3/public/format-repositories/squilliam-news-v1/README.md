# Squilliam News Wiggly Format Repo

This Repo turns a real promotion into a thirty-second breaking-news segment in the Squilliam News format. One official renderer drives a verified character pack, presenter-derived gestures, desk collision behavior, real-bone lip sync, the studio camera, screen layouts, and export. Promotion facts, story images, copy, timing labels, pronunciation overrides, voice inputs, and the verified `characterId` are replaceable.

The verified presenter roster is `squilliam` (default), `squidward`, `spongebob`, and `mr-krabs`. Put one of those IDs in `content.json`. See `CHARACTER-AUDIT.md` for the downloaded models that were deliberately left out after render QA.

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

If the run has no approved narration, copy `.env.example` to `.env.local`, supply the named Fish variables locally, validate first, obtain provider approval when required, and add `--approve-provider` to `render`. Fish variables may appear as unconfigured during `check`; they are optional when the selected example already includes `audio.wav`.

## Fixed and replaceable boundaries

| Fixed Format mechanics | Replaceable promotion content |
| --- | --- |
| Three.js renderer and 1280×720 studio | Headline, location bug, ticker |
| Character-pack contract and rig retargeting | Verified `characterId` |
| Calibrated real mouth/jaw bones | 65–112 word narration |
| Presenter-derived pose source | Pronunciation overrides and approved voice |
| Desk-safe arm retargeting | Poster and three story images |
| Ten monitor layouts and 30-second output | Slide copy, facts, CTA, sign-off |
| Render, inspect, and finalize gates | Run-local provenance and evidence |

## Run outputs

Each production lives under `agent-runs/<run-id>/`. Rendering never overwrites another run. Disposable PNG frames stay inside the run and are ignored by Git. A finalized run contains `final.mp4`, `contact-sheet.png`, `quality-report.json`, `finalization.json`, its exact `content.json`, and its asset provenance.

The runner prints absolute paths for playable video and contact-sheet output. An operating agent should open those with the host environment's normal media/image viewer; the Repo deliberately does not ship a second preview renderer.

`npm run package` creates `downloads/wiggly-squilliam-news-format-kit.zip` plus a SHA-256 sidecar. The archive includes the runtime, contracts, fixed assets, smoke fixture, and tracked proof evidence. It excludes API secrets, dependencies, temporary frames, run state, and older downloads.

## Provider and rights boundary

API keys and private voice model IDs are environment values, never package data. The included character files were supplied by the user for this private proof. Review distribution rights before publishing a downloadable public kit. Adding another character requires an entire registered pack plus render QA; it must not create another renderer.
