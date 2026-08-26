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
3. Inspect contextual frames before and after every proposed action boundary. A complete action normally includes setup, accent, settle, and release; if only one readable subgesture is intended, register it under that narrower meaning instead of borrowing the full action's label.
4. Align reference and candidate by action phase, not merely by equal timestamps.
5. Inspect close crops of shoulders, elbows, hands, face, mouth, hairline, collar, and any changing silhouette.
6. Measure consecutive-frame differences, exposure-change frames, and longest identical-frame runs to distinguish deliberate stepped timing or a living hold from an accidental freeze.
7. Inspect alpha bounds and connected components for detached fragments, missing fill, or clipping.
8. Inspect the Xstage hierarchy, PEG controls, deformation channels, drawings, and source substitutions when visual evidence does not identify the cause.

Rendered artist animation frames may be used to identify phases, presentation cadence, and acceptance criteria. Never copy, resample, or embed those animation frames as runtime sprites, deformation data, or generated pose artwork. A user-supplied pose-design drawing is different: it may be registered transparently as destination artwork only under the bounded substitution rules below.

## Author in the right order

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

- Do not start with a polished destination pose and fill the gap with generic interpolation.
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
