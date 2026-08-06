# Mixamo retargeting proof

Verified August 5, 2026 against four user-downloaded Mixamo Collada clips and the user-provided SpongeBob game model.

| Motion | Original frames | Exact duration | Mapped bones | Planar root retained | Automatic quality |
|---|---:|---:|---:|---:|---|
| Hip Hop Dancing | 135 | 4.500 s | 35 | 100% | Pass |
| Joyful Jump | 57 | 1.900 s | 35 | 100% | Pass |
| Taunt | 86 | 2.867 s | 35 | 100% | Pass |
| Silly Dancing | 116 | 3.867 s | 35 | 100% | Pass |

Every official clip is 1280×720 H.264 at 30 fps with no audio. Each consumes every normalized source frame once. Across all 394 frames, the highest pre-constraint mapped-pose angular error was `0.000775` radians, the highest foot-target error was `0.006535`, the highest contact-trajectory vertical error was `0.006407`, the highest contact-foot ground clearance was `0.029224`, the highest floor penetration was `0.000267`, and planar root retention was exactly 100%. Protected local face-transform deviation stayed below `0.000001` with no protected scale change. Eye, lid, mouth, and overlay bones are never mapped.

Root translation is scaled from actual source and target thigh→knee→ankle→toe chain lengths with zero measured scale error. Foot direction and extension are normalized to the target chain before deterministic FABRIK solving; measured reach never exceeds 100%, so an unusually proportioned character is never assigned an unreachable foot target.

The automatic results are complete. Human review of the combined motion reel remains the finalization gate.

## Reuse boundary

Future formats import the normalized motion and character profile through the repo runtime. They do not duplicate the retargeting math. A new character needs a verified semantic bone map and its own visual proof; a new Mixamo clip needs only local normalization and validation.
