# From reference clip to reusable Shaz action

This is the one promotion path for every new Shaz body-language action. A clip on a selection page is only a reference. Registered means runnable, not creatively approved. Neither is permission for a blind agent to use the action in a finished video.

There are two honest finish lines:

- **Sequence-ready:** the complete registered action has passed mechanical inspection and exact-output normal-speed review. It may be used as a whole clip in a sequence, with the known hard-cut behavior between actions.
- **Packet-ready:** the entry, readable hold, and release have each passed review and the action reaches an exact declared boundary state. It may be woven into a performance without inventing a transition.

An action can be sequence-ready without being packet-ready. Never describe a clean destination hold as a finished Lego block when its observed motion or boundary connectors are still missing. Pose-first is an authoring order, not permission to stop at a still.

## Status words

Use these words in plans, evidence, and review pages:

| Status | Meaning |
| --- | --- |
| `reference-only` | The artist clip has been isolated, but no runtime claim has been made. |
| `mapped-to-reviewed-action` | An existing reviewed action already covers the intended body-language beat. Do not create a duplicate ID. |
| `recipe-candidate` | A rig-native recipe or engineering run exists, but it is not in the production registry. |
| `registered-needs-review` | The registry can load and inspect the recipe, but a blind agent may not select it. |
| `sequence-approved` | The exact registered recipe and exact rendered video passed complete normal-speed review. |
| `packet-candidate` | Entry, hold, and release are represented, but one or more boundaries still need review. |
| `packet-approved` | The complete boundary-to-boundary motion passed review and is eligible in `motion-packets/index.json`. |
| `blocked` | A named technical or evidence gap prevents the next stage. Record the blocker, proof, and exact condition for resuming; do not weaken a gate. |
| `rejected` | The exact candidate was watched and failed. Preserve the receipt; do not quietly reuse it. |
| `superseded` | A newer exact candidate replaces this one. Keep the older evidence as history. |

Only `sequence-approved` actions belong in the safe sequence list. Only `packet-approved` actions may have `status: "eligible"` in the motion-packet registry.

## 0. Freeze the reference

Record the candidate ID, label, source file, source SHA-256, exact start and end times, source frame rate, and the isolated comparison clip. Note any cutaway or camera-contaminated frames.

Describe only the character-local action. Camera moves, background moves, mouth shapes, blinks, and story edits are separate tracks and must not become body-pose features.

## 1. Decide whether this is actually new

Compare the complete reference at normal speed with the current reviewed actions and current engineering recipes.

Choose exactly one route:

1. **Reuse:** an approved action already communicates the same mechanics and meaning. Map to it; do not add an alias recipe.
2. **Review:** the right rig-native recipe already exists. Inspect and review it before rebuilding anything.
3. **Promote:** a clean unregistered engineering candidate exists. Preserve its exact recipe and provenance, then take it through the remaining gates.
4. **Build:** the silhouette, direction, contact, or timing grammar is genuinely absent. Author one new action.

A similar mood is not enough. Open arms are not automatically a celebration; a left-facing presentation is not a safe substitute for a right-facing one.

## 2. Write the acceptance contract

Before touching controls, write down:

- the action's meaning and when an animator would use it;
- the setup, anticipation, accent, settle, hold, afterbeat, and release visible in the source;
- the required hand drawings, arm direction, torso/head relationship, and asymmetry;
- what must remain neutral or unchanged;
- the intended start and end boundary states;
- the exact source frames used for comparison; and
- visible reasons to reject it.

If the source supplies only a hold or only half an action, say so. Either give the smaller action an honest name or plan a separately reviewed connector. Do not fabricate missing motion with a generic tween. If the frozen reference shows no release, the reconstructed action ends on its last observed state; do not invent one.

When the reference comes from edited video, segment it before choosing the target. A single clip may contain two different holds separated by a cut or counter-shift. Lock one gold frame and one phase range per destination silhouette; do not average distinct poses into one recipe.

Keep the source action distinct from packet connectors. An authentic non-neutral source entry belongs to the action and must survive reconstruction. A neutral-to-action entry or action-to-neutral release is separate packet-readiness work with its own declared boundaries and review.

## 3. Build through the recovered rig

Use `runtime/rig-v2-renderer.mjs#renderRigFrame`, the registered rig hierarchy, and existing drawing substitutions. Keep the body independent from lip-sync and keep the camera/background fixed.

Never use finished artist-video frames as runtime sprites. Never add a second renderer or pose-specific rendering branch. Follow `poses/README.md` and `references/rig-animation-playbook.md`; they define the narrow part-substitution exception and the three-attempt limit.

Work on one unapproved action at a time. Preserve the authored stepped cadence instead of smoothing every output frame.

For a new video-guided action, solve a destination before reconstructing its motion:

1. render the closest complete native limb chain as a one-frame hold with a study-specific ID such as `<action>-destination-study`;
2. normalize the reference and runtime to the same character scale;
3. fit shoulder, elbow, wrist, palm centroid, palm angle, and torso line independently;
4. lock those targets in a focused regression; and
5. use the accepted study as one destination target while authoring the canonical full action.

A one-frame destination study cannot use the canonical full-action ID and cannot satisfy full-action inspection, review, or registration. If the frozen reference contains body motion, reconstruct every observed setup, authentic source entry, accent, counter-shift, distinct hold, and afterbeat before making action-review evidence. Pose-first is an authoring order; it does not reduce the action to its destination.

The canonical action ends where the frozen source ends. Never add a generic reverse, borrowed exit, or invented release to make it appear complete. Neutral boundary connectors are separate packet-readiness work: author and review them against declared states after the source action is honest, and never use them to replace or erase observed source motion.

Borrow native drawings and joint vocabulary, not an unrelated action's body deformation, facial track, timing, or release.

## 4. Pass mechanical inspection

Render the candidate through the official runtime and inspect every frame of every observed phase. The candidate must pass:

- recipe schema, exact source binding, and file SHA-256 checks;
- shoulder, sleeve, cuff, wrist, hand, and whole-body continuity;
- hand scale, orientation, and one visible hand role per side;
- drawing substitutions, palette colors, paint order, masks, and props;
- face, hairline, collar, hoodie, and pocket stability;
- fixed waist-up framing with no revealed lower hoodie boundary;
- left/right clipping plus documented intentional overhead fingertip exits; and
- authored timing, holds, deformation exposures, and frame count.

Do not weaken a threshold to make the candidate pass. Fix the action or mark it blocked.

## 5. Make the audition evidence

Create one review bundle that a person can understand without reading code:

- the isolated artist reference;
- the exact runtime candidate;
- synchronized source-versus-runtime playback at normal speed;
- a dense entry/hold/release boundary sheet;
- a contact sheet for quick navigation; and
- optional 0.5× playback for diagnosis only.

Normal speed is the approval view. A still image, one-frame destination study, contact sheet, slow-motion clip, successful command, or automatic inspection is not creative approval of a moving action.

## 6. Record exact-output human review

The reviewer must watch the complete moving candidate. The receipt names the exact video SHA-256, reviewer, date, complete-pass count, and concise notes, then records `approved`, `rejected`, or `inconclusive`.

Do not claim that the user watched something while they were away. An agent may approve only when the user explicitly delegated that exact responsibility; the receipt must name the agent and the delegation instead of attributing the watch to the user.

If rejected, preserve the candidate and reason. A later attempt gets a new checksum and a new review.

## 7. Register sequence readiness

After approval of the complete canonical action:

1. add the exact recipe file SHA-256 to `poses/index.json` and the authored index when applicable;
2. add or update focused regression tests for every reusable mechanical lesson;
3. add the action to the safe sequence list in `README.md` and `SKILL.md`;
4. keep its evidence beside the package; and
5. answer: **“What did this teach us, and does the skill, runtime, or test suite need updating?”**

Existing `registered-needs-review` recipes may stay registered as engineering material, but they remain outside the safe list until this stage is complete.

Never register a one-frame study under the full action's ID. A study may remain as calibration evidence under its study-specific ID, but it cannot satisfy or inherit the action's approval.

## 8. Promote packet readiness separately

To become a real rearrangeable Lego block, the already complete source action also needs:

- a declared neutral or compatible start state;
- a separately authored connector into the exact first frame of the approved action;
- a readable, stretchable hold frame or hold range;
- a separately authored connector from the exact last frame of the approved action;
- a declared end state; and
- complete normal-speed review of both boundaries in context.

The action's authentic non-neutral source entry stays inside the action; it is not the neutral boundary connector named above. Do not reverse-scrub entry frames and call that a release unless the exact reversed motion was directly reviewed and approved as a separate connector. Do not hide a snap with a crossfade. Until all boundary evidence passes, keep the motion packet `ineligible` even if the whole pose recipe is sequence-approved.

## 9. Prove blind use and seal the package

After the action set is complete, give a fresh agent only the sealed kit and two materially different unseen audio inputs. The agent must transcribe locally, choose only safe actions, anchor them to real words, render through the official path, and receive no manual pose or timing rescue.

For each output, run validate, render, inspect, full audio/video decode, normal-speed review, and checksum-bound delivery. Then run the complete package tests, `check`, registry inspection, smoke, deterministic ZIP rebuild, sidecar verification, fresh quarantined extraction, and archive-content audit.

If a blind run exposes hard pose snaps, that is transition evidence—not permission to claim packet readiness.

## Episode 5 Part 2 compatible-Xstage candidates

The supplied `PART2_F.zip` is a hybrid scene. Only five ranges expose the live `Puppet_Talk_Section_Group`; all other material is storyboard, animatic coloring, or flattened scene work and is excluded. The archive, canonical Xstage, live ranges, topology proof, and palette proof are locked in `evidence/episode5-part2-compatible-source.json`.

These candidates are extracted from component rig data, not traced from video. Their portable recipes stay pinned to the packaged runtime while `sourceAction` records the external Xstage and archive hashes. External deformation samples cover the complete canonical deformation topology, and only drawing IDs absent from the canonical rig are added under a source-hash namespace. The external scene's brown outline palette is converted at TVG-spec level before rasterization; the transform first reproduced three shared canonical assets byte-for-byte. Paired Open-Hand Emphasis and Enumerate List Items passed direct-source/extracted-source parity. Sheepish Side-Eye is retained only as a blocked extraction draft because that parity gate has not passed.

| Candidate | Source frames | Current honest status | Promotion work |
| --- | --- | --- | --- |
| Paired open-hand emphasis | 1683–1740 | `recipe-candidate` | The complete 58-frame character-local action is preserved at `poses/candidates/paired-open-hand-emphasis.json`. The semantic label is provisional, but the controls, four missing drawing IDs, deformation samples, and cadence are exact source data. Its current official render passes all 58 inspected frames with zero failures. Keep it unregistered until the exact source/runtime/difference bundle receives complete normal-speed human review. |
| Enumerate list items | 1795–1959 | `recipe-candidate` | The complete 165-frame four-beat enumeration plus authored release is preserved at `poses/candidates/enumerate-list-items.json`. Three missing drawing IDs are source-bound; all other artwork remains canonical Wiggly. The official inspector reports six failures: joint continuity at local frames 48, 49, 52, and 53 from source-authored detached Mouth drawing 3, plus facial pops at local frames 58 and 73 from authored Mouth 4→2 swaps. A native-source render and the portable recipe are byte-identical before canonical palette conversion, so these are source defects rather than reconstruction drift. Keep it unregistered and packet-ineligible pending a separately approved mouth repair and complete normal-speed human review. |
| Sheepish side-eye | 2817–2933 | `blocked` | `poses/candidates/sheepish-side-eye.json` is a checksum-locked 117-frame character-local extraction draft, not yet an exact reconstruction. The raw direct-Xstage render and extracted native-source recipe are not byte-identical because the direct shot retains unresolved outer scene placement; no exactness claim is allowed until a checksum-bound normalized-direct render matches the extracted recipe. The draft appears to contain a genuinely new full-body family, but it also has a detached mouth on local frames 4 and 7–12, an abrupt return on 13–15, and hard-cut entry and release boundaries. The official inspector reports 127 failures: ten mouth continuity/facial failures plus 117 hair-composite vocabulary failures because the current inspector does not yet certify the Hair4/Head_Base4/Bangs_back4 family. A 2× source/runtime proof shows that the extracted hair is visibly coherent, but it does not satisfy source parity. Resume by proving normalized-direct parity first; only then seek approval for a bounded mouth repair or trim, certify the hair family, author neutral connectors, and rerun every gate. |

None of these rows is in `poses/index.json`, the safe sequence list, or `motion-packets/index.json`.

## Primary Candidates 02–11

All ten rows below begin from the 0826 selection artifact. Listing them here does not approve them.

The unshipped source is `0826.mov`, SHA-256 `237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127`, 3840×2160, 30 fps, 125.500 seconds. The authoring worktree keeps the selection manifest and clips under `artifacts/shaz-0826-pose-selection-2026-08-26/`; the downloadable kit intentionally excludes finished artist video.

| # | Source range | Isolated clip | Clip SHA-256 |
| --- | --- | --- | --- |
| 02 | 00:11.967–00:13.067 | `clips/02-hand-to-chest-self.mp4` | `b1ba1e99f92915cf7f75b34c3a8288b5a15387e249212b3abfde0df3634aacfc` |
| 03 | 00:21.167–00:22.300 | `clips/03-hands-on-hips-confident.mp4` | `908bffe828746a6c70556fb01b929a62abbf95e4ecd70b979527b903f3ee4d65` |
| 04 | 00:23.200–00:25.850 | `clips/04-open-wide.mp4` | `a67b799cc733ea2f8296f5f388bf064bac5c2e38e352b37c85215b7b1dce5592` |
| 05 | 00:40.050–00:42.500 | `clips/05-shrug-question.mp4` | `53086909ab216b61f689a2bb92e6bc7e4d485a30a171c1e3c6a50118288e6ffa` |
| 06 | 00:47.250–00:50.750 | `clips/06-present-screen-left.mp4` | `f48bb751f215006cfcde078efd5a179715a849bca5d8145eb157ee3d30ff60a9` |
| 07 | 00:52.800–00:55.150 | `clips/07-key-point.mp4` | `7a2252a104d395f1cfc48ef8849a11e1df73264dccb74c97c4c8256df7993582` |
| 08 | 01:08.200–01:11.600 | `clips/08-heartfelt.mp4` | `20056ed75665b64ef628bff8522f3fe17d3e1b2d6a4b03fa884881bf4dc6506d` |
| 09 | 01:16.300–01:19.633 | `clips/09-low-side-present-explain.mp4` | `4e0552b1ea4b4f30228522f0a5bdd2dfedc2d38f132926143ba27b6d0aeccfae` |
| 10 | 01:32.700–01:34.550 | `clips/10-big-emphasis.mp4` | `07972d6a4143d576fa6f2f37fa279efa357deba03cfb9e2c00988ecfaad29b41` |
| 11 | 01:58.350–02:01.850 | `clips/11-present-screen-right.mp4` | `dc531adc7c95039cf21339427d3b6b1a42109555cac6bb51b65e5a19ae4bf3e1` |

| # | Reference | Current route | Current honest status | Promotion work |
| --- | --- | --- | --- | --- |
| 02 | Hand to chest / self | Build; three bounded candidates exhausted | `blocked` | Candidate 3 is preserved at `poses/candidates/hand-to-chest-self.json` and keeps the correct screen-right-origin one-hand self gesture, but full inspection rejects frames 3–27: right hand/sleeve area ratio 0.594 exceeds the fixed 0.56 limit. Resume only with authorization for a new bounded candidate that scales both right-wrist axes to exactly 97% of Candidate 3, then rerun all 27 frames and normal-speed review. Do not conflate it with two-hand Heartfelt. |
| 03 | Hands on hips / confident | Review proposed reuse of `confident` | `reference-only` | Confident itself is reviewed, but the 0826 reference is a different one-hand-on-hip silhouette. Decide from the normal-speed comparison whether the same communicative job is close enough before recording a mapping; do not add a duplicate ID prematurely. |
| 04 | Open wide | Review built rig-native candidate | `recipe-candidate` | The corrected 31-frame body-only candidate is preserved at `poses/candidates/open-wide.json`, inherits the complete neutral face, and passes the unchanged full inspector. It remains narrower than the artist reference, and its relaxed setup/release are not exact neutral boundaries. Keep it unregistered and packet-ineligible until complete normal-speed review. Do not relabel Shrug or the rejected celebration. |
| 05 | Shrug question | Review `shrug` | `registered-needs-review` | The right rig-native family exists. Render the exact current recipe and complete visual review before safe-listing it. |
| 06 | Present screen-left | Review built directional candidate | `recipe-candidate` | The exact left-arm source vocabulary is preserved at `poses/candidates/present-screen-left.json` with the opposite arm neutral and no whole-body stage nudge. Its 19 frames pass the unchanged inspector. The source-authored opposite hand intentionally continues below the bottom edge in the fixed waist-up crop; its native cuff/wrist chain remains intact. Exact-output creative review is pending. |
| 07 | Key point | Review `key-point`; reuse `aha` when the shorter beat is enough | `registered-needs-review` | Aha is already reviewed. The longer Key Point action still needs exact current-recipe review and separate release evidence. |
| 08 | Heartfelt | Promote built hold-only native candidate | `recipe-candidate` | The third bounded pass is preserved at `poses/candidates/heartfelt-chest-clasp-hold.json`; all 48 frames pass unchanged mechanical inspection. It remains unregistered pending exact-output normal-speed creative review. The recipe honestly covers only the two-hand clasp hold: it has no authored entry or release and is not #02's one-hand self-reference. |
| 09 | Low side-present / explain | Promote recovered recipe | `recipe-candidate` | The recovered motion is preserved at `poses/candidates/low-side-present.json`; its false crop-restoration claim is corrected without changing any control, drawing, or timing data. Its Xstage binding and fresh full inspection pass. The source-authored opposite hand intentionally continues below the fixed waist-up crop with its native cuff/wrist chain intact. It remains unregistered pending exact normal-speed creative review against the frozen 0826 clip. |
| 10 | Big emphasis | Review built rig-native candidate | `recipe-candidate` | The mechanically corrected third bounded native-rig pass is preserved at `poses/candidates/big-emphasis.json`; it now owns only body language and inherits the neutral eyebrow, eye, pupil, and mouth tracks. Its clean overhead open-palm V and full 31-frame inspection pass remain unregistered, unapproved, and packet-ineligible pending exact normal-speed review. The rejected `excited-celebration` is not a substitute. |
| 11 | Present screen-right | Review built full observed native-rig action | `recipe-candidate` | `poses/candidates/present-screen-right.json` reconstructs all 104 source frames as 83 runtime frames: the authentic cross-chest, nose-touch, and cheek-palm entry; Hold A; the observed five-step counter-shift; and Hold B. `evidence/candidate-11-present-screen-right-target.json` locks the normalized geometry for every phase. The reference has no release, so the candidate does not invent one. All 83 frames pass the official inspector with zero failures. The earlier one-frame fit is preserved separately as `poses/candidates/present-screen-right-destination-study.json`; it is calibration evidence, not the action. The full-action normal-speed review is still pending, so both artifacts remain unregistered, unapproved, absent from the safe list, and ineligible for motion packets. |

The engineering pass is complete enough for one review session: #03 has a proposed Confident reuse to decide; #05 and #07 review registered actions; #04, #06, #08, #09, and #10 have action or hold candidates; #11 now has the complete observed 104-to-83-frame action plus a separately named destination study, with full-action normal-speed review still pending; and #02 is blocked at its unchanged hand-proportion gate. Review each exact artifact before any mapping, registration, or safe-list change.
