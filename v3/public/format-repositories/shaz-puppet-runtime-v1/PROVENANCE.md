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

## Episode 5 Part 2 compatible Xstage

Format 0.5.0 adds an authoring-only path for importing actions from another Xstage that uses the same inner Shaz rig topology. The supplied `PART2_F.zip` is a hybrid Harmony project: only five ranges expose the live `Puppet_Talk_Section_Group`; storyboard, animatic-coloring, and flattened scene ranges are excluded. The archive and Xstage are not packaged.

- Source archive: `PART2_F.zip`, SHA-256 `ce74bf295692d55e65f2a10e81350f067be79ea8f110fde3d3f446bf3192cd97`
- Source Xstage: `PART2_F/PART2_F_v2.xstage`, SHA-256 `0303b090a58f7ab66139e2e5328c29ca7a2528b7508c91fb648bbd80f8d1342f`
- Live rig exposure ranges: 604–727, 1683–2094, 2231–2254, 2774–3054, and 3710–3958
- Compatible inner rig: 112 matching paths and node types, all 23 READ paint paths, and all 26 deformation paths

Portable candidate recipes keep the canonical runtime binding and separately record the external archive, Xstage, source range, drawing sources, and complete deformation samples. Numeric drawing IDs are scene-local: every PART2 drawing that is absent from the canonical rig, plus every same-number ID whose artwork differs, is explicitly source-bound under the compatible Xstage hash instead of resolving through canonical artwork. The 40 source-bound node-and-drawing pairs produce 70 registered asset variants. Each copied asset records its source TVG checksum, output checksum, canvas, model origin, element, drawing, variant, and source Xstage checksum. The authoring-only registration utility validates the complete set before a journaled receipt-and-asset update under an exclusive per-base lease. Its journal lives outside the Format package root, restores interrupted work before the next invocation reads the receipt, and never presents the multi-file update as atomic.

The Episode 5 source uses a brown outline (`[77, 17, 3, 255]`) where the canonical runtime uses black (`[0, 0, 0, 255]`). Format 0.5.0 performs that one declared replacement in the exported TVG specification before rasterization. Three shared drawings then reproduced the existing packaged PNGs byte-for-byte, proving that geometry and the rest of the palette were unchanged.

The checksum-locked native Toon Boom export `Part2_Rig_v5.mp4` is the independent fidelity authority for these actions. The older direct-Xstage and extracted-recipe renders shared Wiggly's custom parser, channel sampler, TVG compiler, and renderer; their agreement is circular diagnostic evidence and cannot certify Harmony fidelity.

Three repaired recipe candidates currently live under `poses/candidates/`. Paired Open-Hand Emphasis passes 58/58 official inspector frames with zero failures, Enumerate List Items passes 165/165 with zero failures, and Sheepish Side-Eye passes 117/117 with zero failures. Delegated normal-speed comparison against the corresponding native Toon Boom ranges passes for all three. Sheepish's Hair4/Head_Base4/Bangs_back4 family is accepted only through an exact source-checksum and drawing-triplet registration for finished artwork; it is no longer an inspector vocabulary gap. All three remain unregistered and unavailable to blind agents pending human creative approval, and Sheepish's hard-cut entry and release boundaries still block motion-packet readiness. Exact hashes and gates are in `evidence/episode5-part2-compatible-source.json` and `POSE-PROMOTION.md`.

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

## Local transcription

Beginning with Format 0.4.0, the package includes whisper.cpp 1.9.2 source and the English `base.en` Q5_1 model. It compiles a small arm64 helper locally with Apple Clang and Accelerate, then uses that helper to create text and word timestamps before body-language planning. The helper is build output, not a downloaded executable, and it is excluded from the distributable ZIP.

- Upstream repository: <https://github.com/ggml-org/whisper.cpp>
- Immutable tag: `v1.9.2`
- Immutable commit: `306c88f4d1286aec1bf96e544632897886af5501`
- Source archive SHA-256: `a6abd064fcca8b85e794d205abf328c522e9451db43a3eadc178b883b7d0e9cd`
- Bundled model: `ggml-base.en-q5_1.bin`
- Model repository commit: `5359861c739e955e79d9a303bcbc70fb988958b1`
- Model SHA-256: `4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f`
- Engine and model license: MIT

`vendor/whisper.cpp/v1.9.2/VENDOR-MANIFEST.json` binds the source, model, build plan, and license files. `BUILD-PLAN.json` fixes the compiler inputs, architecture, minimum macOS version, and Accelerate linkage. No user audio leaves the machine, and no Deepgram or other hosted transcription service is used.
