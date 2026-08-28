# Shaz Puppet Runtime Roadmap

This is the canonical product roadmap for the Shaz Wiggly Repo. Future agents should read it before proposing new capabilities or claiming the Format is complete.

## Current proven baseline

- The recovered Shaz rig renders locally without Toon Boom Harmony.
- Inputs can sequence registered actions with explicit holds and optional intentional gaps; actions are contiguous by default with no inserted separator frames, but polished inter-action blending remains future work.
- All six artist-authored actions are certified against the frame-by-frame visual standard: `shrug`, `present`, `think`, `aha`, `point`, and `confident`.
- Release proof `anatomy-v8-release` certifies four repaired actions at their current exact hashes: `facepalm-frustrated`, `arms-crossed-skeptical`, `excited-celebration`, and `phone-use-sequence`. Crossed Arms uses one registered arm-only destination drawing after native anticipation because the supplied native cuffs and pivots could not form a credible folded hold; the original head, face, torso, collar, strings, and pocket remain runtime-rendered from the rig.
- `point-at-screen` and `look-at-phone` remain registered, but their current recipes still need renewed exact-hash visual review; their legacy reviews are not current certification.
- Packaged MVP complete for audio-backed registered-action sequences: staged user audio uses one of four checksum-registered fixed backgrounds and locally generated, checksum-bound five-shape Cherry mouth motion without changing body choreography. Sisters Room remains the manifest default. Automatic script direction, polished action transitions, and plain-English pose generation remain unsupported.
- Format 0.2.1 introduced the `talk-to-camera` default-dialogue preset: a blind agent supplies audio without sequence or frame math, and the runtime holds the existing audience-facing neutral body for the measured duration while Cherry drives only Mouth.
- Format 0.3.0 adds Sisters Room, Living Room, Photo Zone, and Pure White as a sealed background library. `map-photo-zone` removes the source map art, but its supporting-media area is metadata-only until a later release.

## Build order

### 1. Finish body-language reliability

Bring every remaining registered action to the Shrug standard, one at a time:

1. **Complete:** artist-authored `present`, `think`, `aha`, `point`, and `confident`.
2. **Complete:** release proof `anatomy-v8-release` gives `facepalm-frustrated`, `arms-crossed-skeptical`, `excited-celebration`, and `phone-use-sequence` current exact-hash visual review, per-frame inspection, focused regressions, and no separator flashes. Three actions retain native limb topology throughout. Crossed Arms uses a checksum- and placement-locked arm-only drawing substitution with mutually exclusive native-arm visibility. `phone-use-sequence` is intentionally the prop-free gesture variant.
3. **Pending:** renew exact-hash visual review for the current `point-at-screen` and `look-at-phone` recipes. Do not promote their legacy evidence as current certification.

The next active work is the renewed review for `point-at-screen` and `look-at-phone`. Polished action transitions follow after those current hashes pass.

Each action requires complete playback, synchronized full-frame and close-up comparison where relevant, automatic inspection, and checksum-bound human approval. A passing render alone is not certification.

### 2. Blend actions with polished transitions

Add reusable transition recipes that preserve silhouette, joint continuity, paint order, and the artist's anticipation, overshoot, settle, and hold language. Avoid a generic crossfade or automatic interpolation that ignores body mechanics.

### 3. Accept dialogue or user audio

**MVP complete for user audio:** audio-backed Lego sequences use measured local media duration and keep dialogue timing separate from body-language decisions. The `talk-to-camera` preset removes manual timing for default dialogue by deriving its neutral hold directly from the audio. Dialogue-text input and automatic transcription remain future work. The separate semantic performance mode also consumes measured audio for sparse body-language scheduling, but it is not lip-synced in Format 0.3.0.

### 4. Perform lip-sync

**Packaged MVP complete for `shaz-sequence-input-v1`:** initialization runs the bundled Cherry 0.1.0 WASI module locally when audio is supplied, then maps validated cues to five real rig mouth substitutions on an independent output-frame track. A supplied Cherry TSV remains supported, and `--lipsync=off` is the explicit opt-out. Body controls remain untouched and the final frame returns to rest. Semantic `shaz-body-language-performance-v1` output is still body-language-only; production-complete lip-sync still requires broader visual approval across real dialogue inputs.

### 5. Select poses intelligently from a script

Use line meaning, emotion, emphasis, and conversational beats to choose and schedule registered actions. Neutral speech should remain restrained; gestures should be attached to meaningful events rather than constant motion.

### 6. Use selectable backgrounds — packaged MVP complete

Format 0.3.0 checksum-registers four opaque 16:9 assets, names Sisters Room as the default, lets audio-backed sequences and semantic performances resolve registered IDs, and keeps background selection in input data without changing the character renderer. Character placement stays on the same fixed waist-up stage view.

Future work: define and validate a supporting-media input contract for the cleared Photo Zone area before allowing an image or video overlay. The reserved bounds in `assets.json` are provenance metadata, not active rendering behavior.

### 7. Generate a new pose reliably from plain English

Translate a semantic request into inspectable rig controls and drawing substitutions, using the certified action library as the movement vocabulary. Reject new poses that fail silhouette, compositing, timing, continuity, or visual review.

## Sequencing rule

Body-language reliability comes before lip-sync. Plain-English pose generation comes last, after the authored library and transition grammar are proven. Do not skip ahead by weakening the current gates or adding a second renderer.
