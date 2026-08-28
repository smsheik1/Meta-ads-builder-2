# Talk to Camera preset proof

Date: 2026-08-27

Format: 0.2.1

Preset: `talk-to-camera`

## Claim under test

A blind agent can start from the packaged minimal input in `fixtures/talk-to-camera/input.json`, supply only an audio path, and produce a fixed-camera Shaz talking scene without authoring a pose, sequence, duration, or hold frame. The runtime must measure the audio, reuse only the registered `neutral-listening` body, generate Cherry cues locally, change only Mouth, mux AAC audio, inspect the result, and leave creative approval pending.

The downloadable ZIP checksum is intentionally not embedded in this packaged evidence file because doing so would make the archive hash self-referential. The adjacent `.sha256` sidecar is the canonical checksum for the final archive.

## Sealed-package preflight

The kit was built, extracted into a new temporary directory, and operated from that extraction without reading source-tree runtime files.

- `npm ci`: pass
- `npm test`: 110/110 pass
- `npm run check`: pass; Format 0.2.1, Cherry 0.1.0 WASI, 210 compiled rig assets
- Network/provider calls during generation: 0
- Native Cherry executable: none

The only source input for both runs was:

```json
{
  "schemaVersion": "shaz-sequence-input-v1",
  "title": "Direct-to-audience dialogue",
  "backgroundId": "sisters-room",
  "sequencePreset": "talk-to-camera"
}
```

Each input then completed `init → validate → render → inspect`. Neither run was finalized; exact creative review remains pending by design.

## Run A — short OGG

- Audio: OGG/Vorbis, 2.843063 seconds
- Audio SHA-256: `e8d3fcba953c7109e5be2f147063194581e93d55acbe41f0347f9aee6a55bade`
- Runtime timeline: 68 frames at 24 fps
- Body: one `neutral-listening` recipe frame plus 67 derived hold frames, zero gaps, zero props
- Cherry: bundled WASI engine, 8 cues, 3 used mouth drawings
- Cue SHA-256: `96767d332d8630843e9c367f133950bcf3dd56e7e3ccb2dcb22b59eb4cfb5340`
- Output: 1280 × 720 H.264/yuv420p + AAC, 68 frames
- Output SHA-256: `9d9e87cf3d61590cbcd1c6c5688db73169c7d53e6753f499f80e6b71cbaee153`
- Contact-sheet frames: `0, 20, 29, 32, 35, 39, 67`
- Inspection: pass, zero failures
- Full-stream ffmpeg decode: pass

## Run B — independent 12-second WAV

- Audio: WAV/PCM, 12.0 seconds
- Audio SHA-256: `37648e2e0b4c37d22ec529b4301c8abd9435f92ce641c804e521e5b3bdd23f1b`
- Runtime timeline: 288 frames at 24 fps
- Body: one `neutral-listening` recipe frame plus 287 derived hold frames, zero gaps, zero props
- Cherry: bundled WASI engine, 100 cues, all 5 production mouth drawings
- Cue SHA-256: `6a6d5604461dfe9aadc40ab3bf5f7b5171c64e674c95384c58275294ee32820d`
- Output: 1280 × 720 H.264/yuv420p + AAC, 288 frames
- Output SHA-256: `89adc753be4e705a4011e8bd88ed9fc8c3a46a18badf0ec5d013b848794adb92`
- Contact-sheet frames: `0, 39, 60, 83, 102, 129, 159, 177, 204, 233, 261, 287`
- Inspection: pass, zero failures
- Full-stream ffmpeg decode: pass

## Boundary

This proves the packaged runtime, duration derivation, neutral-body reuse, local cue generation, audiovisual rendering, checksum propagation, and automatic inspection. It does not claim that every arbitrary line has perfect phoneme timing, nor does it replace the required complete audiovisual human review before `finalize`.
