# Bikini Bottom Dance Off

A 47-second 9:16 Format that turns one song excerpt and twelve user-selected motion assignments into a four-way character dance battle. The Reel opens on a silent-song 3–2–1 countdown over dimmed character panels, then alternates spoken character roasts with solos lasting at least five seconds: each incoming challenger taunts the dancer immediately before them and takes over. Captions use a dedicated lane below the character grid instead of covering the cast. All four return for a nine-second group showcase, then say the comment prompt together in time-matched voices while using their selected reaction motions. The closing vote prompt hands back to the matching dimmed-character countdown so the Reel loops without a visible cut.

This Repo sequences character clips; it does not own another character renderer. Its shared Character Dance Lab dependency now contains 22 individually verified motion-ready characters. The discovery page derives that roster directly from the shared catalog and uses the same clean interactive 3D card for every accepted character. Character-specific rest-view repairs remain declarative in that catalog, share the official runtime and preview exporter, and require committed before/after evidence. Twenty cards include fixed, hashed audio previews: 19 user-approved Fish Audio voices plus one original locally synthesized Agent P cue. Man Ray and Batman Beyond remain motion-ready but visibly voice-pending because character- and actor-name searches found no credible model. The shared character catalog defines motion readiness; `assets/voice-presets.json` and the input contract define episode voice readiness; `assets/voice-previews/manifest.json` defines public preview playback.

```bash
npm run check
npm run smoke
npm run list-motions
node runner.mjs init --run=wiggle-proof --song=/absolute/path/to/song.mp3
node runner.mjs validate --run=wiggle-proof
node runner.mjs render --run=wiggle-proof --approve-provider
node runner.mjs inspect --run=wiggle-proof
node runner.mjs finalize --run=wiggle-proof --review=/absolute/path/to/blind-review.json
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

`inspect` first applies 16 deterministic technical gates, then writes `review-packet.json`, `blind-review.template.json`, `eval-report.json`, and a readable `eval-report.md`. Give the packet, template, `prompts/blind-review.md`, and exact MP4 to an independent reviewer without source code, logs, automatic results, or an earlier grade. The reviewer must directly see the moving video and hear its sound, records the basis for both channels, watches the full output twice, and scores seven criterion-specific anchors with time-coded evidence. An unmuted player, captions, transcript, waveform, metadata, or receipt does not qualify as hearing the audio. `finalize --review=/absolute/path/to/blind-review.json` validates the review against the MP4 hash, computes the 100-point blind score, enforces critical floors and the 85-point shipping threshold, and creates `final.mp4` plus the delivery evidence only when every gate passes. Missing or indirect playback and low-confidence evidence return an inconclusive review and require a replacement reviewer; they do not falsely fail the video.

A passing score from 85–90, or a rating exactly on a critical floor, requires `--second-review=/absolute/path/to/another-review.json`. The two reviewers must be independent. The runtime reports agreement without averaging their scores; a decision disagreement or a criterion gap above one rating point blocks delivery for adjudication.

See `EVALUATION-FRAMEWORK.md` for the protocol and primary research, and `CALIBRATION-REPORT.md` for the controlled failures, blind-review findings, and current acceptance status.

The supplied song is copied into the local run folder and remains untracked. It plays only during dance windows. Countdown gaps remain silent except for beeps; opening, taunts, and CTA contain Fish Audio dialogue with no song underneath. Generated voice clips are measured before the runtime divides the solo budget evenly among the four dancers; the group showcase then receives nine uninterrupted seconds from dedicated finale motions that are never clip-looped.

Set `FISH_STUDIO_APIKEY` locally. The 19 approved references in `assets/voice-presets.json` are packaged with the Format and bound to the selectable input-contract roster. Agent P, Man Ray, and Batman Beyond are deliberately excluded from spoken episodes instead of receiving guessed voices. The public Repo page makes no provider call: its Play Voice controls consume only the packaged MP3s and hashes in `assets/voice-previews/manifest.json`, and only one preview may play at a time. Missing or stale episode dialogue still requires explicit `--approve-provider`; accepted clips are cached with non-secret receipts in the ignored run folder.

| Fixed mechanics | Replaceable inputs |
|---|---|
| 9:16 Reel, 2×2 grid, countdown, four solo rounds, uninterrupted finale, replay bridge, voice/song gating, official character renderer | Song/excerpt, outer background, verified roster/order, solo/finale/reaction motion IDs, opening, taunts, closing, panel colors |
