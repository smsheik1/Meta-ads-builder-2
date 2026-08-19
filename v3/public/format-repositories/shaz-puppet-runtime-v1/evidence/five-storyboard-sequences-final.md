# Five supplied storyboard sequences: final integration

## Scope decision

The supplied Point and Facepalm sheets are byte-identical to the sources already used to certify `point-at-screen` and `facepalm-frustrated`. The Crossed Arms and Celebration sheets resolve to the already-certified phases in `arms-crossed-skeptical` and `excited-celebration`. Those four actions were reused rather than duplicated. The real missing behavior was the phone sheet's two-handed hold, pickup, and handoff into the certified one-handed interaction; that behavior is registered as `phone-use-sequence`.

## Certified sequence

1. `point-at-screen`
2. `facepalm-frustrated`
3. `arms-crossed-skeptical`
4. `excited-celebration`
5. `phone-use-sequence`

The official integration run is `agent-runs/five-storyboard-sequences`.

- Input SHA-256: `913fa5e7fac68bda238f58c77749a8e5c898e67fd65c3847ca11e386f6a73d12`
- Exact final video SHA-256: `c46892040419fb9d53aedae3222adc53524f33d5b43443d90d473fad80c6b069`
- Validation receipt SHA-256: `b40a9f694a978ad79316541d1171b27afc5d98f02b19a6fbacad39a57ca850d2`
- Quality report SHA-256: `365368c2eba673e5f4e59835372a0bb93dc14c7413e0b63e0b201ef83b9a7623`
- Human review SHA-256: `cbdf7251031e4a1dd99e2ec9dc8418808d2fa5e84fe40fbb5ef67204e12ba723`
- Delivery receipt SHA-256: `40690fce67df85f11ee329c5b21655b0dfb4fa515aac4d212d8cbd7241785f0a`
- Dense 254-frame sheet SHA-256: `dd0adb05309a374a221cafce2bde8fc2cff129b778f4b4ed869d47f26c371252`
- Tight-crop playback SHA-256: `b3abddfdf05ea661bfb306de9de9656b9bba23e650f9a754436a787e0aa4280d`
- `phone-use-sequence.json` SHA-256: `1b94860dc43f831cfcf1e1969f66d61e2ed353cc1053270ead700d75e91f19b8`

## Watch and inspection

The exact 10.583333-second 1280×720 output and its complete tight-crop derivative were each watched at normal speed through `ended=true`. All 254 frames were inspected in one chronological dense sheet. The automatic run inspection passed with zero failures:

- Point at Screen: 36/36 frames; maximum identical run 2 frames
- Facepalm/Frustrated: 36/36 frames; maximum identical run 2 frames
- Arms Crossed/Skeptical: 19/19 frames; maximum identical run 1 frame
- Excited Celebration: 31/31 frames; maximum identical run 1 frame
- Phone Use Sequence: 80/80 frames; maximum identical run 2 frames

The phone sequence establishes the device before the reach, replaces the complete conflicting native arm chain only during bilateral contact, uses checksum-locked rig sleeve and hand drawings, restores native limbs on the same boundary that removes the contact replacements, and then continues through the registered one-handed tap. No random prop pop, construction capsule, duplicate limb, armless gap, missing fill, seam, clipping, or visible freeze was observed.

## Learning-loop closure

**What did this teach us, and does the skill, runtime, or test suite need updating?**

Yes. A short bilateral prop interaction must be treated as one atomic contact silhouette when partial limb substitution exposes construction art. The prop must be established before contact, every conflicting native arm-chain drawing must be hidden for the exact contact window, and canonical limbs must return on the same frame replacements disappear. This durable rule is recorded in skill version 1.1 and the rig-animation playbook. `registeredPhoneSequenceCompositeValid` and focused regressions now enforce the permitted contact and tap phases. Pose-specific coordinates remain in the generator.
