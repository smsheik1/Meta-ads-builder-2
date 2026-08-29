# Candidate 02 — Hand to chest / self

Status: **blocked at mechanical inspection**. This is not registered, safe-listed, sequence-approved, or packet-eligible. Creative approval was not requested because the third and final bounded candidate failed a fixed mechanical gate.

## Frozen reference

- Source: `0826.mov`
- Source SHA-256: `237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127`
- Isolated range: 00:11.967–00:13.067 at 30 fps
- Isolated clip: `02-hand-to-chest-self.mp4`
- Clip SHA-256: `b1ba1e99f92915cf7f75b34c3a8288b5a15387e249212b3abfde0df3634aacfc`
- Reference pixels were used only for comparison. Runtime rendering uses recovered rig controls and native drawings.

## Acceptance contract

The action means “me,” “my experience,” or a restrained personal/sincere emphasis. It is a one-hand self-reference, not the bilateral clasp in Candidate 08 Heartfelt.

- Setup: hands-on-hips stance.
- Entry: a fast three-frame move by the arm originating on screen-right.
- Destination: the screen-right open palm crosses toward the upper chest and points screen-left; the screen-left arm stays braced at the hip.
- Hold: the source holds the chest-contact destination through the end of the isolated clip.
- Release: none is authored in the selected reference, so none may be invented or claimed.
- Neutral tracks: camera, background, facial acting, blinks, and mouth/lip-sync do not belong to the body recipe.
- Reject for: the wrong arm, a two-hand clasp, a detached cuff/wrist, an over-model hand, baked camera or facial motion, or a fabricated generic release.

## Rig-vocabulary audit

The certified Think action contains useful checksum-locked chest-entry timing, but it reaches the chest from the opposite screen side and therefore is not an exact reuse. Candidate 3 reflects only the paired arm-control deltas into the screen-right rig chain, keeps the native screen-right wrist base, uses native `Right_Hand` drawing `2`, and borrows the checksum-locked screen-left hip brace from Confident. It does not import Think facial controls or drawings and does not use artist-rendered frames.

Locked inputs:

- `poses/authored/think.json`: `6fc21c25dd49a6bf18eae49886c6ebb95a41367461a792655d450377ddb16d12`
- `poses/authored/confident.json`: `53496ec22e505fa44673260935ccaa4edc9ea87796b99a1c79031b825c804c1c`
- Xstage manifest source: `507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca`

## Three bounded full-motion candidates

| Attempt | Result | Evidence |
| --- | --- | --- |
| 1 | Failed mechanical layer-order gate. It used Think on its original screen side and declared a crossed-arm order without observed native sleeve crossover. It was also the wrong semantic direction. | Recipe semantic SHA `2f6e7b80806d7287aab26cde606614692cd78b8959382222da731c54130fedbc`; output SHA `bf2607152b1fd186e2d8d42e72917b2bcce28c40723f2e3da5ff07cabbac00fb`. |
| 2 | Mechanically passed under a temporary native left-front policy, but was rejected before promotion because it still moved the wrong arm. The temporary policy was reverted and is not part of the package. | Recipe semantic SHA `19faef0d4d3bb68f5b11b0c3353e7e75e9d25d53295641f8253530e3a83b0e7f`; output SHA `bf2607152b1fd186e2d8d42e72917b2bcce28c40723f2e3da5ff07cabbac00fb`. |
| 3 | Correct semantic direction and native counterpart drawings. Failed only the fixed limb-proportion gate on frames 3–27. | Preserved runtime output SHA `9186268ba428714ae4796c11c7f903ac6c7a531d472c010ea4c119b883778a9e`. |

The ceiling in `references/rig-animation-playbook.md` is therefore exhausted. No fourth candidate was made and no threshold was relaxed.

## Preserved Candidate 3

- Recipe: `poses/candidates/hand-to-chest-self.json`
- Generator: `poses/candidates/sources/hand-to-chest-self.mjs`
- Recipe file SHA-256: `3267363d573ddd4264f94814f4995cdd9df7e5c1fb7f027eecd646626149a0a1`
- Semantic recipe SHA-256: `06ccfc1834b7978a9e2eef22be0397603f1af97d896c4a20b705e5882f370d64`
- Exact official-render output SHA-256: `9186268ba428714ae4796c11c7f903ac6c7a531d472c010ea4c119b883778a9e`
- Render receipt SHA-256: `2659ff60c94a474929eb085747e9bc4147571e42175fe6246f779d1f6db13463`
- Inspection receipt SHA-256: `9fde8ffc326c41a9a8a6ca358a7a723099ac3ecace32012600708540e90094e8`
- Inspection: 27/27 frames checked; 25 failures, all the same limb-proportion issue on frames 3–27.
- Exact failure: right hand/sleeve alpha-area ratio `0.594`, above the unchanged native open-hand maximum `0.56`.
- Other inspection gates: pass, including provenance, layer order, arm composite, scale stability, temporal continuity, attachment, hair/eye/collar/mouth ownership, clipping, joints, face stability, props, and motion.

## Re-entry condition

Resume only if a new bounded candidate is explicitly authorized. Multiply both Candidate 3 right-wrist scale axes by exactly `0.97`—a 3% reduction—then rerender and inspect all 27 frames without changing the proportion gate. If it passes, create a new checksum-bound normal-speed comparison and request exact-output creative review. A release remains separate work because the source does not contain one.

The shared visualization bundle `shaz-primary-pose-promotion-2026-08-29/02-hand-to-chest-self/` preserves all three attempts, the final blocked recipe and reports, contact sheets, and a labeled 1× source-versus-runtime comparison.
