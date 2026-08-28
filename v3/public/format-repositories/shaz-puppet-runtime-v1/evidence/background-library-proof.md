# Built-in background library proof

Date: 2026-08-27

Format: 0.3.0

## Claim under test

A blind operator can select a checksum-registered fixed background without changing the Shaz body, mouth choreography, timing, camera, or renderer. Sisters Room remains the default; Living Room, Photo Zone, and Pure White are independently selectable. Photo Zone must contain the clean wall with the source map artwork removed, while its recorded supporting-media region remains inactive metadata.

The downloadable ZIP checksum is intentionally not embedded in this packaged evidence file because doing so would make the archive hash self-referential. The adjacent `.sha256` sidecar is the canonical checksum for the final archive.

## Sealed-package preflight

The kit was extracted into a fresh temporary directory and operated only from that extraction.

- `npm ci`: pass, zero vulnerabilities
- `npm test`: 111/111 pass
- `npm run check`: pass; Format 0.3.0, Cherry 0.1.0 WASI, Sharp 0.35.3
- Packaged background files: exactly four, with no unregistered extras
- Every background: 3840 × 2160, opaque RGB PNG, registry checksum matched
- Network/provider calls during generation: 0

The four packaged background checksums are:

- Sisters Room: `740f61cbd58581b3c944fc77038fd51756305083b22ae3e28df0f1f5190ec485`
- Living Room: `f5b6f3c78351028a1fd1d6b067337f2a99ed456647b5ce7608426f42088ece3e`
- Photo Zone: `2c5d6b6520b2bab37b74a3b46a32c01d266ca520e2fca5425192312c569cb937`
- Pure White: `f91cf55509a036596da76a95f07a4034459ff0c6b23aac48b4ff6c2661edb807`

## Controlled two-background run

Both runs used the same packaged OGG audio, bundled Cherry cues, `talk-to-camera` preset, `neutral-listening` recipe, 67 hold frames, fixed stage view, and Mouth histogram. Only `backgroundId` changed. Each completed `init → validate → render → inspect`; neither was approved or finalized.

Shared invariants:

- Audio SHA-256: `e8d3fcba953c7109e5be2f147063194581e93d55acbe41f0347f9aee6a55bade`
- Cue SHA-256: `96767d332d8630843e9c367f133950bcf3dd56e7e3ccb2dcb22b59eb4cfb5340`
- Cherry cues: 8; used Mouth drawings `1`, `3`, and `4`
- Body recipe semantic SHA-256: `d08700a524741bb60c18af329afd80f73d35c5782b5cc75d39c6edfb64481c94`
- Output: 1280 × 720 H.264/yuv420p + AAC, 24 fps, 68 decoded frames
- Full-stream audio/video decode: pass
- Inspection: pass, zero failures
- Camera motion: false

### Living Room

- Input SHA-256: `ac8115b203610697a5b95821eca8446617b93cd033bfe9f5bbc322777402aadd`
- Background SHA-256: `f5b6f3c78351028a1fd1d6b067337f2a99ed456647b5ce7608426f42088ece3e`
- Output SHA-256: `ce8cd8f4a3f65ffe679df775b25e1837b527e89bc3cb6bf1950264fd73b704bf`

### Photo Zone

- Input SHA-256: `917a5357d8a9caa80a915c00f8fd449204f3f349cfa04c92a2b6093cbf0aa12f`
- Background SHA-256: `2c5d6b6520b2bab37b74a3b46a32c01d266ca520e2fca5425192312c569cb937`
- Output SHA-256: `aea2e6f48c0d1f4b4aa0f50a25714ee6f8a3e0fab1fe1ae453c8132a462ea11b`

The contact sheets show the same correctly framed waist-up Shaz and the same mouth changes against visibly distinct environments. Photo Zone is a clean purple striped wall with no map artwork. No image, video, crop, replacement, or overlay is rendered into its reserved region.

## Review boundary

This proves package independence, exact background selection, checksum propagation, audiovisual rendering, fixed-camera composition, and automatic inspection. It does not claim creative approval of either short proof video. Their human-review receipts remain `pending`, and no `delivery.json` was created.
