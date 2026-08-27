# Bundled Cherry WASI package proof

Date: 2026-08-27

## Claim under test

Can a blind operator start with only the downloadable Shaz Puppet Runtime kit, a registered Lego body sequence, and user speech audio, then generate real Cherry cues and render an inspected audiovisual result without installing Cherry, supplying a TSV, calling a provider, or launching a native executable?

## Package gates

A sealed fresh extraction completed the following before either creative run:

- `npm install`: pass, zero reported vulnerabilities
- `npm test`: 105 passing tests
- `npm run check`: pass, including the bundled Cherry 0.1.0 WASI version and checksum
- `npm run inspect:registry`: 14 poses, 461 recipe frames, zero failures
- `npm run smoke`: pass
- provider calls: 0
- cost: $0

The release ZIP is checksum-bound by `downloads/wiggly-shaz-puppet-runtime-format-kit.zip.sha256`. The packaged payload contains no Mach-O, ELF, PE, or executable-bit Cherry file. `cherrylipsync.wasm` is a WebAssembly module hosted by Node's WASI implementation, so this workflow does not invoke the unnotarized macOS Cherry executable that caused the Gatekeeper warning during development.

## Speech input A

Initialization received only the input JSON and audio. No cue TSV or `--lipsync-cues` argument was supplied.

- original input SHA-256: `1fd88f40657b0482946c4b7a12bfa84cbad1404c17601dcf390770377cbc6eef`
- audio SHA-256: `37648e2e0b4c37d22ec529b4301c8abd9435f92ce641c804e521e5b3bdd23f1b`
- generated cue SHA-256: `6a6d5604461dfe9aadc40ab3bf5f7b5171c64e674c95384c58275294ee32820d`
- cue inventory: 100 cues across 11 Cherry symbols
- output SHA-256: `59cef6b0910a9d7f8dfe342c0602e8f1921ec6c837fe0fb26c8d5510fd1d2edf`
- output: 288 decoded frames, 12.000 seconds, 1280 × 720, H.264/yuv420p at 24 fps, AAC stereo
- automatic inspection: pass, zero failures

## Speech input B

This input is 6.86 seconds longer, mono rather than stereo, and exercises all twelve Cherry symbols. Again, initialization received no cue TSV.

- original input SHA-256: `2ae357f7e3a5110d9ef5de98f374932ea3abe228391e4704aa378d84ed6095c9`
- audio SHA-256: `ba65d9f3cb1372be0c12765b659e012b3b66cd3ac6d7e75f805b7df4b595d88d`
- generated cue SHA-256: `9d8e16ee6468782ce15e4bf74635e1112c5da217375e47ffefde9e6e4b056612`
- cue inventory: 165 cues across all 12 Cherry symbols
- output SHA-256: `aa27045091757bce760ec61322eb33dd6b8311ec65a9a16d540d5935eae5b15c`
- output: 453 decoded frames, 18.875 seconds, 1280 × 720, H.264/yuv420p at 24 fps, AAC mono
- automatic inspection: pass, zero failures

The 18.860-second source rounds to the exact 453-frame, 24-fps timeline. Both outputs passed full audio and video stream decoding.

## Bound engine provenance

- engine: Cherry Lip Sync 0.1.0
- execution: `node-wasi-preview1`
- cue source: `bundled-wasi-engine`
- module SHA-256: `1bf5730acc7a81b1f0b6c818a9068001b9e9a797a7eb990ae091eb1b01603382`
- vendor manifest SHA-256: `38cfe1aab3009643a2758e426344919d887f3e0f4d402fa51db8266c0366e1cd`
- native Cherry executable included or launched: false

Validation binds the exact audio, cue, module, manifest, engine version, mapping, and generation mode. Inspection requires the render report to repeat that receipt exactly. A supplied TSV is labeled `supplied-tsv`; it cannot masquerade as output from the bundled engine.

## Honest review boundary

This proves package independence, deterministic cue generation, audiovisual rendering, media integrity, and mechanical inspection. It does not convert mechanical success into creative approval. The two proof runs keep `human-review.json` pending and do not emit `delivery.json` until a person watches and approves the exact video checksum.
