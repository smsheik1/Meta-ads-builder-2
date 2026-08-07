# Bikini Bottom Dance Off

A 30-second 9:16 proof that turns one song excerpt into a four-way character dance battle. The Reel opens on a 3–2–1 film countdown, introduces the challenge, gives each character a five-second highlighted solo, brings all four back for a finale, and ends on a comment prompt.

This Repo sequences character clips; it does not own another character renderer. SpongeBob, Patrick, Mr. Krabs, and Squilliam are rendered by the existing Character Dance Lab runtime, including its protected faces, grounding, and Squilliam paired-leg profile.

```bash
npm run check
node runner.mjs init --run=wiggle-proof --song=/absolute/path/to/song.mp3
node runner.mjs validate --run=wiggle-proof
node runner.mjs render --run=wiggle-proof
node runner.mjs inspect --run=wiggle-proof
```

The supplied song is copied into the local run folder and remains untracked. The initial proof uses on-screen taunts so music, layout, motion, and pacing can be judged before optional voice-provider calls.

| Fixed mechanics | Replaceable inputs |
|---|---|
| 9:16 Reel, 2×2 grid, countdown, four solo rounds, finale, CTA, official character renderer | Song/excerpt, verified roster, normalized motion IDs, taunts, panel colors |
