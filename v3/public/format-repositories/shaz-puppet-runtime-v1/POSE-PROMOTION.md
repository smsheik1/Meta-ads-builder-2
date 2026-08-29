# From reference clip to reusable Shaz action

This is the one promotion path for every new Shaz body-language action. A clip on a selection page is only a reference. Registered means runnable, not creatively approved. Neither is permission for a blind agent to use the action in a finished video.

There are two honest finish lines:

- **Sequence-ready:** the complete registered action has passed mechanical inspection and exact-output normal-speed review. It may be used as a whole clip in a sequence, with the known hard-cut behavior between actions.
- **Packet-ready:** the entry, readable hold, and release have each passed review and the action reaches an exact declared boundary state. It may be woven into a performance without inventing a transition.

An action can be sequence-ready without being packet-ready. Never describe a clean destination hold as a finished Lego block when its entry or release is still missing.

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

If the source supplies only a hold or only half an action, say so. Either give the smaller action an honest name or plan a separately reviewed connector. Do not fabricate missing motion with a generic tween.

## 3. Build through the recovered rig

Use `runtime/rig-v2-renderer.mjs#renderRigFrame`, the registered rig hierarchy, and existing drawing substitutions. Keep the body independent from lip-sync and keep the camera/background fixed.

Never use finished artist-video frames as runtime sprites. Never add a second renderer or pose-specific rendering branch. Follow `poses/README.md` and `references/rig-animation-playbook.md`; they define the narrow part-substitution exception and the three-attempt limit.

Work on one unapproved action at a time. Preserve the authored stepped cadence instead of smoothing every output frame.

## 4. Pass mechanical inspection

Render the candidate through the official runtime and inspect every frame. The candidate must pass:

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

Normal speed is the approval view. A still image, contact sheet, slow-motion clip, successful command, or automatic inspection is not creative approval.

## 6. Record exact-output human review

The reviewer must watch the complete moving candidate. The receipt names the exact video SHA-256, reviewer, date, complete-pass count, and concise notes, then records `approved`, `rejected`, or `inconclusive`.

Do not claim that the user watched something while they were away. An agent may approve only when the user explicitly delegated that exact responsibility; the receipt must name the agent and the delegation instead of attributing the watch to the user.

If rejected, preserve the candidate and reason. A later attempt gets a new checksum and a new review.

## 7. Register sequence readiness

After approval:

1. add the exact recipe file SHA-256 to `poses/index.json` and the authored index when applicable;
2. add or update focused regression tests for every reusable mechanical lesson;
3. add the action to the safe sequence list in `README.md` and `SKILL.md`;
4. keep its evidence beside the package; and
5. answer: **“What did this teach us, and does the skill, runtime, or test suite need updating?”**

Existing `registered-needs-review` recipes may stay registered as engineering material, but they remain outside the safe list until this stage is complete.

## 8. Promote packet readiness separately

To become a real rearrangeable Lego block, the action also needs:

- a declared start state;
- an authored entry;
- a readable, stretchable hold frame or hold range;
- an authored release;
- a declared end state; and
- complete normal-speed review of both boundaries in context.

Do not reverse-scrub entry frames and call that a release unless the exact reversed motion was directly reviewed and approved. Do not hide a snap with a crossfade. Until all boundary evidence passes, keep the motion packet `ineligible` even if the whole pose recipe is sequence-approved.

## 9. Prove blind use and seal the package

After the action set is complete, give a fresh agent only the sealed kit and two materially different unseen audio inputs. The agent must transcribe locally, choose only safe actions, anchor them to real words, render through the official path, and receive no manual pose or timing rescue.

For each output, run validate, render, inspect, full audio/video decode, normal-speed review, and checksum-bound delivery. Then run the complete package tests, `check`, registry inspection, smoke, deterministic ZIP rebuild, sidecar verification, fresh quarantined extraction, and archive-content audit.

If a blind run exposes hard pose snaps, that is transition evidence—not permission to claim packet readiness.

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
| 02 | Hand to chest / self | Build | `reference-only` | Distinguish the one-hand self gesture from two-hand Heartfelt, then author and review it. |
| 03 | Hands on hips / confident | Reuse `confident` | `mapped-to-reviewed-action` | Use the existing reviewed Confident action; do not add a duplicate candidate ID. |
| 04 | Open wide | Build | `reference-only` | Author the true wide bilateral silhouette. Do not relabel Shrug or the rejected celebration. |
| 05 | Shrug question | Review `shrug` | `registered-needs-review` | The right rig-native family exists. Render the exact current recipe and complete visual review before safe-listing it. |
| 06 | Present screen-left | Build exact directional variant | `reference-only` | Approved `present` is useful comparison material, but its opposite hand rests on the hip. Preserve the reference's neutral opposite arm. |
| 07 | Key point | Review `key-point`; reuse `aha` when the shorter beat is enough | `registered-needs-review` | Aha is already reviewed. The longer Key Point action still needs exact current-recipe review and separate release evidence. |
| 08 | Heartfelt | Build | `reference-only` | Author the two-hand chest-clasp action and solve crossover/paint order without merging it with #02. |
| 09 | Low side-present / explain | Promote recovered recipe | `recipe-candidate` | The exact ignored-run recipe is now preserved at `poses/candidates/low-side-present.json`; its Xstage binding and fresh full inspection pass. It remains unregistered pending exact normal-speed creative review against the frozen 0826 clip. |
| 10 | Big emphasis | Review built rig-native candidate | `recipe-candidate` | The third bounded native-rig pass is preserved at `poses/candidates/big-emphasis.json`; its clean overhead open-palm V and full 31-frame inspection pass remain unregistered pending exact normal-speed review. The rejected `excited-celebration` is not a substitute. |
| 11 | Present screen-right | Build exact directional variant | `reference-only` | Author the right-facing action. Do not mirror the whole asymmetrical character as a shortcut. |

The efficient order is #03 reuse verification, #05 review, #07 review, #09 promotion, then one new build at a time: #02, #08, #04, #10, #06, and #11. The order puts cheap certainty first and keeps the two chest-contact actions adjacent for shared learning without authoring them simultaneously.
