# Shaz Lego Audio Lip-sync Experiment

Date: 2026-08-27

## Question

Can the exact approved 12-second registered-action body timeline receive useful audio-timed mouth animation without editing its pose recipes, body controls, holds, props, or renderer path?

## Result

Yes, as an experimental MVP. The runtime consumes a checksum-bound Cherry 0.1.0 TSV and changes only the registered `Mouth` drawing at each output frame. The existing `renderRigFrame` remains the only character renderer. Holds keep the same final body recipe frame but are re-rendered so the mouth can continue following speech.

- Output: `agent-runs/lego-audio-proof-lipsync-framing-v2/final.mp4`
- Output SHA-256: `59cef6b0910a9d7f8dfe342c0602e8f1921ec6c837fe0fb26c8d5510fd1d2edf`
- Input SHA-256: `a1bb3b8e7719786c728ee92707de59ebd81831f7b3a9d86df73979afae0d47f5`
- Audio SHA-256: `37648e2e0b4c37d22ec529b4301c8abd9435f92ce641c804e521e5b3bdd23f1b`
- Cue SHA-256: `6a6d5604461dfe9aadc40ab3bf5f7b5171c64e674c95384c58275294ee32820d`
- 288 frames, 12.000 seconds, 1280×720, H.264 yuv420p at 24 fps, AAC audio, mean volume -15.6 dB
- Automatic inspection: pass; all six used pose recipes independently pass
- Cherry cues: 100 real A-K/X timing changes generated from the exact staged audio; no cyclic fallback and no stale cue reuse
- Mouth inventory used: drawings 1, 2, 3, 4, and 5 only
- Camera motion: none
- Fixed stage view: scale 1.33, offset [0.12, 0.142]; every frame of all six used poses keeps a broad 299–308 pixel Body continuation below the bottom edge and retains clear left/right margins
- Artist-rendered frames used at runtime: false

## Five-mouth mapping

`A/X → 1` closed/rest; `B/G/I/J → 4` teeth; `C/H → 5` small-open/tongue; `D → 2` wide-open; `E/F/K → 3` rounded O.

Drawings 6-9 are deliberately excluded because they encode emotional frown/worry/side-mouth expressions. Drawing 10 is byte-identical to drawing 4.

## Body-choreography boundary

The ordered body sequence and every recipe frame/hold remain the same as `lego-audio-proof-v1`: Neutral, Present, Neutral, Confident, Neutral, Point, Neutral, Shrug, Neutral, Ah-ha, Neutral. The only presentation difference outside the mouth is the fixed stage framing. It removes the previously observed Point-hand clipping and keeps the waist-up hoodie extending below the canvas, matching the supplied channel reference instead of revealing a rounded lower boundary and absent legs.

Tests prove that a mouth override changes no non-Mouth receipt layer. The render cache key includes pose ID, recipe frame, and mouth drawing, preventing mouth cues from mutating or replacing body states.

## Honest limitations

- Cherry is a Rust cue engine, not a Python library. Format 0.2.0 packages a checksum-locked build as a WASI module and runs it locally through Node; it ships no native Cherry executable.
- Audio-backed Lego sequences now generate cues automatically. A supplied Cherry TSV and an explicit `--lipsync=off` path remain available, but neither is the default.
- The separate semantic-performance mode remains body-language-only in Format 0.2.0.
- Five authored expression mouths are enough for a convincing first test but are not a full phoneme-perfect viseme set. Rounded OO/W and R share drawing 3; several consonant families share drawing 4.
- Automatic inspection proves media integrity, provenance, body isolation, cue binding, and framing. It does not claim human creative approval. `human-review.json` remains pending until the user watches the exact output.

The bundled-engine, second-speech-input, and sealed-package receipts are recorded in `evidence/bundled-cherry-wasi-proof.md`.

## Review artifacts

- `agent-runs/lego-audio-proof-lipsync-framing-v2/contact-sheet.jpg`
- `agent-runs/lego-audio-proof-lipsync-framing-v2/review-slow.mp4`
- Local comparison page: `http://127.0.0.1:8782/`
