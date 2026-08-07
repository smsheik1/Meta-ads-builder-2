# Bikini Bottom Dance Off

A 30-second 9:16 proof that turns one song excerpt into a four-way character dance battle. The Reel opens on a silent-song 3–2–1 countdown with beeps, then alternates spoken character roasts with dances: each incoming challenger taunts the dancer immediately before them and takes over. All four return for the finale before Squilliam delivers the comment prompt.

This Repo sequences character clips; it does not own another character renderer. SpongeBob, Patrick, Mr. Krabs, and Squilliam are rendered by the existing Character Dance Lab runtime, including its protected faces, grounding, and Squilliam paired-leg profile.

```bash
npm run check
node runner.mjs init --run=wiggle-proof --song=/absolute/path/to/song.mp3
node runner.mjs validate --run=wiggle-proof
node runner.mjs render --run=wiggle-proof --approve-provider
node runner.mjs inspect --run=wiggle-proof
```

The supplied song is copied into the local run folder and remains untracked. It plays only during dance windows. Countdown gaps remain silent except for beeps; opening, taunts, and CTA contain Fish Audio dialogue with no song underneath. Generated voice clips are measured before the runtime divides the remaining time evenly among the four solo dances, so nobody is rushed or cut off.

Set `FISH_STUDIO_APIKEY` locally. SpongeBob, Patrick, and Mr. Krabs use the packaged public reference presets; set `SQUILLIAM_VOICE_ID` to the operator-approved private Squilliam clone. Missing or stale dialogue requires explicit `--approve-provider`; accepted clips are cached with non-secret receipts in the ignored run folder.

| Fixed mechanics | Replaceable inputs |
|---|---|
| 9:16 Reel, 2×2 grid, countdown, four solo rounds, finale, voice/song gating, official character renderer | Song/excerpt, verified roster, normalized motion IDs, opening, taunts, closing, panel colors |
