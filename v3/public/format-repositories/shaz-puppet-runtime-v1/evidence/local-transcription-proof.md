# Local transcription and semantic planning proof

Status: mechanically passed; human audiovisual review pending  
Format: 0.4.0  
Date: 2026-08-28

A fresh blind operator received the sealed Format ZIP and two 30-second WAV files. It did not receive either source video, a transcript, pose timings, provider credentials, or implementation help. After the documented one-time `npm ci`, every transcription, lip-sync, validation, render, inspection, and decode step ran locally with zero provider calls and $0 runtime cost.

## Package boundary

- The copied ZIP was given `com.apple.quarantine`, then extracted with quarantine propagation.
- No quarantine attribute was removed and no Gatekeeper override was used.
- The package compiled a roughly 2.3 MB arm64 Whisper helper from its pinned source. The compiled helper had no quarantine attribute and ran directly.
- Whisper source archive SHA-256: `a6abd064fcca8b85e794d205abf328c522e9451db43a3eadc178b883b7d0e9cd`
- English base Q5_1 model SHA-256: `4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f`
- Cherry WASI module SHA-256: `1bf5730acc7a81b1f0b6c818a9068001b9e9a797a7eb990ae091eb1b01603382`
- The clean package suite passed 125 tests, including a repeated-build checksum guard. Registry inspection passed 14 poses and 461 recipe frames with zero mechanical failures.
- An offline `npm ci` was not possible on the clean host because the Sharp tarball was absent from its npm cache. The documented lockfile-pinned install was the proof's only network boundary. No model, Whisper binary, audio, transcript, or media was uploaded or downloaded by the runtime.

## Input A: reflective puppy story

- Source audio SHA-256: `977618823d072d933af1b76c10e7e07394a0001fe0775770c332a48b6457121b`
- Transcript: 104 words in 12 segments
- Transcript SHA-256: `35a55600eafd90cb352c01e43e477bcddd945eca6dc21cf757049b059188af7b`
- Background: `living-room`
- Word anchors:
  - Think on `w0023` “idea” at frame 131: “No idea what we were doing.”
  - Point on `w0064` “least” at frame 404: the least-disciplined-person thesis.
  - Confident on `w0103` “best” at frame 689: “Leo was the best son/dog.”
- Cherry cues: 271
- Output: 720 frames, 30.0 seconds, 1280×720 H.264 + AAC
- Output SHA-256: `a1df5e2f89afc2e38589629efef81858d68887cf79f87c52e379c9d03332f212`
- Inspection: pass, zero failures; complete audio/video decode: pass

The transcript contained one likely recognition error, low-confidence “sighed” where the speech likely said “side.” The blind operator did not use that word as an anchor; the story remained understandable.

## Input B: siblings, cookies, and a puppy

- Source audio SHA-256: `4e0d48f832ef8f1dca63a4dd889826a8bacd3a8d03b4fa2c3b94e92507646908`
- Transcript: 89 words in 5 segments
- Transcript SHA-256: `a8ee5d5bf4374d7d70aa2d67be8ad5f30c51021fe256d06f28325dc8038c9939`
- Background: `sisters-room`
- Word anchors:
  - Present on `w0006` “Shaz” at frame 41: “This is Shaz.”
  - Point on `w0021` “share” at frame 157: “Share the cookies with our guests.”
  - Ah-ha on `w0075` “puppy” at frame 579: the siblings' shared wish is revealed.
- Cherry cues: 257
- Output: 720 frames, 30.0 seconds, 1280×720 H.264 + AAC
- Output SHA-256: `f4ca6abc7935d0aa8c50cc3f887126ced776b0de46e33444f8ffaf15feff5b11`
- Inspection: pass, zero failures; complete audio/video decode: pass

## What this proves

The package gave a context-free agent enough local evidence to understand two different pieces of speech and make different, defensible gesture choices. The timeline was not prewritten: the agent selected the actions and exact anchors after reading each generated transcript. Initialization then regenerated the transcript and rejected any plan whose transcript hash, word ID, label, or frame did not match the staged audio.

This does not prove final creative quality. Both `human-review.json` files remain `pending`; neither real run was approved or finalized. The proof covers package operation, semantic grounding, mechanical integrity, and media decoding. Normal-speed audiovisual judgment remains human work.

The exact final ZIP checksum is kept in a release receipt outside the ZIP so recording it cannot change the archive it describes.
