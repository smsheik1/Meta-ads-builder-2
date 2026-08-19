# Shaz Puppet Runtime Roadmap

This is the canonical product roadmap for the Shaz Wiggly Repo. Future agents should read it before proposing new capabilities or claiming the Format is complete.

## Current proven baseline

- The recovered Shaz rig renders locally without Toon Boom Harmony.
- Inputs can sequence registered actions with explicit holds and gaps.
- All six artist-authored actions are certified against the frame-by-frame visual standard: `shrug`, `present`, `think`, `aha`, `point`, and `confident`.
- The five experimental actions are renderable but are not yet certified to the Shrug standard.
- Audio, lip-sync, script-directed performance, selectable backgrounds, polished action transitions, and plain-English pose generation are not supported yet.

## Build order

### 1. Finish body-language reliability

Bring every remaining registered action to the Shrug standard, one at a time:

1. **Complete:** artist-authored `present`, `think`, `aha`, `point`, and `confident`.
2. **Remaining:** experimental `excited-celebration`, `point-at-screen`, `look-at-phone`, `facepalm-frustrated`, and `arms-crossed-skeptical`.

Each action requires complete playback, synchronized full-frame and close-up comparison where relevant, automatic inspection, and checksum-bound human approval. A passing render alone is not certification.

### 2. Blend actions with polished transitions

Add reusable transition recipes that preserve silhouette, joint continuity, paint order, and the artist's anticipation, overshoot, settle, and hold language. Avoid a generic crossfade or automatic interpolation that ignores body mechanics.

### 3. Accept dialogue or user audio

Extend the input contract to accept dialogue text, user-supplied audio, or both. Derive timing from the real media and keep dialogue timing separate from body-language decisions.

### 4. Perform lip-sync

Map timed speech to the rig's real mouth substitutions. Preserve intentional closed-mouth moments, pauses, facial expressions, and independent body motion. Do not make constant mouth movement the default.

### 5. Select poses intelligently from a script

Use line meaning, emotion, emphasis, and conversational beats to choose and schedule registered actions. Neutral speech should remain restrained; gestures should be attached to meaningful events rather than constant motion.

### 6. Use selectable backgrounds

Add validated background assets and framing rules without changing the character renderer. Background selection belongs in input data, and character placement must remain safe across every registered action.

### 7. Generate a new pose reliably from plain English

Translate a semantic request into inspectable rig controls and drawing substitutions, using the certified action library as the movement vocabulary. Reject new poses that fail silhouette, compositing, timing, continuity, or visual review.

## Sequencing rule

Body-language reliability comes before lip-sync. Plain-English pose generation comes last, after the authored library and transition grammar are proven. Do not skip ahead by weakening the current gates or adding a second renderer.
