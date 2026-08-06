# Mixamo retargeting proof

Verified August 5, 2026 against four user-downloaded Mixamo Collada clips and the user-provided SpongeBob game model.

| Motion | Original frames | Exact duration | Mapped bones | Planar root retained | Automatic quality |
|---|---:|---:|---:|---:|---|
| Hip Hop Dancing | 135 | 4.500 s | 35 | 100% | Pass |
| Joyful Jump | 57 | 1.900 s | 35 | 100% | Pass |
| Taunt | 86 | 2.867 s | 35 | 100% | Pass |
| Silly Dancing | 116 | 3.867 s | 35 | 100% | Pass |

Every official clip is 1280×720 H.264 at 30 fps with no audio. Each consumes every normalized source frame once. All four reports recorded effectively zero post-correction foot penetration, a maximum protected local face-transform deviation below `0.000001`, and no protected scale change. Eye, lid, mouth, and overlay bones are never mapped.

The automatic results are complete. Human review of the combined motion reel remains the finalization gate.

## Reuse boundary

Future formats import the normalized motion and character profile through the repo runtime. They do not duplicate the retargeting math. A new character needs a verified semantic bone map and its own visual proof; a new Mixamo clip needs only local normalization and validation.
