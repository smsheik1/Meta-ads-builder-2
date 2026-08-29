# Candidate 04 — Open Wide neutral-face correction

Status: **`recipe-candidate`**. Mechanically clean. Exact-output creative review is pending. The candidate remains unregistered, unapproved, and packet-ineligible.

The final audit found one body/face separation violation: the body recipe replayed the recovered Shrug eyebrow control and pinned eye, pupil, and mouth drawings. The mechanical correction removes every eyebrow, eye, pupil, and mouth key while preserving the selected 31-frame arm/body motion. It is not a new creative pass and does not reset the bounded-attempt count.

- recipe: `poses/candidates/open-wide.json`
- deterministic generator: `poses/candidates/sources/open-wide.mjs`
- recipe file SHA-256: `e1e5554d834085e9b8164d666aaba7c0640b9c8949b1aec1823f95653e77bcfa`
- semantic recipe SHA-256: `37fb2215cbcfa2280af4eb8b14488f707cac1f1c6499dc4533bd8e72f0224a6f`
- generator SHA-256: `4f3f20749f3dfd01b67e9b6bc9a63b2999dd452c2efd0c2689b55f783292221e`
- exact official render SHA-256: `6005bc02e109c1855a0e1762b4084c876bc1da7f80932fd1f2385f6aacf74285`
- full inspection SHA-256: `96eaf1754e75ce8cffa020a77d39df29b8d93bbcba8d49823f75c24324d17ccc`
- canonical render receipt SHA-256: `39fa66919b2e0dfe06d5ac86e6587165e57a41e32809f5b5c91f5a4e72850550`
- inspection: `pass`; 31/31 frames, zero failures, maximum identical-frame run 1, maximum native sleeve crossover 0 pixels
- single-pass normal-speed comparison SHA-256: `90e26119730637dae016e0b772d46c6c6b992a2a7fa2370d23cd8bcd11fc933f`
- three-pass normal-speed comparison SHA-256: `d7176c7055fe4c23b82bbd29b313c4c79f1f9be6d46fa11c78dbf017fc07f833`
- dense 16-frame entry/hold/release sheet SHA-256: `36891b40b60d6542277af754767f0b890611c4e0c3e8a9bd7a25d29367c842f6`

The pending review receipt binds the corrected runtime and three-pass comparison. No human approval is claimed. The shape is still narrower than the artist reference, and its setup/release are not exact neutral-body boundaries.
