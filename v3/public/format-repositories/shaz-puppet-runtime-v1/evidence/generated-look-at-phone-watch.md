# Look at Phone certification

> **Status: HISTORICAL EXACT-HASH RECORD.** The current recipe has changed since this watch. Its renewed exact-hash visual review is still pending in `ROADMAP.md`; retain this page for motion and failure provenance only.

- Registered recipe: `poses/generated/look-at-phone.json`
- Recipe file SHA-256: `5610a09d190d234e5b6d5f1bccf17e491088608eda0d1d9cdb4864808190cd08`
- Canonical recipe SHA-256: `f0ac036665293dc57265c7a4c01a4b12f4a40e8812ed1a83ff3d43b5e6e613bb`
- Exact certification video SHA-256: `721899ef4dde5e6bafa6066544cc0b9f02528b369e1bd3b827882037a3bc1b32`
- Validation receipt SHA-256: `2d248e3745dc761bfd35fc9e3c41e3670b1c3d1a6f81900374d7dfcc92c9826e`
- Quality report SHA-256: `9dde07e9d7329a164f3cc6ece184ba445800352f74feb2e000a8ca4e9470f12b`
- Human review SHA-256: `574407de4e124563b123477099d3fa0f30d02c37ad27ab3cad76f06324e7424a`
- Dense 63-frame sheet SHA-256: `a513fed5b0e4bad25b5fae833c62806833359e8ad9a24937f47d8c72269c519b`
- Square-pixel close-up SHA-256: `bbd40aa2401f779bef4d714e9330d58d46b3b0239184ade51d2d9cd6fca70f61`
- Automatic inspection: PASS, 55/55 recipe frames, zero failures, maximum identical run 1 frame
- Official finalization: ready, no provider calls, $0

## Visual result

The exact 2.625-second output and corrected 1280×720 square-pixel close-up were each watched completely at normal speed through `ended=true`. Every one of the 63 output frames was also inspected in chronological dense evidence.

The phone begins beside the lowered hand, rises during the real Think sleeve anticipation, and settles outside the face. The original front contact hand is hidden at frame 7 and replaced only by byte-identical registered `left-hand-08` artwork. Its fingertip remains horizontally registered over the device while the real sleeve, shoulder, free arm, head, hair, and torso keep their recovered attachment and overlap. The shifted pupils read toward the phone. There is no floating device, detached sleeve, missing fill, construction seam, facial occlusion, clipping, facial pop, or visible freeze.

## Rejected candidates

1. The inherited baseline passed mechanical inspection but failed semantics: a large phone floated over the chest while both arms continued the borrowed Think pose.
2. Candidate 1 moved and reduced the phone near the face, but the device still lacked visible contact ownership and partially crowded the face.
3. Candidate 2 added a holder sleeve, holder hand, and tapper, but the extra front sleeve detached from the recovered shoulder chain. It was rejected even though its intent was clearer.
4. Candidate 3 retained the complete real limb chain and substituted only the exact contact hand. This is the accepted result.

## Post-action retro

**What did this teach us, and does the skill, runtime, or test suite need updating?**

- Visible behavior: a prop can be present and correctly animated yet still read as floating when no attached body part visibly owns contact.
- Root cause: the initial action treated phone placement and arm choreography as independent systems. Replacing an entire forearm to repair that relationship created a second, worse attachment break.
- Smallest reusable correction: preserve the real attached limb chain when its sleeve topology is already sound; at contact, replace only the smallest registered drawing that cannot express the interaction. Keep the prop spatially registered to that contact drawing.
- Skill/playbook: updated with the prop-contact ownership rule and its failure signature.
- Runtime/tests: added the exact `registered-phone-interaction` arm-composite inspection mode; byte-provenance, generator reproducibility, contact-frame visibility, and prop-to-fingertip registration are regression tested.
- Pose-specific details: phone coordinates and tap-hand calibration remain in this generator and were not promoted as universal values.
