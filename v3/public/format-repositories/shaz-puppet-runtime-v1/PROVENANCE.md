# Provenance

The runtime was recovered from the user-supplied Toon Boom Xstage project identified by SHA-256:

`507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca`

The original archive is not bundled. `rig-v2/runtime.json` contains the recovered hierarchy, channel data, drawing exposures, camera conversion, and compositing plan. `rig-v2/assets/receipt.json` records every compiled drawing asset and its source/output checksums.

Finished artist-rendered video frames were used only for human comparison evidence during development. They are not bundled, are not runtime assets, and were not used as generation inputs for the six new actions. Every recipe and render receipt asserts `artistRenderedFramesUsed: false`; the validator rejects recipes that do not.

The phone is a simple purpose-built non-limb prop. Most character substitutions are checksum-locked existing compiled rig drawings. Crossed Arms is the explicit exception: after native-rig anticipation, it uses one checksum- and placement-locked arm-only destination drawing derived from the user-supplied crossed-arms pose artwork. The runtime continues to render the original head, hair, face, torso, collar, strings, and pocket. Both complete native arm chains become invisible on the same frame the registered drawing appears, so native and replacement anatomy can never double-paint. No finished animation-video frame or image-generation output is packaged as character artwork.

This kit packages the supplied character assets for the owner's authorized Wiggly workflow. It does not grant third parties rights to redistribute or commercially exploit the character or source art.

## Bundled Cherry cue engine

Format 0.2.0 includes Cherry Lip Sync 0.1.0 as a checksum-locked `wasm32-wasip1` module. It is used only to generate A-K/X speech cues before the existing Shaz renderer runs; it is not a renderer and does not contain Shaz artwork.

- Upstream repository: <https://github.com/amberwhitehead/cherry-lip-sync>
- Immutable tag: `v0.1.0`
- Immutable commit: `ab3e68a8e2d38fc72d1672c450478dff7710bc14`
- Source archive SHA-256: `cf16c5bf5fdeed18a96240e74144287f80957c1c1461891eb74585ac3ab94bfc`
- Bundled WASI module SHA-256: `1bf5730acc7a81b1f0b6c818a9068001b9e9a797a7eb990ae091eb1b01603382`
- License expression: `MIT OR Apache-2.0`

The exact source, build receipt, dependency-only patch, parity fixture, module checksum, preserved `LICENSE-MIT`, `LICENSE-APACHE`, `NOTICE`, and upstream README live under `vendor/cherry-lip-sync/v0.1.0/`. The patch marks two unused build-time dependencies optional so the command-line target can compile for WASI. It changes no Rust source, model, inference, audio decoding, CLI, or cue-generation logic, and the resulting fixture cues are byte-identical to the upstream macOS arm64 0.1.0 output.

The package contains no native Cherry executable. Node hosts the module with only a private temporary scratch folder preopened to WASI, so the downloaded Format does not ask the user to bypass macOS Gatekeeper. Rust is needed only to reproduce the module from source, not to operate the packaged Format.
