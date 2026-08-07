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
```

Every character chooses three motion IDs in `input.json`: `motionId` for the solo, `finaleMotionId` for the uninterrupted group showcase, and `reactionMotionId` for dialogue and the closing CTA. To add a motion that is not in the starter catalog, download one Collada file with skin from Mixamo and import it locally:

```bash
node runner.mjs import-motion --source=/absolute/path/to/Motion.dae --id=my-motion --label="My Motion"
```

Mixamo is not called during validation or rendering. The local source DAE is never copied into the Repo. `content-boundary.json` is the machine-readable decision record for what ships, what remains an episode input, and what may call an external provider.

The supplied song is copied into the local run folder and remains untracked. It plays only during dance windows. Countdown gaps remain silent except for beeps; opening, taunts, and CTA contain Fish Audio dialogue with no song underneath. Generated voice clips are measured before the runtime divides the solo budget evenly among the four dancers; the group showcase then receives nine uninterrupted seconds from dedicated finale motions that are never clip-looped.

Set `FISH_STUDIO_APIKEY` locally. SpongeBob, Patrick, and Mr. Krabs use the packaged public reference presets; set `SQUILLIAM_VOICE_ID` to the operator-approved private Squilliam clone. Missing or stale dialogue requires explicit `--approve-provider`; accepted clips are cached with non-secret receipts in the ignored run folder.

| Fixed mechanics | Replaceable inputs |
|---|---|
| 9:16 Reel, 2×2 grid, countdown, four solo rounds, uninterrupted finale, replay bridge, voice/song gating, official character renderer | Song/excerpt, verified roster/order, solo/finale/reaction motion IDs, opening, taunts, closing, panel colors |
