# Four reported anatomy repairs: structural release

The earlier `five-storyboard-sequences`, `five-storyboard-sequences-fixed`, and `five-storyboard-anatomy-repair` runs are rejected failure provenance. They allowed one or more of these defects: a front palm that touched the face while detached from its cuff, a flattened crossed-arm sticker, enlarged or unrelated celebration wrist states, a screen-space phone hand, and a literal phone that the user asked to remove.

The accepted Format 0.1.2 proof is run `anatomy-v8-release` and is tracked for fresh Git checkouts under `goldens/anatomy-v8-release/`. The downloadable runtime kit intentionally excludes all golden proof media.

## Accepted sequence

1. `facepalm-frustrated`
2. `arms-crossed-skeptical`
3. `excited-celebration`
4. `phone-use-sequence`

- Input SHA-256: `5735110c7fb278e8c6aef658d5318c2eddee30ae3fab962c732dfa1c4c6a5774`
- Exact final video SHA-256: `bcf3556ffde53beb7e9efe989bd7e26655b0a2f3a23a5e80ed63f334d0edc9f9`
- Validation receipt SHA-256: `1b844935aad249e369fd04744671be2635ca47241c9bbee407c956a85f22d357`
- Render report SHA-256: `7ae251abdd14650f8fba6766ef35eb6a06979dcbe18e7ef99657c2cb30e90518`
- Quality report SHA-256: `c2ac860f2c2dc11860551be3ba278764944043db28e77dff4179fcbcca74355d`
- Human review SHA-256: `687c694c0e388f029931c4234cc0c0bf4bf2b2f15f2cbe0705fb216522fdc39e`
- Delivery receipt SHA-256: `c36c6ecacba717292e6b108bf50432c1fb4cab99900dc7f7eb3f02b62f8065f9`
- Official contact sheet SHA-256: `20cf4c10735759918c46675dd0bbd2abfd95fbd61e47631888a204b477faa998`

## Repair

- `facepalm-frustrated` keeps the registered front-of-face hand and records the recovered left-sleeve owner as descriptive metadata. The renderer independently derives that ownership from the `OL_Hand` rig topology and clips the overlay behind the resulting finished cuff; the declaration neither creates attachment nor relaxes the rendered-role geometry limits. The hand remains in front of the face without a visible detached cuff seam.
- `arms-crossed-skeptical` uses native arms for anticipation through frame 9. Native-only trials proved the recovered cuffs, pivots, and hand drawings could form only clasped hands, detached wrists, or stretched sleeves, not a credible fold. On frame 10, all six native arm/forearm/hand drawings become invisible and one arm-only registered destination drawing appears in the `body-front` paint layer. The asset is locked by ID, path, SHA-256 `73e73755a77822989fd466ab6fe79591b176bbe9ea68940a46359c999a84e311`, position, width, rotation, opacity, and mutually exclusive native visibility. The runtime-rendered head, hair, face, torso, collar, strings, and pocket remain untouched.
- `excited-celebration` keeps the registered victory-fist drawings on the same authored Shrug wrist controls. It no longer imports unrelated source-frame wrist positions or scales fists up to force contact.
- `phone-use-sequence` is an intentional prop-free alias. It removes the phone while preserving the checksum-locked native gesture controls, drawings, cadence, deformation, and topology-derived overlay cuff ownership.
- Sequence gaps are explicitly zero, and the Format now defaults omitted gaps to zero. The release has no unintended white separator flashes.

## Inspection and watch

The official inspector re-rendered and passed all 141 recipe frames with zero failures. A separate registry audit passed all 12 actions and all 433 registered recipe frames. The release is 173 frames, 1280×720, H.264/yuv420p, 24 fps, and 7.208008 seconds. Its exact output checksum was watched completely at normal speed through `ended=true` in the in-app browser and sampled throughout all four actions. The contact sheet was inspected separately.

Codex performed and recorded the exact-hash review under the user's standing delegation; the receipt does not claim that the user personally watched or approved this release artifact.

## Learning-loop closure

**What did this teach us, and does the skill, runtime, or test suite need updating?**

Yes. Two failed abstractions were exposed: treating overlap as anatomy, and insisting that an incomplete recovered limb vocabulary must nevertheless form every destination pose. The promoted invariant is semantic anatomy certification with one narrow substitution escape hatch:

1. Prefer a continuous native shoulder-to-sleeve-to-hand chain and reject coordinate nudges, arbitrary scaling, or disconnected limb fragments.
2. A front overlay hand may record its recovered native sleeve owner as descriptive, validated recipe metadata, but the renderer derives actual ownership from rig topology and mattes at that finished cuff; the declaration cannot create ownership or relax rendered-role geometry limits.
3. If bounded native-rig experiments prove the supplied drawings and pivots cannot form an essential destination, allow one part-specific registered pose drawing only when it is artist-style matched, checksum- and transform-locked, replaces the complete corresponding native parts on the same frame, preserves the rig-rendered head/body, and passes normal-speed exact-hash review. Never mix it with visible native parts or use it as a generic full-character sprite.
4. A reused gesture keeps its authored wrist states; substitute the hand drawing without unrelated transforms or arbitrary scale inflation.
5. Inspect shoulder contact, cuff ownership, hand/sleeve proportion, hand/head proportion, temporal native-chain continuity, and either the native paint policy or the exact registered-replacement tuple per frame.
6. Normal-speed playback remains mandatory even when every mechanical gate passes.

`SKILL.md` 1.4, the rig-animation playbook, the renderer, the inspector, and focused regression tests now encode these rules.
