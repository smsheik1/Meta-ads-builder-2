# Local transcription sealed-release receipt

Date: 2026-08-28  
Format: 0.4.0  
Status: mechanical release audit passed; human audiovisual review pending

This receipt describes the final downloadable archive. It is deliberately excluded from that archive so recording the archive checksum cannot change the bytes it identifies.

## Final package

- ZIP SHA-256: `212595180f117922bee65e98919d5c15ba347ce5b0889c3fa8ebdf76d1d55f7c`
- The adjacent `.sha256` sidecar matched and `unzip -t` reported no errors.
- The quarantined copy was extracted with quarantine propagation. No quarantine attribute was removed and no Gatekeeper override was used.
- The archive contained the pinned whisper.cpp 1.9.2 source, English model, build plan, licenses, and transcription runtime.
- The archive contained no `.runtime-cache`, `whisper-cli`, downloaded native Whisper executable, Mach-O file, `node_modules`, agent run, golden, or download payload.
- `npm ci --offline --no-audit --no-fund` installed nine lockfile-pinned packages from cache with no network access.
- The extracted package compiled its own arm64 helper with Apple Clang and Accelerate. That helper was not shipped in the ZIP.

## Package gates

- `npm test`: 125/125 passed
- `npm run check`: passed, Format 0.4.0
- `npm run inspect:registry`: 14 poses, 461 frames, zero failures
- `npm run smoke`: passed

## Exact blind-plan replay

The two plans previously authored by the context-free agent were replayed unchanged through `init → validate → render → inspect`. Neither run was approved or finalized.

### Input A

- Plan SHA-256: `b4c538ad8f1fb13e8a7c77abf88cb239fcd4c0f4ad0c004b1549c4d13d0bba28`
- Audio SHA-256: `977618823d072d933af1b76c10e7e07394a0001fe0775770c332a48b6457121b`
- Transcript SHA-256: `35a55600eafd90cb352c01e43e477bcddd945eca6dc21cf757049b059188af7b` (104 words, 12 segments)
- Transcription receipt SHA-256: `da59ca9a5c9d4e54b0d07a6a6b1c0c073444b6fa55a2958f5aee1e5647682ef1`
- Cherry cue SHA-256: `1f8ba17f5f2ec57eef1468634133b1308ad99c9af00b1cc7860d99d497dd556d` (271 cues)
- Output SHA-256: `a1df5e2f89afc2e38589629efef81858d68887cf79f87c52e379c9d03332f212`

### Input B

- Plan SHA-256: `1e958a807014abe00a7136d7933fa61921aad335b1bd21ad916c6a64be9c2992`
- Audio SHA-256: `4e0d48f832ef8f1dca63a4dd889826a8bacd3a8d03b4fa2c3b94e92507646908`
- Transcript SHA-256: `a8ee5d5bf4374d7d70aa2d67be8ad5f30c51021fe256d06f28325dc8038c9939` (89 words, 5 segments)
- Transcription receipt SHA-256: `d7f1e52321b591167963058d7055c393131caf929ce7d5f24fa2cf71d6a1f539`
- Cherry cue SHA-256: `b633c092e0662d4048387698a096522e16e75f1972dc239a493a52d11ff055ff` (257 cues)
- Output SHA-256: `f4ca6abc7935d0aa8c50cc3f887126ced776b0de46e33444f8ffaf15feff5b11`

Both outputs exactly matched the provisional blind candidates. Each was 720 frames / 30.0 seconds, 1280×720 H.264 + AAC, passed inspection with zero failures, and completed a full audio/video decode. Both `human-review.json` files remain `pending`; neither run has a `delivery.json`.

Full external replay report SHA-256: `b57253f2efb9cf50f4dabf0981c70825e404fbfb97940da3afaa467936759abd`.
