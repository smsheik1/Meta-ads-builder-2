# Provenance

The runtime was recovered from the user-supplied Toon Boom Xstage project identified by SHA-256:

`507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca`

The original archive is not bundled. `rig-v2/runtime.json` contains the recovered hierarchy, channel data, drawing exposures, camera conversion, and compositing plan. `rig-v2/assets/receipt.json` records every compiled drawing asset and its source/output checksums.

Finished artist-rendered video frames were used only for human comparison evidence during development. They are not bundled, are not runtime assets, and were not used as generation inputs for the six new actions. Every recipe and render receipt asserts `artistRenderedFramesUsed: false`; the validator rejects recipes that do not.

The phone is a simple purpose-built non-limb prop. Most character substitutions are checksum-locked existing compiled rig drawings. Crossed Arms is the explicit exception: after native-rig anticipation, it uses one checksum- and placement-locked arm-only destination drawing derived from the user-supplied crossed-arms pose artwork. The runtime continues to render the original head, hair, face, torso, collar, strings, and pocket. Both complete native arm chains become invisible on the same frame the registered drawing appears, so native and replacement anatomy can never double-paint. No finished animation-video frame or image-generation output is packaged as character artwork.

This kit packages the supplied character assets for the owner's authorized Wiggly workflow. It does not grant third parties rights to redistribute or commercially exploit the character or source art.
