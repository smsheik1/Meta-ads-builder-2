# Bikini Bottom Dance Off

A 30-second 9:16 proof that turns one song excerpt into a four-way character dance battle. The Reel opens on a silent-song 3–2–1 countdown with beeps, introduces the challenge, then alternates dances with direct roasts: each incoming challenger taunts the dancer immediately before them and takes over. All four return for the finale before the comment prompt.

This Repo sequences character clips; it does not own another character renderer. SpongeBob, Patrick, Mr. Krabs, and Squilliam are rendered by the existing Character Dance Lab runtime, including its protected faces, grounding, and Squilliam paired-leg profile.

```bash
npm run check
node runner.mjs init --run=wiggle-proof --song=/absolute/path/to/song.mp3
node runner.mjs validate --run=wiggle-proof
node runner.mjs render --run=wiggle-proof
node runner.mjs inspect --run=wiggle-proof
```

The supplied song is copied into the local run folder and remains untracked. It plays only during dance windows; countdown, challenge, taunts, and CTA stay clear. The initial proof uses on-screen taunts so music, layout, motion, and pacing can be judged before optional voice-provider calls.

| Fixed mechanics | Replaceable inputs |
|---|---|
| 9:16 Reel, 2×2 grid, countdown, four solo rounds, finale, CTA, official character renderer | Song/excerpt, verified roster, normalized motion IDs, taunts, panel colors |
