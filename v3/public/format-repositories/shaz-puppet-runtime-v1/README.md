# Shaz Puppet Runtime

A self-contained Wiggly video Format kit for animating the supplied Shaz 2D puppet without Toon Boom Harmony. It reconstructs the original Xstage hierarchy, pivots, transforms, drawing substitutions, AutoPatch composites, and paint order into one local renderer, then sequences checksum-locked pose recipes into a 1280×720 H.264 video.

This is not a sprite-sheet player. Runtime frames are rendered from recovered rig controls and compiled drawing assets. Artist renders may supply phase, cadence, and acceptance evidence, but their pixels are excluded from runtime and generation inputs.

See [`ROADMAP.md`](ROADMAP.md) for the canonical build order: certify body language first, then transitions, dialogue/audio, lip-sync, script-directed performance, backgrounds, and finally plain-English pose generation.

## What is included

- Six lossless authored-action calibrations from the supplied rig.
- Six newly authored semantic actions: excited celebration, point at screen, look at phone, facepalm/frustrated, arms crossed/skeptical, and a prop-free gesture variant derived from the phone action while preserving its native rig controls.
- One registered arm-only destination drawing for the folded-arms hold that the recovered native cuff and pivot vocabulary cannot form credibly; it is exact-hash/placement locked and never replaces the original head or body.
- One held-out authored shrug used to prove the control model generalized before new actions were attempted.
- A strict sequence contract, one official renderer, per-frame mechanical inspection, human review, and checksum-bound finalization.
- Two meaningfully different proof inputs plus a free local smoke fixture.

## Quick start

```sh
npm install
npm run check
npm run inspect:registry
npm run smoke
```

Create an input using IDs from `poses/index.json`:

```json
{
  "schemaVersion": "shaz-sequence-input-v1",
  "title": "My Shaz sequence",
  "sequence": [
    { "poseId": "think", "holdFrames": 8, "gapFrames": 0 },
    { "poseId": "aha", "holdFrames": 12, "gapFrames": 0 }
  ]
}
```

For the exact five-action batch certified in the skill-building loop, start from `fixtures/five-recreated-authored-input.json`. It sequences Present, Think, Ah-ha, Point, and Confident through the same official runtime.

Run the official workflow:

```sh
npm run init -- --run=my-sequence --input=/absolute/path/input.json
npm run validate -- --run=my-sequence
npm run render -- --run=my-sequence
npm run inspect -- --run=my-sequence
```

Watch `agent-runs/my-sequence/final.mp4`, inspect the contact sheet and quality report, then record the honest verdict in `human-review.json`. Finalize only after approval:

```sh
npm run finalize -- --run=my-sequence
```

The finalized video and evidence remain in `agent-runs/my-sequence/`. No network, API key, provider call, or paid service is required.

## Registered actions

| ID | Origin | Meaning |
| --- | --- | --- |
| `present` | authored calibration | friendly presenting gesture |
| `shrug` | held-out authored calibration | uncertain shrug |
| `think` | authored calibration | thinking |
| `aha` | authored calibration | raised-finger “Ah-ha!” realization |
| `point` | authored calibration | full side-point → Ah-ha accent → side-point return |
| `confident` | authored calibration | confident stance |
| `excited-celebration` | new rig action | excited celebration |
| `point-at-screen` | new rig action | presents, then points toward an off-canvas upper-right target |
| `look-at-phone` | new rig action | looks down at a phone prop |
| `facepalm-frustrated` | new rig action | frustrated head-in-hand reaction |
| `arms-crossed-skeptical` | new rig action | skeptical crossed-arm hold |
| `phone-use-sequence` | new rig sequence | prop-free reusable hand-to-face gesture derived from the registered phone action |

## Why it is repeatable

The user input controls only action order and explicit hold/gap timing. Actions are contiguous by default, with no inserted separator frames; this does not claim a polished transition between independently authored actions. Recipe checksums bind every action to the registry; every render records the source Xstage checksum and proves `artistRenderedFramesUsed: false`. Inspection re-renders every used recipe and checks native shoulder/sleeve/hand topology or the one exact registered pose-replacement contract, cuff ownership, hand proportions, clipping, paint order, props, facial stability, video format, frame count, and duration. Finalization binds the human review to the exact video checksum.

## Authoring new actions

Sequencing registered actions is automatic. Creating a new one is deliberate rig work. Read `poses/README.md`; use sparse named control keys, reuse existing drawing substitutions, and add only minimal non-limb props. Prefer complete native limb chains. If the recovered drawing and pivot vocabulary is proven unable to form an essential destination, a single part-specific registered pose drawing is allowed only under the strict replacement rules in `SKILL.md`: exact bytes and placement, mutually exclusive native visibility, preserved rig-rendered head/body, independent inspection, and checksum-bound normal-speed review. The new recipe must pass independent per-frame inspection before registration.

## Package integrity

`npm run build:kit` removes the previous stable ZIP before rebuilding it. The ZIP excludes `node_modules`, run outputs, downloads, the original source archive, and all finished artist renders. A `.sha256` file is written beside it.

See `PROVENANCE.md` for the source and evidence boundary.
