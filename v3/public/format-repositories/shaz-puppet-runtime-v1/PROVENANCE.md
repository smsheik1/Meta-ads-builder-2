# Where the pieces came from

## Shaz's rig

The runtime was recovered from the Toon Boom Xstage project supplied by the user.

Source Xstage SHA-256:

`507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca`

The original archive is not in the package. `rig-v2/runtime.json` records the recovered hierarchy, channels, drawing exposures, camera conversion, and compositing plan. `rig-v2/assets/receipt.json` records each compiled drawing asset and its source and output checksums.

Finished artist-rendered video frames were used only as human comparison material during development. They are not packaged, are not runtime assets, and were not used as generation input for the six new actions. Every recipe and render receipt says `artistRenderedFramesUsed: false`, and validation rejects a recipe that does not.

The phone is a small purpose-built non-limb prop. Most substitutions use existing compiled rig drawings with fixed checksums.

Crossed Arms is the one drawing exception. After native-rig anticipation, it uses a fixed arm-only destination drawing derived from the crossed-arms pose artwork supplied by the user. The file and placement are locked. The runtime still draws the original head, hair, face, torso, collar, strings, and pocket. Both native arm chains disappear on the same frame that the replacement appears, so the two versions cannot paint on top of each other. No finished animation frame or image-generation output is packaged as character artwork.

That origin record does not make Crossed Arms creatively approved. Its current recipe still needs fresh visual review.

The character assets are packaged for the owner's authorized Wiggly workflow. This package does not give third parties permission to redistribute or commercially use the character or source art.

## Backgrounds

The package includes four opaque 3840×2160 RGB PNG backgrounds. `assets.json` records each output checksum, label, dimensions, use, source operation, and source checksum when a PSD exists.

- **Sisters Room** is the default. It comes from `BG (8) Sisters room.psd`, SHA-256 `5ad1d74940954256925905428fb945bd07ecf4a22d104ff42c55696caa6c5566`.
- **Living Room** comes from the embedded composite in `BG (4) living room.psd`, SHA-256 `1da1c55eeccea94b49b14634b8167d2aeeee9be5618fff94d166d95595e3bd3d`. Boundary alpha was flattened onto white before deterministic RGB encoding.
- **Photo Zone** comes from `BG (22) map.psd`, SHA-256 `2666ddcf35837d74dc3e80803e138331a0f61f0ea46f78a42c535037a58eeb19`. Only the visible `Layer 4` map artwork was hidden. The PSD's already-hidden smart-object layer named `map` stays hidden. The cleared wall is a fixed background; its recorded bounds do not turn on a supporting-media renderer.
- **Pure White** is a deterministic generated `#FFFFFF` RGB canvas with no source PSD.

The source PSD files are not packaged. Every room uses the same character renderer, fixed camera, and character transform.

## Cherry Lip Sync

Beginning with Format 0.2.0, the package includes Cherry Lip Sync 0.1.0 as a `wasm32-wasip1` module. Cherry creates A-K/X speech cues before Shaz is rendered. It does not render Shaz and contains no Shaz artwork.

- Upstream repository: <https://github.com/amberwhitehead/cherry-lip-sync>
- Immutable tag: `v0.1.0`
- Immutable commit: `ab3e68a8e2d38fc72d1672c450478dff7710bc14`
- Source archive SHA-256: `cf16c5bf5fdeed18a96240e74144287f80957c1c1461891eb74585ac3ab94bfc`
- Bundled WASI module SHA-256: `1bf5730acc7a81b1f0b6c818a9068001b9e9a797a7eb990ae091eb1b01603382`
- License: `MIT OR Apache-2.0`

The source, build receipt, dependency-only patch, parity fixture, module checksum, `LICENSE-MIT`, `LICENSE-APACHE`, `NOTICE`, and upstream README are under `vendor/cherry-lip-sync/v0.1.0/`.

The build patch marks two unused build-time dependencies optional so the command-line target can compile for WASI. It changes no Rust source, model, inference, audio decoding, command-line behavior, or cue-generation logic. The fixture cues produced by the bundled module are byte-for-byte identical to the upstream macOS arm64 0.1.0 output.

The package contains no native Cherry executable. Node runs the module with only a private temporary scratch folder open to WASI, so the downloaded kit never asks the user to bypass macOS Gatekeeper. Rust is needed only to rebuild the module from source, not to use the package.
