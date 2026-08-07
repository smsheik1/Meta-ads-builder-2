# Character Dance Lab

This Wiggly Repo is an interactive audition room for 25 real Mixamo motions and four verified character rigs: SpongeBob, Squilliam Fancyson, Mr. Krabs, and Patrick Star. Pick a character, click a motion, and the shared Three.js renderer plays it immediately. Download the current pairing as an exact-frame MP4 or a smaller 640-pixel, 15 fps looping GIF. Only the active character and motion are loaded; visited assets are cached for fast replay. Slow or rapid selections are committed atomically, so the current dancer remains visible until the newest complete character-and-motion pair is ready.

The same renderer also produces deterministic 1280×720 clips. It keeps every source frame, scales root travel from actual leg-chain lengths, grounds feet with deterministic constraints, maps fingers where supported, and restores protected face and eye bones every frame. Squilliam's tentacles are paired into two readable screen legs. Patrick's authored knee and foot scale helpers are delegated to the shared foot IK instead of receiving redundant Mixamo rotations. Character differences live in semantic motion profiles, not motion-specific animation code.

## Try the lab

```bash
npm install
npm run check
npm run lab
```

Open the printed local URL. `npm run smoke` verifies both deterministic video output and the interactive selector, including its lazy-loading contract.

Run `npm run smoke:stability` to stress rapid superseding selections, explicit WebGL context loss and restoration, and five consecutive reloads. The interactive lab uses a lighter WebGL buffer policy, while deterministic rendering and both download formats preserve the export buffer they require.

The Download control sits immediately after Restart. Its menu opens upward and uses the same deterministic renderer as the command-line export; MP4 preserves the source frame rate and GIF uses a web-friendly 640-pixel width at 15 fps.

## Render a selected clip

```bash
node runner.mjs init --run=my-motion --motion=taunt
node runner.mjs validate --run=my-motion
node runner.mjs render --run=my-motion
node runner.mjs inspect --run=my-motion
node runner.mjs finalize --run=my-motion --human-review=pass
```

Import another Mixamo motion locally:

```bash
node runner.mjs import-motion --source=/absolute/path/to/Motion.dae --id=my-motion --label="My Motion"
```

The source `.dae` is read locally and is not copied into the Repo. The normalized motion preserves its filename and SHA-256 provenance. For a verified character, adding a standard Mixamo motion is import, select, inspect. Blender and manual keyframing are not required. Extreme motions can still expose intersections or grounding limits, so visual review remains mandatory.

## Proof boundary

This version is deliberately a playground, not a rating system or music editor. It proves the selector, retargeter, and motion catalog. Beat analysis, song synchronization, motion scoring, playlists, and automatic transition choreography are future work.

| Fixed mechanics | Replaceable inputs |
|---|---|
| Shared renderer, retargeter, MP4/GIF export, lazy asset loading, timing, root scaling, grounding, quality gates | Verified character ID, normalized motion ID, title, background |

## What good means

- The lab exposes exactly 25 motions and four motion-ready characters.
- Startup fetches one character and one motion—not all 25 motion payloads.
- Selecting a motion restarts it immediately; selecting a character preserves the current motion.
- Rapid selections converge on the newest requested character-and-motion pair without blanking the stage.
- WebGL context restoration and isolated frame errors do not permanently stop the animation loop.
- Downloading snapshots the selected character and motion and uses the official renderer.
- Video output contains every source frame exactly once.
- Eye, lid, mouth, and facial overlay bones retain their authored transforms.
- Squilliam's paired limb chains stay joined throughout the clip.
- Automatic checks pass and a person approves movement before finalization.
