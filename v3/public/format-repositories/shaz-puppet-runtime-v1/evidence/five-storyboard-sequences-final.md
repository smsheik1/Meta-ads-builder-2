# Five supplied storyboard sequences: corrected integration

The earlier `five-storyboard-sequences` approval is rejected and retained only as failure provenance. Its video used independently animated screen-space limb pieces that detached, changed scale, and snapped. The corrected proof is the fresh run `agent-runs/five-storyboard-sequences-fixed`.

## Corrected sequence

1. `point-at-screen`
2. `facepalm-frustrated`
3. `arms-crossed-skeptical`
4. `excited-celebration`
5. `phone-use-sequence`

- Input SHA-256: `913fa5e7fac68bda238f58c77749a8e5c898e67fd65c3847ca11e386f6a73d12`
- Exact final video SHA-256: `a8db3482387a5da85dddd9aac51cc1d6f56ddba1257ff3fc282be69f82cd6024`
- Validation receipt SHA-256: `d47b7583b25ee3d91ce35eb7121a53492206441445bda308bc7de5d7c901755c`
- Quality report SHA-256: `53fa21a16db7aae1d0fd63116dd599f8d351ebc933939fe0657ba74d771b27f7`
- Human review SHA-256: `1368f50db21f78d4102b20c33c1e1c46b3195db6947e7825919d8d03bcc18fa6`
- Delivery receipt SHA-256: `ed27a5ed1d3e5f1381b71191a298df7f290d79c7292a1f18ed5be3ee75df0c31`
- Official contact sheet SHA-256: `455af00497b89f7e69c427aa8b185486bf7482c09af9c763c4822effe5eb3200`
- Dense 6-fps review sheet SHA-256: `312523ba9f416e68810d622454f2a436235e6c3b455b034d219b13ca1996acbe`

## Repair

- Point now drives the connected native arm from its common arm-move control; the hand is not separately rotated.
- Facepalm keeps the already-correct native sleeve plus registered front-hand channel.
- Crossed Arms keeps native connected anticipation, then performs one contact-frame swap to a checksum-locked torso-local assembly. Its four component limb images never render independently.
- Celebration uses the rig's native left and right wrist hierarchies plus the registered fist drawings. It has no fist props.
- Phone directly reuses the intact registered phone interaction. The former four-piece pickup bridge is removed; only the phone and one contact-only tap hand remain.

## Inspection and watch

The official inspector rendered every action frame and passed all 158 recipe frames with zero failures. The final integration is 229 frames, 1280×720, H.264/yuv420p, 24 fps, and 9.541667 seconds. Its exact MP4 was watched twice from start to `ended=true` at playback rate 1. A separate chronological 6-fps sheet was inspected across the whole video.

No detached, duplicated, missing, oversized, undersized, independently drifting, or scale-popping limb was observed. All five actions preserve a readable shoulder-to-sleeve-to-hand assembly.

## Learning-loop closure

**What did this teach us, and does the skill, runtime, or test suite need updating?**

Yes. The repeated failure came from the abstraction, not the coordinates: several screen-space limb pieces cannot be trusted to behave like one rig chain. The skill and playbook now require native ancestor-driven limbs or one atomic torso-local contact assembly. The runtime inspector now includes visible props in whole-figure continuity analysis, permits at most one registered limb substitution, rejects the old multi-piece pattern, and checks substitution scale and one-frame travel. Focused tests prove the formerly accepted Crossed Arms, Celebration, and Phone structures can no longer pass.
