# Provenance

The runtime was recovered from the user-supplied Toon Boom Xstage project identified by SHA-256:

`507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca`

The original archive is not bundled. `rig-v2/runtime.json` contains the recovered hierarchy, channel data, drawing exposures, camera conversion, and compositing plan. `rig-v2/assets/receipt.json` records every compiled drawing asset and its source/output checksums.

Finished artist-rendered video frames were used only for human comparison evidence during development. They are not bundled, are not runtime assets, and were not used as generation inputs for the five new actions. Every recipe and render receipt asserts `artistRenderedFramesUsed: false`; the validator rejects recipes that do not.

The screen and phone are simple purpose-built props. Every character substitution used by a registered action is checksum-locked to existing compiled rig drawings. Crossed Arms uses one derived torso-local assembly with its source-part hashes recorded in `assets/props/crossed-arms-assembly.receipt.json`; Celebration uses only native rig hands.

This kit packages the supplied character assets for the owner's authorized Wiggly workflow. It does not grant third parties rights to redistribute or commercially exploit the character or source art.
