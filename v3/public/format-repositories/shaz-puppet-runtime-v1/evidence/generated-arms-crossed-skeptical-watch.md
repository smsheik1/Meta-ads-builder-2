# Generated action watch: arms crossed / skeptical

- Official run: `agent-runs/arms-crossed-skeptical-certification-final`
- Recipe file: `poses/generated/arms-crossed-skeptical.json`
- Recipe file SHA-256: `0cd953fa72b44430495757b339787e0cd1755fdff917d771b85c698d980b726b`
- Canonical recipe SHA-256: `4aa715b51e14aaa694dbfb8fed4717ee4235eeeb016c91cd4508fdfc94263215`
- Input SHA-256: `5ed0f500791f296d0cd835c78cbec3818e21f4a7040cff154681507f30e5bfcb`
- Render SHA-256: `86c9df121e3e588aef8c6c787c7cce4b5227bca4d377b0bb1b2f66ce81e7595b`
- Validation receipt SHA-256: `0ec5540c7538afa2d14852c0854dbec9de9a8bee78185b38d7e769114cd53084`
- Quality report SHA-256: `e1842c0ebe30a9c774de6cdd17989b589f3b18753097254517f9408a66cadc44`
- Dense sheet SHA-256: `a70e436d258079da42e39fb0e545f6964c901886be431d7e98affbd79fd89ad2`
- Close-up SHA-256: `19ec360f8b4a912e568f049871c36c6f3280a2b851fea48ca02ca4a497b29621`
- Delivery SHA-256: `50c085453397a02d4574d5208a9bacb52a55cdda06edbc1fd089fa2f938d78b8`
- Automated inspection: PASS, 19/19 recipe frames and 27/27 output frames, zero failures
- Visual inspection: exact official render and synchronized close-up both watched completely at normal speed through `ended=true`; every output frame inspected in a dense chronological sheet
- Acceptance authority: Codex visual audit under explicit user delegation; this does not claim the user personally watched this checksum

## Accepted visual result

The action reads as neutral, bilateral anticipation, contact-only crossover, skeptical expression change, overshoot, and a settled folded-arm hold. The original upper arms remain attached at both shoulders. At contact, four checksum-locked drawings already present in the recovered rig take ownership of the depth crossover: two finished forearm sleeves and two side-resting hands. The front sleeve flattens across the torso, the second tucks behind it, and each hand lands on the opposite sleeve. No generic capsule redraw, detached limb, random prop, missing fill, construction seam, clipping, facial pop, or visible freeze remains.

## Candidate history

1. The first candidate tried to retain ordinary fixed-depth rig limbs through the whole crossover. The arms could bend, but they could not exchange depth and failed the arm-composite gate.
2. The second candidate used generic replacement shapes. It crossed mechanically but looked like detached capsules and ignored Shaz's authored sleeve and hand silhouettes.
3. The accepted candidate reuses registered rig drawings only at contact. Its first calibration still made a heart-shaped overlap, so the same candidate was refined with local aspect scaling, a flatter front forearm, a tucked rear forearm, and the correct side-resting hand drawings. This stayed within the third candidate rather than weakening a gate or opening a shadow run.

## Post-action retro

**What did this teach us, and does the skill, runtime, or test suite need updating?**

- Durable animation rule: when fixed recovered paint order cannot represent a limb depth crossover, preserve the real rig during anticipation and transfer semantic ownership only at contact to the smallest set of existing registered drawings. Do not globally reorder limbs and do not substitute a generic redraw.
- Durable silhouette rule: a reused drawing may need non-uniform local deformation to match the new gesture, but the source pixels, checksum, palette, and provenance must remain locked. Aspect calibration belongs in ordinary recipe data, not a pose-specific renderer branch.
- Runtime update: prop recipe keys now support a positive two-component local `scale`, interpolated like width and rotation, so registered substitutions can be lengthened or flattened without inventing new art.
- Test update: pose-recipe tests protect explicit local aspect scaling; crossed-arm regression tests protect the exact four prop identities, source-asset byte equality, contact-only swap, half-lidded expression, generator reproducibility, and the dedicated crossed-arm composite gate.
- Skill/playbook update: the depth-crossover substitution rule and its failure signature are recorded in `references/rig-animation-playbook.md`.
- Pose-specific calibration remains in `poses/generated/sources/arms-crossed-skeptical.mjs`; no storyboard pixels or artist-rendered frames are packaged or used at runtime.
