# Bikini Bottom Dance Off

A 47-second 9:16 Format that turns one song excerpt and twelve user-selected motion assignments into a four-way character dance battle. The Reel opens on a silent-song 3–2–1 countdown over dimmed character panels, then alternates spoken character roasts with solos lasting at least five seconds: each incoming challenger taunts the dancer immediately before them and takes over. Captions use a dedicated lane below the character grid instead of covering the cast. All four return for a nine-second group showcase, then say the comment prompt together in time-matched voices while using their selected reaction motions. The closing vote prompt hands back to the matching dimmed-character countdown so the Reel loops without a visible cut.

This Repo sequences character clips; it does not own another character renderer. SpongeBob, Patrick, Mr. Krabs, and Squilliam are rendered by the existing Character Dance Lab runtime, including its protected faces, grounding, and Squilliam paired-leg profile.

```bash
npm run check
npm run smoke
npm run list-motions
node runner.mjs init --run=wiggle-proof --song=/absolute/path/to/song.mp3
node runner.mjs validate --run=wiggle-proof
node runner.mjs render --run=wiggle-proof --approve-provider
node runner.mjs inspect --run=wiggle-proof
node runner.mjs finalize --run=wiggle-proof --human-review=pass
```

`npm run check` verifies both the Dance Off contracts and the bundled character-motion foundation, including an isolated local `import-motion` round trip.

Every character chooses three motion IDs in `input.json`: `motionId` for the solo, `finaleMotionId` for the uninterrupted group showcase, and `reactionMotionId` for dialogue and the closing CTA. The bundled `assets/motions/manifest.json` is a frozen 25-motion starter library. To add motion 26 or 260 without changing that foundation, download one Collada file with skin from Mixamo and import it into the separate ignored `user-motions/` library:

```bash
node runner.mjs import-motion --source=/absolute/path/to/Motion.dae --id=my-motion --label="My Motion"
```

Mixamo is not called during validation or rendering. The local source DAE is never copied into the Repo. `content-boundary.json` is the machine-readable decision record for what ships, what remains an episode input, and what may call an external provider.

Choose the outer canvas with `outerBackground` in `input.json`. The Fish News flower-and-bubble set inside every character panel remains fixed.

| `outerBackground` | Look |
|---|---|
| `deep-ocean` | Midnight underwater studio with subtle rays and bubbles; default |
| `retro-tv` | Aged brass-and-teal underwater television |
| `dance-club` | Indigo club with cyan and magenta spotlights |
| `control-room` | Teal metal porthole and restrained rivets |

`inspect` writes both `eval-report.json` and a readable `eval-report.md`. The 100-point score is 70 points of measured technical checks and 30 points of explicit human review. Before a person watches the video, the grade stays pending and reports the automatic percentage separately. `finalize --human-review=pass` creates `final.mp4`, the final A-F grade, and `delivery.json`, then prints all three paths as one return-ready bundle.

The supplied song is copied into the local run folder and remains untracked. It plays only during dance windows. Countdown gaps remain silent except for beeps; opening, taunts, and CTA contain Fish Audio dialogue with no song underneath. Generated voice clips are measured before the runtime divides the solo budget evenly among the four dancers; the group showcase then receives nine uninterrupted seconds from dedicated finale motions that are never clip-looped.

Set `FISH_STUDIO_APIKEY` locally. SpongeBob, Patrick, and Mr. Krabs use the packaged public reference presets; set `SQUILLIAM_VOICE_ID` to the operator-approved private Squilliam clone. Missing or stale dialogue requires explicit `--approve-provider`; accepted clips are cached with non-secret receipts in the ignored run folder.

| Fixed mechanics | Replaceable inputs |
|---|---|
| 9:16 Reel, 2×2 grid, countdown, four solo rounds, uninterrupted finale, replay bridge, voice/song gating, official character renderer | Song/excerpt, outer background, verified roster/order, solo/finale/reaction motion IDs, opening, taunts, closing, panel colors |
