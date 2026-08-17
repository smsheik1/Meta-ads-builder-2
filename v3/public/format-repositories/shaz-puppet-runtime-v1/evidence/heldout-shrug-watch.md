# Held-out shrug runtime review

**Runtime clip:** `/private/tmp/shaz-rig-v2-heldout-shrug.mp4`  
**Runtime clip SHA-256:** `869a701942acd5ba2deed622ce1b959c2e4fa21530259baa7fdacbe180aec38c`  
**Range receipt SHA-256:** `163e6f2edd5114b1caf19e7793de808d6d3a5f6503e05ef89a7bc3b7af6dd850`  
**Compiled TVG receipt SHA-256:** `cf21d44566f3b0ce857e8015c62245861baa1171a4f6251ec9b1b21042c2a8ae`  
**Source Xstage SHA-256:** `507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca`  
**Review method:** `/watch-video`, all three extracted chronological frames inspected  
**Video properties:** 1280×720, 24 fps, 1.5 seconds

## Provenance boundary

The clip was rendered from original TVG drawings plus sampled Xstage nodes and columns. The asset and range receipts both declare `artistRenderedFramesUsed: false`. Cached Harmony previews and the artist reference video were evaluation evidence only; neither was supplied to the compiler or renderer.

## Semantic hold-out result

**Pass.** Without shrug-specific renderer calibration, the sequence preserves the defining authored behavior:

- both palms turn upward;
- shoulders lift with intentional asymmetry;
- head and torso counter-tilt;
- the eyes glance, then close;
- the second beat changes the silhouette instead of holding a static pose.

This is sufficient to proceed from transform recovery to general compositing repair. It is not a final visual-fidelity pass.

## Remaining renderer defects seen during the watch

- Shoulder and sleeve joints expose seams that Harmony hides with AutoPatch/Overlay processing.
- A neck/shoulder contour crosses a foreground region because the current prototype paints only the READ layers.
- Per-frame continuity, clipping, and joint coverage still need automated gates after effect-node support lands.

## Patched renderer re-watch

**Patched clip SHA-256:** `e598faeead93029d21ae420e5fdd98c48a3389e602e31428cd7f5c758638903a`  
**Patched range receipt SHA-256:** `08db09b5e845275680bff59ac6106fc1bd65c5e49642bc26f1e90f888aceffb9`  
**Patched TVG receipt SHA-256:** `ca57e5923fd02817f09ad2457073e74e0c30d4c0846b946eaab1481c32b54995`

The patched clip was reviewed again with `/watch-video`, including all three extracted chronological frames. The compiler now preserves Colour, Line, and Overlay Art separately. The runtime reconstructs the recovered arm composite order as hand → forearm → upper arm → forearm Colour Art AutoPatch → forearm Overlay Art.

**Patched result: pass.** The elbow outlines no longer cut across the sleeve interiors, the hand/forearm silhouettes remain intact, and the semantic motion from the first review is unchanged. The five new expressions remain gated on watching the other permitted artist actions and landing automated continuity/clipping/provenance checks.
