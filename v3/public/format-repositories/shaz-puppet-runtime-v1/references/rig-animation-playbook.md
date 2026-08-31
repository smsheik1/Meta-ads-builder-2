# Shaz rig animation playbook

Read this file completely before recreating, creating, diagnosing, or certifying a Shaz action. Keep `SKILL.md` concise; store rig-specific techniques and proven failure patterns here.

## Definition of done

An action is certified only when:

- the complete candidate has been watched at normal speed;
- dense frames and relevant close-ups have been inspected;
- the character remains on-model with continuous finished silhouettes;
- every semantic shoulder, cuff, and wrist joint remains credible at on-model proportions;
- deformation, substitutions, expression, timing, and framing read correctly;
- automatic pose inspection and focused regression tests pass;
- synchronized reference comparison passes when an artist reference exists;
- human approval names the exact output checksum, or an explicit user delegation authorizes the agent to perform and document that exact-hash visual acceptance without attributing the watch to the user; and
- the post-pose learning question has been answered.

## Analyze before authoring

Use the smallest combination that answers the current uncertainty:

1. Watch the complete reference and candidate at normal speed to judge rhythm, weight, and readability. Normal speed is the certification view; slow motion is diagnostic only because it can conceal a low-speed crawl.
2. Decode every frame or create a dense chronological sheet to find one-frame accents, holds, pops, and substitution changes.
3. Segment edited references before choosing a target. Treat distinct holds separated by a cut or counter-shift as separate destination silhouettes; lock one gold frame and phase range for each.
4. Inspect contextual frames before and after every proposed action boundary. A complete action normally includes setup, accent, settle, and release; if only one readable subgesture is intended, register it under that narrower meaning instead of borrowing the full action's label.
5. Align reference and candidate by action phase, not merely by equal timestamps.
6. Inspect close crops of shoulders, elbows, hands, face, mouth, hairline, collar, and any changing silhouette.
7. Measure consecutive-frame differences, exposure-change frames, and longest identical-frame runs to distinguish deliberate stepped timing or a living hold from an accidental freeze.
8. Inspect alpha bounds and connected components for detached fragments, missing fill, or clipping.
9. Inspect the Xstage hierarchy, PEG controls, deformation channels, drawings, and source substitutions when visual evidence does not identify the cause.

Rendered artist animation frames may be used to identify phases, presentation cadence, and acceptance criteria. Never copy, resample, or embed those animation frames as runtime sprites, deformation data, or generated pose artwork. A user-supplied pose-design drawing is different: it may be registered transparently as destination artwork only under the bounded substitution rules below.

## Author in the right order

For video-guided reconstruction, use a pose-first, connector-second pass before the stages below. Render one native destination hold, normalize it to the artist frame, and solve the complete chain in order: shoulder, elbow, wrist, palm center and angle, then torso relationship. Lock those measurements in a focused test. Do not import the donor action's deformation, face, cadence, or release merely because its hand drawing is useful. After the exact hold passes review, author entry and release as separate boundary work.

### Canonical tutorial: reconstruct a reusable action from a compatible Xstage

Use this procedure whenever the exact Harmony rig animation exists. Do not rebuild that action from video. This is a **source-repository maintainer workflow**: the downloadable runtime kit intentionally excludes the Xstage conversion, TVG compilation, and compatible-asset registration tools.

`SKILL.md` version 2.3 is the instruction revision that routes maintainers here. The Format package remains version 0.5.0; those numbers describe different things.

Required inputs:

- the complete source archive, not a lone `.xstage` file; it must retain the scene's elements, palettes, drawings, TVGs, and other linked data;
- the named non-backup Xstage that actually produced the animation;
- the packaged Shaz runtime manifest and asset receipt; and
- whenever possible, a native Toon Boom video export from that exact Xstage version.

The native Toon Boom export is the independent Harmony-fidelity authority. A custom direct-Xstage render and an extracted-recipe render share Wiggly's parser, channel sampler, asset compiler, and renderer; agreement between them is useful internal-consistency evidence, but it is circular and cannot prove either path matches Toon Boom. **No native export means Harmony fidelity remains unproven and the result stays a candidate.** Native video is review evidence only and never becomes a runtime sprite, deformation source, or finished-frame shortcut.

#### Maintainer setup

Run this workflow from `v3/public/format-repositories/shaz-puppet-runtime-v1` in the source repository, not from the sealed ZIP. The sealed `requirements.json` describes end-user runtime requirements; compatible-Xstage authoring additionally needs Info-ZIP `unzip`, Python 3, Rust/Cargo, ffmpeg, ffprobe, the sibling `animal-conversations-v1` converter, and the complete unpacked Harmony archive. If you have only the sealed ZIP, stop and obtain the Wiggly source monorepo containing that sibling converter; never recreate or download look-alike authoring tools around the package boundary.

Prepare both Node workspaces and the TVG exporter once per clean checkout:

```sh
npm install
npm --prefix ../animal-conversations-v1 install
cargo build --locked --quiet \
  --manifest-path ../animal-conversations-v1/converter/source/Cargo.toml \
  -p tvg --example export_spec
```

The exporter binary is intentionally gitignored. `runtime/compile-tvg-assets.mjs` expects it at the Cargo target path built by that command. Toon Boom Harmony is needed only to make the independent native export; no checked-in local command can manufacture that authority.

#### Step 1: freeze every source

Verify the archive, then hash the complete archive, chosen Xstage, and native Toon Boom export:

```sh
unzip -t /absolute/path/source.zip
shasum -a 256 /absolute/path/source.zip \
  /absolute/path/unpacked/scene.xstage \
  /absolute/path/native-export.mp4
ffprobe -v error -show_streams -show_format -of json \
  /absolute/path/native-export.mp4
```

Record native resolution, frame rate, decoded frame count, duration, and the exact Xstage-frame-to-video-frame mapping. A common full-scene 24 fps export maps Xstage frame `f` to zero-based video frame `f - 1`, but measure it instead of assuming it. Preserve original source files outside the package; package only checksums and evidence.

#### Step 2: isolate the real puppet action

Find ranges where the live puppet group actually reaches the scene composite. Exclude storyboard panels, animatic coloring, flattened drawings, cameras, background moves, static shot wrappers, and unrelated scene layers. Inspect frames before and after the proposed cut so setup, accent, settle, hold, afterbeat, and authored release are not accidentally trimmed away.

Export or cut the native reference on decoded frame boundaries. For a measured 24 fps `f -> f - 1` mapping, this produces an exact silent review clip:

```sh
ffmpeg -hide_banner -loglevel error -y \
  -i /absolute/path/native-export.mp4 \
  -vf "select='between(n,START_MINUS_ONE,END_MINUS_ONE)',setpts=N/(24*TB)" \
  -an -r 24 /absolute/work/native-action.mp4
```

Replace the two zero-based values explicitly; do not paste arithmetic into the command and hope the shell or ffmpeg interprets it the same way. Probe the clip and require `END_FRAME - START_FRAME + 1` decoded frames.

#### Step 3: generate the compatible runtime manifest

The converter prints JSON to standard output:

```sh
python3 ../animal-conversations-v1/converter/scene_runtime_manifest.py \
  /absolute/path/unpacked/scene.xstage \
  > /absolute/work/compatible-runtime.json
```

This manifest hashes and parses the Xstage. It does not validate the archive or resolve every linked TVG and palette; archive integrity and linked artwork are proved by the archive hash and the compile step below. `../animal-conversations-v1/converter/sample_scene.mjs` is useful for inspecting one frame, but it is a diagnostic, not a topology comparator.

#### Step 4: compile the action's used drawings after palette normalization

Compile every renderer-known drawing exposed during the proposed source range. When the source outline differs from canonical black, declare the exact source and destination RGBA bytes:

```sh
node runtime/compile-tvg-assets.mjs \
  --manifest /absolute/work/compatible-runtime.json \
  --rig /absolute/path/unpacked/scene-root \
  --output /absolute/work/compiled-assets \
  --range START_FRAME-END_FRAME \
  --node-prefix Top/Puppet_Talk_Section_Group/ \
  --outline-source-color 77,17,3,255 \
  --outline-color 0,0,0,255
```

Use the same `--node-prefix` here and in the importer. The compiler resolves renderer READs only inside that boundary; it never falls back to a same-named storyboard node elsewhere in a hybrid scene. Omit both outline options when no palette conversion is required. The receipt binds each source TVG hash, raster hash, variant, dimensions, origin, and any palette replacement. Compile into a dedicated work directory; the command stages a complete exact asset tree before replacing an earlier result. Never recolor finished video frames or overwrite canonical assets.

A compatible scene may legitimately mix the declared outline color with drawings that contain no such stroke. Record the exact replacement count per asset and require the declared conversion to change at least one compiled asset overall; do not reject an unchanged drawing merely because a different drawing needed normalization. The later complete-registration comparison, not a blanket per-drawing color assumption, decides whether artwork is canonical-identical.

#### Step 5: extract, retarget, and write the audit

Compatible import is one fail-closed command. It compares the compatible scene with the packaged manifest, audits the compiled drawings, creates the portable candidate, and writes a separate audit receipt:

```sh
node runtime/extract-pose-recipe.mjs \
  --compatible-source \
  --manifest /absolute/work/compatible-runtime.json \
  --target-manifest rig-v2/runtime.json \
  --compatible-assets /absolute/work/compiled-assets \
  --target-assets rig-v2/assets \
  --id action-id \
  --start START_FRAME \
  --end END_FRAME \
  --base-frame 1 \
  --node-prefix Top/Puppet_Talk_Section_Group/ \
  --outer-master-map SOURCE_MASTER=TARGET_MASTER \
  --source-archive /absolute/path/source.zip \
  --source-archive-sha256 ARCHIVE_SHA256 \
  --source-archive-name source.zip \
  --source-xstage-path folder/scene.xstage \
  --omit-node SOURCE_SHOT_WRAPPER \
  --target-base-node TARGET_STATIC_NODE \
  --audit-output /absolute/work/action-id-import-audit.json \
  --output poses/candidates/action-id.json
```

Repeat `--outer-master-map` only for a direct outer source master that is genuinely equivalent to the named direct outer target master. Repeat `--omit-node` only for static direct outer source nodes the audit proves are shot placement or wrappers, and pair each with the corresponding direct outer `--target-base-node`. Internal controls cannot be omitted. Repeat `--target-base-node` only for packaged construction or static nodes that must remain at the target base frame. Do not use any of these flags to hide a topology mismatch. An explicitly supplied prefix must match at least one PEG or READ node or extraction fails before writing output. Every named mapping or omission must also exist, or the command writes neither output.

`--source-archive` is the actual ZIP, not another declaration. The importer hashes that file, verifies the exact `--source-xstage-path` member against the manifest hash, and checks every compiled TVG receipt hash against the matching member below the Xstage directory. The basename and checksum declarations must match the file. This prevents an archive from one scene being paired with a same-named manifest or drawing workspace from another.

For the known Episode 5 PART2 source, the audited staging declaration is:

```sh
--node-prefix Top/Puppet_Talk_Section_Group/ \
--outer-master-map Shaz_Master-P=Shaz_Master-P \
--omit-node Shaz_Resize_Placement-P \
--omit-node Shaz_Rig-P \
--target-base-node Shaz_Model8 \
--target-base-node Shaz_Resize_Placement-P \
--target-base-node Shaz_Rig-P
```

That declaration keeps `Body_Movement-P`, `Head_Movement-P`, and every internal control. It removes only the static episode placement/root controls and leaves the packaged construction READ at its target base frame.

Those flags prove topology, not every frame range in the hybrid project. The currently end-to-end proven PART2 ranges are `1683-1740`, `1795-1959`, and `2817-2933`, as locked in `evidence/episode5-part2-compatible-source.json`. A fresh import attempt for live-rig range `604-727` correctly stops at the still-unsupported nonconstant path3D segment `ATV-0B8CE129D45FC12C 604-671`. Implement and test that curve semantics before importing the range; never bypass the stop or substitute linear motion.

The compatible mode performs the mechanical work that previously lived in a lost one-off script:

- pins the recipe's root `sourceXstageSha256` to the packaged runtime while recording the external archive, Xstage, range, and extraction boundary under `sourceAction`;
- maps only unique, type-compatible controls and records every permitted path mapping or omission under `stagingNormalization`;
- requires the mapped parent graph, stage field grid, and static pivot basis to match before replaying local controls through the target rig;
- requires every rendered READ and every canonical deformation path/type to match;
- samples exact 24 fps control states with held keys so a Harmony constant segment cannot become a slide;
- stores compact, deduplicated source samples for every deformation node with one `frameSamples` index per local frame;
- inventories every used `(READ node path, drawing ID)` pair and compares each complete renderer registration—variant names, pixels, canvas, and model origin—with canonical art; and
- writes `drawingSources` for both absent art and same-number/different-art collisions.

The command prints the recipe path, audit path, and semantic recipe SHA-256. Preserve all three. Compatible mode samples every source frame exactly; it rejects `--exposure-change-frames` because the Xstage itself owns exposures and holds. That option belongs only to the legacy same-manifest extractor and must never be inferred from screenshots.

#### Step 6: read the audit before rendering

Do not treat command success as review. Open the import audit and confirm:

- the selected boundary names the live puppet only;
- every source omission and target-base node is intentional;
- all mapped parent links, pivots, field-grid values, rendered READ mappings, and deformation path/type matches passed;
- every used drawing pair is present exactly once; and
- the counts add up across `canonical-identical`, `absent-from-canonical`, and `same-id-different-artwork`.

Numeric drawing IDs are scene-local. A canonical-identical pair may reuse canonical art. The other two classes must remain bound to the external Xstage hash under `rig-v2/assets/sources/<xstage-sha256>/`. If a declared palette conversion produces no genuinely shared byte-identical artwork, the palette proof is incomplete; stop rather than calling approximate colors equivalent.

#### Step 7: verify Harmony channel semantics

Inspect every retained scalar, drawing, deformation, and path3D column. For each path3D column, inspect its velocity column as part of the motion data:

- a constant velocity segment holds its left key until the next key;
- an exact keyed frame returns the exact keyed value, even if the following segment uses different curve semantics; and
- an unsupported nonconstant curve fails closed instead of being silently replaced with linear interpolation.

Preserve drawing exposures, held exposures, and intentional blanks separately. Never infer smooth motion merely because two positional keys exist; that mistake created the sliding mouth and end-frame hand jump in the PART2 reconstruction.

The sampler returns an exact keyed value on its frame, holds a constant velocity segment from its left key until the next key, and rejects unsupported nonconstant path3D curves. The importer exercises those semantics across the entire retained range. If it fails on an unsupported curve, the candidate is blocked until that curve is implemented and tested.

#### Step 8: understand the three drawing classes

Inventory every `(READ node path, drawing ID)` pair used by the action. The audit classifies every used pair into exactly one bucket:

1. **canonical-identical:** normalized compatible artwork is byte-identical to the canonical asset, so the recipe may reuse canonical art;
2. **absent from canonical:** the node/drawing pair does not exist in the canonical rig, so it must remain source-bound; or
3. **same ID, different artwork:** the numeric ID exists canonically but the normalized pixels differ, so it must also remain source-bound.

Never decide from the number alone. A same-number collision is not a fallback case; resolving it through canonical art caused the missing pupils, wrong mouths, and incorrect head drawing in PART2.

#### Step 9: register external-bound artwork

Register every candidate that uses the external source in one invocation:

```sh
node runtime/register-compatible-tvg-assets.mjs \
  --manifest rig-v2/runtime.json \
  --base-assets rig-v2/assets \
  --compatible-assets /absolute/work/compiled-assets \
  --source-xstage-sha256 SOURCE_XSTAGE_SHA256 \
  --source-xstage-name scene.xstage \
  --source-archive-sha256 ARCHIVE_SHA256 \
  --source-archive-name source.zip \
  --recipe poses/candidates/action-id.json
```

Add another `--recipe` for every candidate from the same Xstage. Registration selects only audited source-bound drawings, rechecks receipts and output hashes, writes them below the source-hash namespace, and prunes assets no current recipe uses. Never overwrite the canonical filename or let an unbound external drawing resolve by numeric ID.

#### Step 10: render the portable candidate

Render the imported recipe against the packaged runtime:

```sh
node runtime/render-xstage-range.mjs \
  --manifest rig-v2/runtime.json \
  --assets rig-v2/assets \
  --prop-assets assets/props \
  --recipe poses/candidates/action-id.json \
  --output /absolute/work/runtime-candidate.mp4 \
  --receipt /absolute/work/runtime-candidate-receipt.json
```

`render-xstage-range.mjs` is a maintainer proof-video helper that calls the same official `renderRigFrame` implementation. `runner.mjs` remains the only user-facing path for registered sequences. Its raw range mode expects a canonical-path manifest; do not point it at a prefixed hybrid compatible manifest. The historical PART2 “direct source” clips depended on an unretained path-rebasing adapter and remain invalidated circular evidence, not a documented proof step. If a checked-in source-direct adapter is added later, it must consume the same audited boundary and topology mapping, and its result must still be labeled `diagnostic`, never source parity, native fidelity, or artist approval.

#### Step 11: inspect mechanically and build the native comparison

Run the per-frame inspector against the same recipe and assets:

```sh
node runtime/inspect-pose.mjs \
  --manifest rig-v2/runtime.json \
  --assets rig-v2/assets \
  --prop-assets assets/props \
  --recipe poses/candidates/action-id.json \
  --output /absolute/work/action-id-inspection.json
```

The inspector re-renders the recipe; it does not inspect the encoded MP4. Bind the inspection, recipe, render receipt, encoded candidate, native clip, and comparison with explicit hashes.

Require native and runtime clips to contain the same number of 24 fps frames, then build the normal-speed comparison:

```sh
ffprobe -v error -count_frames -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,nb_read_frames \
  -of json /absolute/work/native-action.mp4
ffprobe -v error -count_frames -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,nb_read_frames \
  -of json /absolute/work/runtime-candidate.mp4

ffmpeg -hide_banner -loglevel error -y \
  -i /absolute/work/native-action.mp4 \
  -i /absolute/work/runtime-candidate.mp4 \
  -filter_complex \
  "[0:v]fps=24,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:white,setsar=1[n];[1:v]fps=24,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:white,setsar=1[r];[n][r]hstack=inputs=2[v]" \
  -map "[v]" -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  /absolute/work/native-vs-runtime-1x.mp4
```

That file is the synchronized native-versus-runtime playback at 1×. Keep slow motion and pixel differences as separate diagnostic supplements so they cannot replace the normal-speed judgment.

For dense chronological sheets, run `ffmpeg` on each clip with `fps=24,scale=320:-1,tile=6x6:padding=4:margin=4` and an output pattern such as `dense-%03d.png`; do not stop after the first page. Make tight crops for every suspect face, mouth, pupil, shoulder, cuff, wrist, and hand interval.

Watch the complete range and inspect exact suspect frames plus tight crops of pupils, eyelids, mouth, hair, collar, shoulders, cuffs, wrists, hands, and torso. Confirm authored holds, one-frame accents, substitutions, and release timing. A passing inspector or contact sheet cannot replace watching the moving result.

#### Step 12: derive narrow inspection rules from native evidence

Fix the renderer or recipe when a general invariant fails. When the native export proves that one source-specific drawing family is legitimate, allow it only through an exact source checksum plus exact drawing tuple or asset checksum. Never relax a broad anatomy, hair, mouth, or topology threshold to make one action pass. Set identical-frame ceilings from measured native holds, not from the candidate's convenient freeze length.

#### Step 13: record exact-output review

Store a candidate review receipt beside the action evidence. Until a candidate-specific validator is checked in, this receipt is human evidence rather than an automated promotion gate, so a focused regression must pin its path and bytes:

```json
{
  "schemaVersion": "shaz-pose-candidate-review-v1",
  "candidateId": "action-id",
  "recipeFileSha256": "...",
  "recipeSemanticSha256": "...",
  "reviewedOutput": "runtime-candidate.mp4",
  "reviewedOutputSha256": "...",
  "nativeReferenceSha256": "...",
  "comparisonSha256": "...",
  "reviewer": "name-or-delegated-agent-id",
  "reviewedAt": "YYYY-MM-DDTHH:MM:SSZ",
  "directVideoPerception": true,
  "completePasses": 1,
  "status": "approved",
  "notes": "What passed, what remains limited, and whether entry/release are native."
}
```

Use `rejected` or `inconclusive` when that is the truth. Never set `approved` from stills, an inspector pass, or a runtime-vs-runtime match. Hash the exact file you watched after the final encode.

#### Step 14: preserve evidence, status, and the lesson

Keep the action under `poses/candidates/` until mechanical inspection and exact-output human creative review both pass. Record the recipe file SHA-256, semantic recipe SHA-256, source hashes, native mapping, asset receipt, render and inspection receipts, review status, and remaining boundary limitations. Update the candidate README, evidence JSON, promotion ledger, proof and provenance docs, tests, downloadable ZIP, and ZIP sidecar together.

Before promotion, answer and record:

1. What was visibly wrong?
2. What was the actual root cause?
3. What was the smallest reusable correction?
4. What exact native, render, or test evidence proved it?
5. Which instruction, runtime check, or regression now prevents recurrence?

If the lesson is mechanical, prose is not enough: add a test or inspector gate. If it is a reusable judgment, update this tutorial. If it is action-specific, keep it in that action's evidence rather than making it a universal rule.

#### The two finish lines

- **Sequence-ready** means the exact complete action—its authentic entry, performance, holds, and native release when present—passed mechanical inspection and checksum-bound normal-speed review. It may be selected as one whole semantic beat.
- **Packet-ready** means neutral entry, hold, and release boundaries were authored and reviewed separately, so the action can compose safely with arbitrary neighbors. A hard-cut source action can be sequence-ready while remaining blocked from packet use.

#### Stop instead of guessing

Stop and mark the action blocked when the source archive is incomplete, the live rig range cannot be isolated, topology differs, required TVGs or palettes are absent, a retained curve is unsupported, native playback contradicts the runtime, or inspection fails. Without a native export, continue only as an extraction candidate with Harmony fidelity explicitly unproven. Without exact-output human review, never call the candidate creatively approved.

### Mistakes that now define the method

| Observed mistake | Root cause | Permanent guardrail |
| --- | --- | --- |
| A video-guided rebuild looked like a stiff still instead of the authored action | Destination pose was mistaken for the full rig performance | Use the compatible Xstage whenever it exists; preserve setup, accent, secondary body motion, holds, and release. |
| Mouth and hand artwork crawled sideways between keys | Harmony path3D velocity holds were discarded and replaced with linear interpolation | Treat velocity as motion data; hold constant segments, return exact keys, and reject unsupported curves. |
| Pupils disappeared and mouths or head art changed | Numeric drawing IDs were treated as global across scenes | Compare every used node/drawing pair after palette normalization and source-bind absent or colliding artwork. |
| Two generated renders matched but both disagreed with Toon Boom | The same parser, sampler, compiler, and renderer existed on both sides of the comparison | Use checksum-locked native Toon Boom playback as the independent fidelity authority; label runtime-vs-runtime matches diagnostic only. |
| A mistyped puppet prefix could emit a plausible empty recipe | Extraction did not prove that the requested boundary selected nodes | Fail on zero explicit-prefix matches and record `sourceAction.extractionBoundary`. |
| A source-authored hold looked like an accidental freeze—or a real freeze was excused as authored | Temporal limits were chosen from the candidate rather than the native source | Measure native exposure changes and longest holds before setting interpolation or inspector ceilings. |
| A live puppet exposure range was assumed to be import-ready | Isolating the right group was mistaken for supporting every retained Harmony curve | Run the complete importer for each range and stop on unsupported path3D semantics; a topology pass alone is not motion fidelity. |
| A local fix passed while the downloadable kit still taught the old behavior | Documentation and archive hashes were not refreshed as one release unit | Rebuild deterministically, verify the sidecar, extract the sealed ZIP, scan its instructions, and run its smoke test. |

### 1. Assembly and silhouette

Make the character look like one finished drawing before judging the animation. Hide construction artwork, join intended sleeve components, preserve collar and skin fills, remove stray drawing components, and respect recovered paint order.

Useful techniques:

- Composite upper-arm construction fill beneath the finished sleeve and outline the visible union rather than drawing the overlap seam.
- Reconstruct AutoPatch and Overlay/Colour Art behavior where Harmony concealed elbow or shoulder seams.
- Use component filtering or masks when a drawing contains both intended artwork and a stray fragment.
- Preserve artist-authored flat shading as a separately masked color region when ordinary layer order replaces it incorrectly.

### 2. Deformation and attachment

Confirm that shoulders, sleeves, torso, hands, hair, and face remain attached across the entire range.

Useful techniques:

- Preserve along-chain progress and perpendicular distance when inverse-mapping a bone deformation.
- Extrapolate beyond deformation endpoints instead of clamping pixels to the final bone.
- Apply animated bone-radius changes to transverse mapping; ignoring radius creates white gaps and pinched shoulders.
- Treat curve and bone deformation values as primary motion controls, not optional polish.

### 3. Substitutions and expression

Use the rig's authored drawings when the silhouette or expression changes. Do not force a single hand, eye, or mouth drawing to imitate a different view through rotation and scale.

Require action-specific silhouette vocabulary before accepting a semantic relabel. Timing and a smiling mouth cannot turn open-palm shrug mechanics into a victory celebration; the hands, arm height, and body line must communicate the intended action without relying on its filename.

When a bilateral gesture needs a semantic drawing that exists for only one side, a deterministic mirror of that exact registered drawing is allowed only if the anatomy is genuinely symmetric. Disclose the source drawing and mirror transform, preserve the source side byte-for-byte, test the derived pixels against the exact mirror operation, and keep the substitution scoped to the missing counterpart. Do not use this exception to mirror asymmetrical accessories, lighting, text, or arbitrary new art.

Check hand orientation, transitional drawings, pupils, eyelids, mouth/teeth, fingers, visibility, and the exact frame on which each substitution changes.

Treat color ownership as content, not merely alpha coverage. A drawing can remain connected and opaque while a tooth, eye white, tongue, or skin region is painted with the wrong palette color. For any authored substitution with a required semantic color region, inspect that region directly and promote a stable color-presence check into the test suite.

Treat visible alpha and semantic ownership as separate evidence. A partial squint, eyelid, hand, or facial substitution can paint only the visible fragment while still owning the complete region that must exclude hair or other occluders. Recover the intended envelope from the registered drawing family, clip the occluder behind that envelope, then paint the visible substitution. Confirm the result in a synchronized tight crop. Do not begin with coordinate nudges, color-specific erasure, or contour-only cleanup; those can hide one symptom while leaving the occluding fill intact.

Treat front-of-face hand gestures as a layer- and cuff-ownership problem before treating them as a transform problem. If a valid hand drawing disappears behind the head, reuse that registered rig drawing through the dedicated `OL_Hand` substitution channel and preserve its original asset registration and provenance. The recipe may record the recovered sleeve owner as descriptive, validated metadata, but the renderer must derive actual cuff ownership from rig topology and matte the overlay at that derived finished cuff. The declaration cannot create ownership or relax the geometry limits selected from the rendered hand role. Inspect the semantic wrist joint and calibrate only the overlay control. Do not infer attachment because the palm touches the face, reorder the ordinary hand globally, or add a pose-specific renderer branch.

Treat limb depth crossovers as native paint-order changes first. Keep both shoulder-to-finished-sleeve-to-hand chains in the rig when the recovered drawings and pivots can form the semantic pose. Declare the pose-specific arm paint order in the recipe, and keep exactly one registered native hand channel visible and independently verifiable on each side throughout those native frames. Hidden or tucked hands and duplicate hand channels on either side are invalid.

If up to three bounded native-rig candidates prove that the recovered vocabulary cannot form the essential destination without clasped hands, detached wrists, or distorted sleeves, stop tuning coordinates. One coherent, part-specific pose drawing may replace the complete corresponding native parts, but only when all of these are true:

- the drawing is user-supplied or explicitly authored for that pose and its provenance is disclosed;
- the asset ID, path, bytes, normalized transform, opacity timing, and paint layer are exact-locked;
- every corresponding native arm, forearm, and hand drawing becomes invisible on the exact replacement frame, with no double-painting or armless gap;
- the rig continues to render the original head, face, hair, torso, collar, strings, pocket, and unrelated limbs;
- the inspector distinguishes the substitution from non-limb props and rejects any other replacement tuple; and
- dense frames and the exact checksum pass complete normal-speed review.

This is equivalent to adding one authored substitution drawing to an incomplete 2D rig. It is not permission for a full-character sprite, four independently positioned limb fragments, arbitrary image generation, or a renderer branch keyed to a pose name.

When a generated action reuses an authored movement grammar, preserve the authored wrist controls for the same source frames. Change the semantic hand drawing at the declared substitution frame, but do not import wrist coordinates from another action or add arbitrary scale inflation to make the drawing graze the sleeve. Direct overlap can make a structurally wrong hand pass a coarse contact count.

Treat physical prop interaction as a contact-ownership chain. A moving prop is not attached merely because its path resembles a hand path. Preserve the real shoulder, sleeve, forearm, and hand hierarchy; use an existing native or overlay hand drawing for the contact and move the prop with that hand through the hold. Do not replace a hand, finger, fist, sleeve, forearm, or arm with an independently positioned screen-space prop.

For a short bilateral contact, preserve both native limb chains and represent depth with recipe-declared paint order while keeping both native hands visible and independently verifiable. If the recovered controls and registered drawings cannot produce a credible contact after the bounded attempt limit, either report the action blocked or use the single registered pose-drawing contract above. Never assemble the contact from independently positioned pieces. Test approach, substitution boundary, hold, and release separately at normal speed and in dense frames.

Topology certification is outcome-based. An innocuous asset ID cannot disguise fragmented anatomy. For native frames, require one visible hand channel per side, identify the intended shoulder, finished sleeve, cuff, hand, and any front-overlay sleeve owner, and measure each semantic contact and proportion. For a registered pose-drawing frame, require the exact trusted tuple and prove that all corresponding native pieces are absent while unrelated rig regions remain. A palm touching the face can make the whole character one alpha component while its wrist is still detached, and an oversized hand can create abundant contact pixels while remaining off-model. Do not certify any composition merely because an asset is allowlisted or a mechanical gate passes.

A prop-free alias is a content subtraction, not a new gesture. Remove the prop declaration while preserving the checksum-locked native controls, drawings, timing, and deformation frames of the accepted source action. Reinspect the result at normal speed because removing the prop can change how the remaining hand silhouette reads.

### 4. Timing grammar

Recover the action's phases before editing curves:

- neutral or setup;
- anticipation;
- primary accent;
- overshoot;
- settle;
- readable living hold;
- secondary afterbeat; and
- release or neutral reset.

Preserve asymmetry and overlap. Head, torso, arm master, individual arm pivots, forearms, hands, eyes, pupils, mouth, and hair should not all change on one shared key. A hold may contain secondary drift, eye changes, or a smaller counter-settle.

Do not assume the source should move on every runtime frame. Compare consecutive artist exposures before changing curves. If the presentation is intentionally animated on twos or contains an exact hold, encode those change frames with hold interpolation and repeat the corresponding deformation exposure. Smooth control-channel sampling can be mechanically faithful to an Xstage curve yet visually wrong when the approved artist render uses stepped presentation timing.

When drift is suspected, track at least one stable torso feature and multiple independently parented features such as hair and both hands. If every branch shares the same error, correct stage registration at their common ancestor. If the torso is stable but branches move relative to it, diagnose hierarchy or cadence rather than clamping one child control.

### 5. Semantic change

For a new expression, begin from the nearest certified motion grammar only when it genuinely matches the desired mechanics. Preserve its complete secondary choreography, then change the fewest controls and substitutions necessary to alter meaning. Do not merely relabel an existing action.

When a generated action derives controls or substitutions from a certified recipe, bind that dependency to its exact file checksum and explicit phase/frame boundary. Add a regression that rebuilds the generated action and compares it with the registered recipe. A mutable recipe import can silently change duration, semantics, or cadence even when the generator source itself did not change.

For a whole-character mirror, reflect the common PEG ancestor rather than independently flipping drawings. The transform runtime must honor PEG flip flags, and the mirrored root position, angle, and skew must be reflected together; changing scale sign alone can alter screen-space registration when the root is rotated.

## Failure signatures

| Visible failure | Diagnose first | Common correction |
| --- | --- | --- |
| Black capsule seams across sleeves | Construction art and composite order | Hide construction outlines; synthesize the finished sleeve union |
| White shoulder-to-torso split | Deformation-radius mapping | Apply animated transverse radius |
| Body stretches into a stem | Bone inverse-map endpoint behavior | Extrapolate rather than clamp |
| Hairline has a dark wedge or stray crescent | Component masking and shade ownership | Filter the stray component; restore the artist shade mask |
| Hair or another occluder appears inside a squint or partial eye | Raw visible alpha was mistaken for the full region the substitution owns | Reconstruct the full semantic eye envelope and clip the occluder behind it; verify zero opaque overlap per frame |
| Missing finger, teeth, eye, or mouth color | Drawing substitution, TVG paint-side recovery, and fill extraction | Use the intended drawing; recover an unambiguous enclosed region when the recorded paint side resolves to nothing; verify required palette colors directly |
| Pose reads correctly but feels choppy | Phase timing and secondary controls | Recover accents, overlaps, living hold, afterbeat, and release |
| Long frozen hold | Omitted secondary source controls | Preserve the complete control choreography; add a temporal gate |
| Motion is smooth but generic | Uniform interpolation | Use explicit asymmetric accents, overshoot, settle, and rebound |
| Looks stable in slow motion but crawls or slides at normal speed | Invented in-betweens during stepped exposures or authored holds | Measure exposure-change frames; encode exact holds across controls and deformations; certify at normal speed |
| A polished clip reads as only half an action | The proposed source cut omitted its setup or release context | Audit adjacent frames; extend the full action or register the segment as an honestly named microgesture |
| Several defects move between poses | Work scope is too broad | Stop and perfect one action end to end |
| A generated action changes when rebuilt without a source edit | Mutable authored-recipe dependency | Checksum-lock the source recipe and phase; require exact generator reproducibility |
| A whole-body mirror stays unmirrored or moves off cadence | Flip was applied only to READ drawings or root angle/position was not reflected | Flip the common PEG and mirror its root position, rotation, and skew together |
| Crossed arms look flattened, detached, clasped, or like a heart-shaped sleeve lump | The native vocabulary cannot form the fold, or anatomy was assembled from independent pieces | Try bounded native-chain paint-order candidates; if they cannot form the destination, replace all arm parts atomically with one exact registered pose drawing while preserving the rig-rendered head/body |
| A “celebration” still reads as a happy shrug | Filename and facial expression were treated as semantics while the open-palm arm vocabulary stayed unchanged | Establish victory-specific hand silhouettes and a true overhead accent while preserving the proven timing grammar |
| A hand reaches the right place but disappears behind the face, floats at the wrist, or shows a cuff seam | The ordinary hand owns the wrong paint layer, or the overlay is not mapped and matted through its recovered sleeve topology | Reuse the registered drawing through `OL_Hand`; let the renderer derive its native sleeve owner, matte it at that finished cuff, and treat any recipe owner field as descriptive validation only |
| A phone or other prop floats, or a repair leaves a detached/tiny hand | Prop motion or a screen-space limb substitute was authored independently from the native joint hierarchy | Keep the complete native limb, use an existing native/overlay hand drawing, move the prop with it, and test hand-to-sleeve plus prop-to-hand contact |
| Bilateral contact exposes red shoulder capsules, duplicate hands, giant hands, a hidden hand, or an armless transition frame | Native paint order is wrong, or a replacement was not mutually exclusive and complete | Preserve both visible native chains when feasible; otherwise use one complete exact-locked replacement drawing and switch every corresponding native part off on the same frame |
| A substituted fist touches the sleeve but still looks detached or huge | Wrist states came from an unrelated action or hand scale was inflated to satisfy a coarse contact gate | Keep the same authored wrist states as the source gesture and substitute only the registered hand drawing at native scale |

## Things to avoid

- Do not turn a polished destination hold into a fake full action with generic interpolation. Preserve it honestly as a hold and build reviewed connectors separately.
- Do not sample a few source frames and assume linear in-betweens preserve the artist's cadence.
- Do not approve from slow motion alone or replace intentional stepped timing with generic smoothing.
- Do not copy only the largest PEG controls.
- Do not animate multiple uncertified actions in one iteration.
- Do not trust a pre-sliced filename or registry label as proof that an action boundary is complete.
- Do not diagnose timing while the silhouette is structurally broken.
- Do not accept passing code, a successful render, or three screenshots as evidence that the animation works.
- Do not treat connectivity or alpha coverage as proof that internal color regions are correct.
- Do not treat abundant contact pixels, a checksum alone, or several independently positioned limb fragments as proof of anatomy. A registered pose drawing is valid only with the complete substitution and visual-review contract above.
- Do not repair a semantic overlap with model-space offsets or contour-only pixel erasure before establishing which drawing owns the complete region.
- Do not weaken inspection thresholds to accommodate an observed defect.
- Do not add pose-specific renderer branches when a recipe or existing substitution can express the action.

## Post-pose learning policy

After approval, answer: **“What did this teach us, and does the skill, runtime, or test suite need updating?”**

Classify each lesson:

- **Pose-specific:** keep it in that action's evidence or recipe source.
- **Reusable judgment:** update this playbook or the concise rules in `SKILL.md`.
- **Mechanical invariant:** update the renderer and add a regression test or inspection gate.
- **Unproven hypothesis:** record it in evidence, but do not promote it yet.

For every promoted lesson, record:

1. the visible behavior;
2. the root cause;
3. the smallest reusable correction;
4. the exact evidence that proved the correction; and
5. the file or gate that now prevents recurrence.

If the same lesson recurs, escalate it instead of repeating prose: strengthen the instruction on the second occurrence and automate a mechanical gate whenever the failure can be detected reliably.

Keep the two checksum domains distinct when registering an accepted recipe: `poses/index.json` stores the SHA-256 of the exact recipe file bytes, while render and inspection receipts store the canonical semantic recipe SHA-256. Compute and record both; never place the semantic hash in the file registry. `npm run check` must reject a mismatch.

## Proven baseline from Shrug

The held-out Shrug established the first standard:

- Preserve a complete 31-frame cadence rather than resampling a few poses.
- Retain asymmetric hands and counter-rotation between head and torso.
- Preserve distinct timing across master, head, arm master, arm pivots, forearms, hands, eyes, and pupils.
- Use purposeful hand and eye substitutions at their authored frames.
- Preserve non-rigid torso deformation and pouch-curve behavior.
- Hide upper-arm guides, duplicate contours, collar gaps, and shoulder/elbow seams.
- Copy secondary controls to keep the hold alive.

See `evidence/human-shrug-technical-audit.md` and `evidence/excited-celebration-one-pose-review.md` for the measured evidence.
