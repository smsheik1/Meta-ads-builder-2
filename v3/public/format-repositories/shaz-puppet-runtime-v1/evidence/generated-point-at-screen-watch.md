# Point at Screen certification

- Storyboard SHA-256: `ebbf669f1305636723cc37028d6a0daa5614a134ab2d6d91bd4d0cf3c8e974d3`
- Registered recipe file SHA-256: `cf762f655b0bb78ea990599dc824addb47402754d14f026ff1f24c8543ca8079`
- Semantic recipe SHA-256: `7e20c2b7b1106b7905813e956e4f5f53e8afa756a57e47f3534a680d3d4b476f`
- Exact runtime video SHA-256: `68dce672f76799c5557fedc76d4aeb6ee3014d90375eba9784bdb0eae446b7b6`
- Quality report SHA-256: `db3a7c1599e8ddebfa19109284165da9ef1079abf4755c652cb8b3e1a7d5f19d`
- Dense contact sheet SHA-256: `329b4153554b864c162e45cc44294cb7c917bc73bf938e6cf5ce8498928a769c`
- Close-up contact sheet SHA-256: `32bfb91e4942cfe0fcc25cc6eef2ec4c0716cbf2f069f86f4a4d5de3974f429b`
- Delivery receipt SHA-256: `a364b40e12f21751dd89b873a78420d00dcb24e4553b8ca2003a4c5fcc87dfcd`

## Intended motion

The supplied storyboard is a semantic and silhouette target, not runtime artwork. The certified 36-frame action begins with the complete artist-authored Present choreography, holds the open palm long enough to read, changes to the rig's real pointing-hand drawing, reaches toward an implied upper-right off-canvas target, changes to the tooth-bearing grin, overshoots, settles, and keeps the final hold alive. No storyboard pixels or finished artist-rendered frames are copied into the runtime.

The former literal screen prop was removed. The storyboard communicates a direction of attention; it does not require a visible object. The action therefore owns zero props and can be reused against any background or layout.

## Visual and mechanical acceptance

The exact `1.833333s`, 44-frame certification output was watched from the first frame through `ended=true` at normal speed. Every frame was also inspected in the dense sheet, and the face, teeth, shoulder, sleeve, wrist, hand, and pointing substitution were inspected in the close-up sheet.

Observed result:

- the open-palm setup, upper-right point, grin, overshoot, settle, and hold read as one action;
- the palm-to-point substitution is purposeful and attached;
- the shoulder and sleeve remain a continuous finished silhouette with no capsule seam;
- both tooth rows remain white and intact;
- hair remains behind the semantic eye envelopes;
- there is no screen prop, stray object, missing fill, clip, facial pop, or visible stage drift; and
- automatic inspection passed all 36 recipe frames with zero failures and a maximum identical run of two frames.

The review record names `Codex visual audit under user-delegated authorization`. This is an honest delegated acceptance and does not claim that the user personally watched the exact checksum.

## Retro

**What did this teach us, and does the skill, runtime, or test suite need updating?** Yes.

1. The old generator silently imported a mutable full Point recipe. When that certified recipe grew from 40 to 76 frames, regenerating Point at Screen changed its output from 46 to 82 frames. The source now checksum-locks both authored dependencies and a regression rebuilds the action in memory and requires exact equality with the registered recipe.
2. Whole-rig horizontal mirroring was impossible because the transform runtime honored flip flags only on READ nodes. The runtime now honors flip flags on PEG controls, with a matrix regression proving complete-descendant mirroring. Mirrored root position, angle, and skew are reflected together so the screen-space cadence stays registered instead of drifting or clipping.
3. The literal screen was a pose-specific semantic mistake, not a new general renderer rule. It is documented here and protected by the action regression requiring zero props; it was not promoted into unrelated animation code.

The reusable checksum-lock and hierarchy-flip lessons are promoted to the playbook and tests. No gate was weakened.
