# Five supplied storyboard sequences: anatomy repair

Both earlier runs, `five-storyboard-sequences` and `five-storyboard-sequences-fixed`, are rejected and retained only as failure provenance. The second run still allowed a palm to touch the face while its wrist was detached, rendered the atomic crossed-arm assembly at roughly half size, kept victory fists below the approved hand/sleeve proportion, and used a tiny screen-space phone hand. Its written visual approval was invalid because its own contact sheet exposed those defects.

The accepted proof is the fresh run `agent-runs/five-storyboard-anatomy-repair`.

## Accepted sequence

1. `point-at-screen`
2. `facepalm-frustrated`
3. `arms-crossed-skeptical`
4. `excited-celebration`
5. `phone-use-sequence`

- Input SHA-256: `913fa5e7fac68bda238f58c77749a8e5c898e67fd65c3847ca11e386f6a73d12`
- Exact final video SHA-256: `68d3e40bd5fd537c11d1b4ebd584eaac38d6e7234cf458735e77e337b3f83a6c`
- Validation receipt SHA-256: `c6ffb83f55bebf5715c10a7a86d5815c657ca3d7139344f1c108808cfd048801`
- Quality report SHA-256: `f2932a33e8350c991b88e283f23f1a3a70f386a2c144e6639cf05e41323c5948`
- Human review SHA-256: `28378fb6abe7aa1b9a5e653cd3e2df36a8b1b8b5da8fad96928b71bc431f4801`
- Delivery receipt SHA-256: `1bac8bc4f8c3b161f1e8fb0104d24c7c5d3d6da2b06719f98cc3f818c924577c`
- Official contact sheet SHA-256: `0c376dd0f05fb45a1ab708e4ea242a6fe9402013fb9eebc80a1a3e5de4b8e494`
- Four repaired failure-site frames SHA-256: `e27fce77bc6686939170f7b285c1f1b9a267193fc9ec915a8a9e7c2d2820823a`
- Dense facepalm/crossed-arm transition sheet SHA-256: `76166747e4cab6c8e4999fd3b5d8f4992e5c14db27a36950ffa0c482e77a0dba`

## Repair

- `point-at-screen` needed no anatomy change. Dense review and the new joint gates confirmed its native shoulder/sleeve/hand chains were already intact.
- `facepalm-frustrated` keeps the front-of-face overlay drawing but re-registers its wrist to the real sleeve through approach, overshoot, settle, and hold. The formerly detached palm now records direct per-frame hand-to-sleeve contact.
- `arms-crossed-skeptical` keeps one atomic, checksum-locked crossover assembly and scales that whole assembly as a unit to preserve both hand and sleeve proportions. The four source pieces never render independently.
- `excited-celebration` keeps the registered victory-fist drawings in the native wrist hierarchies and calibrates their scale against the finished sleeves. Every active fist frame has measurable sleeve contact.
- `phone-use-sequence` deletes the screen-space tap-hand substitution. The authored overlay hand remains native and the phone follows it through pickup and hold.

## Inspection and watch

The official inspector re-rendered and passed all 177 recipe frames with zero failures. The final integration is 229 frames, 1280×720, H.264/yuv420p, 24 fps, and 9.541667 seconds. The exact MP4 was played through completely at normal speed in the in-app browser, then the four reported failure sites and the dense facepalm/crossed-arm transitions were inspected separately.

The accepted video contains no detached wrist, screen-space finger or hand, undersized crossed-arm assembly, undersized victory fist, missing hand fill, or independently drifting limb.

## Learning-loop closure

**What did this teach us, and does the skill, runtime, or test suite need updating?**

Yes. Whole-character connected-component checks were too coarse: a detached palm touching the face still made one connected alpha blob, and frame-to-frame stability could not reject a hand that was consistently too small. The promoted invariant is outcome-based joint certification:

1. Native frames measure each hand-to-sleeve contact directly.
2. Native frames enforce a hand/sleeve visible-area ratio.
3. Screen-space limb substitutions are forbidden.
4. The single permitted bilateral crossover assembly must meet minimum visible width, height, and area floors.
5. Normal-speed playback and dense transition inspection remain mandatory because structural allowlists are not visual proof.

`SKILL.md`, the rig-animation playbook, the inspector, and focused regression tests now encode those rules.
