# Wiggly Roadmap

This file is the product memory for things we intentionally defer. When we make a practical v1 tradeoff, add it here immediately so it does not depend on anyone remembering a chat thread.

## Next Rendering Improvements

### Make Remotion visualizers truly audio-reactive

**Status:** Planned

**Why:** Remotion export v1 uses deterministic animated bars/waveforms for stability. This is safer than the old browser-recorded canvas path, but it is not yet reacting to the actual spoken audio.

**Goal:** Precompute or sample audio amplitude/FFT data and feed it into the Remotion composition so exported waveform and bar visualizers move with the real voiceover.

**Acceptance criteria:**
- Exported waveform-strip reacts to the actual audio.
- Exported bars-center and bars-bottom react to the actual audio.
- Caption/audio timing does not drift.
- Feed exports remain `1080x1350` at `60fps`.
- Reels/stories exports remain `1080x1920` at `60fps`.
- Remotion export remains the default path with old export fallback available.

## Backlog Rules

- If we say "v2 later", add it here or to GitHub Issues before moving on.
- Keep each item short: why, goal, acceptance criteria.
- Prefer GitHub Issues for active work and this file for durable product/technical memory.
