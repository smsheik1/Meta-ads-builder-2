# Lego audio shortcut experiment

Date: 2026-08-27

Status: technical pass; direct user visual verdict pending.

## Hypothesis

An agent can build a useful Shaz body-language performance by scheduling complete, already-recreated rig motions as immutable Lego blocks. The experiment must not author or alter limb controls, drawings, pose recipes, or camera motion.

## Exact experiment

- Source audio: the first 12.000 seconds of the supplied `0826.mov`.
- Fixed background: `sisters-room`, SHA-256 `740f61cbd58581b3c944fc77038fd51756305083b22ae3e28df0f1f5190ec485`.
- Reused blocks only: `neutral-listening`, `present`, `confident`, `point`, `shrug`, and `aha`.
- Every expressive block plays its complete registered recipe. Only its last frame may be held to fit the phrase.
- Neutral blocks provide pauses between expressive blocks.
- No manual rig-control, drawing, or pose-recipe changes were made for this performance.
- No lip-sync or camera motion was attempted.

The exact historical input is `fixtures/lego-body-language-sample-input.json`. It includes the still-unreviewed Shrug engineering recipe, so the source fixture is deliberately excluded from the downloadable kit. The official historical run is `agent-runs/lego-audio-proof-v1`.

## Result

- Output: 1280x720 H.264, 24 fps, 288 frames, 12.000 seconds, AAC audio.
- Output SHA-256: `97620cf8cc2e375f7729579a8377d0581c6387010a7d55dcb8db3e4a92f35ede`.
- Automatic result: pass. All six used registered poses passed their complete anatomy inspections; the background and audio hashes matched; camera motion was absent.
- Test suite: 91/91 passed after adding an audio-backed sequence regression.

## What worked

- Existing motions can be treated as indivisible blocks and scheduled against real audio without rebuilding their arms, hands, or body animation.
- The single official rig renderer can place those blocks over the fixed Sisters Room background and mux the user audio.
- The character remains complete and anatomically intact throughout the sampled poses.
- Sparse Neutral holds prevent constant gesturing and make the timeline easy for an agent to reason about.

## What did not work yet

- Existing expressive clips generally end on their destination pose rather than releasing to Neutral. Their exits therefore create visible hard cuts when followed by Neutral.
- Original face and mouth drawings remain inside each pose and are not synchronized to the supplied speech. Lip-sync was intentionally outside this experiment.
- This is a choreography proof, not evidence that every registered pose is visually approved or that arbitrary pose-to-pose interpolation is safe.

## Product conclusion

The shortcut is valid: reuse approved complete motions first, and make the agent choose and time them. Do not manually reanimate those poses. The next isolated capability is a small library of visually approved connectors or releases for only the blocks we decide to productize; it is not a new general animation system.
