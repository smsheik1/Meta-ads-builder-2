# Mixamo retargeting proof

The v0.1 baseline was verified August 5, 2026 against four user-downloaded Mixamo Collada clips and the user-provided SpongeBob game model. Version 0.2 re-normalizes those same source clips against Mixamo's inverse-bind matrices and adds current cross-character acceptance proofs for Squilliam and Mr. Krabs.

Version 0.3 adds 21 user-downloaded Mixamo clips for a 25-motion catalog and exposes the three accepted rigs in an interactive audition lab. The catalog is exploratory: the original four and cross-character Hip Hop proofs retain their acceptance status, while the 21 new motions are available for rapid visual triage rather than pre-labeled as perfect.

Version 0.4 adds Patrick Star as the fourth verified rig. Patrick uses the same renderer, world-delta retargeter, foot IK, and export path as the existing characters. His declarative profile protects the authored eye, brow, jaw, lip, forehead, and head-detail controls; no Patrick-specific renderer or motion file was introduced.

Version 0.5 hardens the interactive renderer lifecycle. Character and motion changes now resolve as one latest-selection transaction, the displayed scene remains intact until its replacement is ready, rejected or timed-out loads leave the cache retryable, and interactive WebGL context loss has an explicit recovery path. Deterministic rendering and both download formats retain the existing export renderer behavior.

Version 0.6 audits 51 supplied character archives strictly one character at a time. Sonic (Modern), Flynn Rider, Kermit (Pirate), and Kermit (Sci-Fi) each passed separate Silly Dancing and Macarena contact-sheet reviews, expanding the verified roster from four to eight. The remaining 43 archives have explicit rejection evidence in `assets/character-import-audit.json`; no failed or static-only model was silently included.

Version 0.7 completes that ordered recovery audit. Four archives were already represented, eighteen new rigs passed two individually inspected dance proofs, and 29 were skipped with exact evidence because they lacked textures, required disproportionate bind reconstruction, or remained structurally invalid. The verified roster is now 22 characters. Every accepted character still uses the one Collada loader, declarative retargeting profile, and official renderer; Aqua's glTF conversion was bounded to an offline asset conversion rather than adding a second runtime loader.

| Motion | Original frames | Exact duration | Mapped bones | Planar root retained | Automatic quality |
|---|---:|---:|---:|---:|---|
| Hip Hop Dancing | 135 | 4.500 s | 35 | 100% | Pass |
| Joyful Jump | 57 | 1.900 s | 35 | 100% | Pass |
| Taunt | 86 | 2.867 s | 35 | 100% | Pass |
| Silly Dancing | 116 | 3.867 s | 35 | 100% | Pass |

Every official clip is 1280×720 H.264 at 30 fps with no audio. Each consumes every normalized source frame once. Across all 394 frames, the highest pre-constraint mapped-pose angular error was `0.000775` radians, the highest foot-target error was `0.006535`, the highest contact-trajectory vertical error was `0.006407`, the highest contact-foot ground clearance was `0.029224`, the highest floor penetration was `0.000267`, and planar root retention was exactly 100%. Protected local face-transform deviation stayed below `0.000001` with no protected scale change. Eye, lid, mouth, and overlay bones are never mapped.

Root translation is scaled from actual source and target thigh→knee→ankle→toe chain lengths with zero measured scale error. Foot direction and extension are normalized to the target chain before deterministic FABRIK solving; measured reach never exceeds 100%, so an unusually proportioned character is never assigned an unreachable foot target.

The v0.1 automatic results are complete. Human review of the combined SpongeBob motion reel was approved August 5, 2026, and all four baseline proof runs were finalized.

## Cross-character Hip Hop proof

The identical 135-frame Hip Hop Dancing motion was rendered on two additional rigs without character-specific renderer code.

| Character | Rig challenge | Mapped bones | Planar root retained | Maximum contact clearance | Face deviation | Automatic quality |
|---|---|---:|---:|---:|---:|---|
| Squilliam Fancyson | Paired tentacles, authored non-unit rest quaternions | 23 | 100% | `0.029453` | `0` | Pass |
| Mr. Krabs | Short ankle-ended legs and claws | 23 | 100% | `0.015799` | `0` | Pass |

The first cross-character reel visibly returned both characters to a T-pose at the clip boundary. The importer had measured animation deltas against frame 1 rather than the Mixamo skeleton's true inverse-bind pose, so frame 1 and the matching final sample became identity rotations on every target. Version 0.2 uses the Collada inverse-bind matrices as the reference and keeps all 135 original frames. A contract test now rejects normalized clips whose known first pose collapses back to bind.

Squilliam initially moved four tentacles independently, which was technically faithful to the model but visually wrong for the character. His profile now pairs the rear and front chain on each side after the two visible driver legs are grounded, so he reads as a normal two-legged performer throughout the clip. The paired-chain behavior has a runtime regression test. His worst mapped-pose discrepancy is `0.001836` radians at `squilliam_fingers_R`, below the rig's bounded `0.002`-radian tolerance; protected-face deviation is zero.

Mr. Krabs's short legs require at most `0.048914` units of the declared `0.12` vertical correction while preserving 100% of planar source travel. His worst mapped-pose discrepancy is `0.001218` radians at `krabs_ankle_L`, below his measured `0.0015`-radian tolerance; protected-face deviation is zero.

The v0.2 Squilliam and Mr. Krabs reports pass every automatic gate. Full playback of the combined 135-frame reel confirmed joined Squilliam legs, stable eyes, readable motion, and no T-pose bookend; both runs were finalized August 5, 2026.

## Patrick proof

Patrick was checked against three contrasting motions: the 57-frame Joyful Jump, the 135-frame Hip Hop Dancing clip, and nine evenly spaced samples from the 660-frame Arms Hip Hop Dance. The first two were rendered at every source frame and passed the complete automatic quality contract.

| Motion | Frames checked | Mapped body bones | Planar root retained | Maximum contact clearance | Maximum pose error | Face deviation | Automatic quality |
|---|---:|---:|---:|---:|---:|---:|---|
| Joyful Jump | 57 / 57 | 13 | 100% | `0.003937` | `0.000738` | `0` | Pass |
| Hip Hop Dancing | 135 / 135 | 13 | 100% | `0.020244` | `0.000673` | `0` | Pass |
| Arms Hip Hop Dance | 9 evenly spaced | 13 | 100% | `0.016427` | `0.000502` | `0` | Visual smoke pass |

Patrick's DAE places authored scale helpers between parts of the short leg chain. Directly mapping redundant Mixamo calf and foot rotations through those scaled parents produced a small quaternion-decomposition discrepancy even though the visible motion was sound. The final profile maps the hips, chest, head, shoulders, arms, wrists, and thighs, then delegates calves and feet to the existing source-driven IK. This reduced the measured mapped-pose error below `0.000739` radians without relaxing the `0.002`-radian profile bound. Hip Hop requires `0.129126` units of the declared `0.14` short-leg vertical correction; floor penetration remains below `0.000008`.

## Reuse boundary

Future formats import the normalized motion and character profile through the repo runtime. They do not duplicate the retargeting math. For a motion-ready character, a new standard Mixamo Collada clip needs local import, selection, validation, render, and inspection—no Blender or manual keyframing. A new character still needs a verified semantic bone map and its own visual proof.

## Interactive lab proof

Browser verification at 1440×900 confirmed a responsive 5×5 motion selector with all 25 motions and a four-column selector with all four verified characters. Startup loaded one character and one motion. Selecting Chicken Dance and Mr. Krabs increased the caches to two characters and two motions; selecting Squilliam increased the character cache to three; selecting Joyful Jump and Patrick increased the caches to four characters and three motions. The fourth button remained inside the selector bounds. This demonstrates manifest-first lazy loading rather than downloading all motion payloads on entry.

The same browser pass confirmed colored textures, visible eyes, Squilliam's joined two-leg reading, motion switching, character switching, pause, and restart. The renderer waits for each Collada loading manager—including textures—before exposing a character. Music, beat analysis, scoring, and transition choreography remain outside this proof.

## MP4 and GIF download proof

Version 0.3.1 adds one visible Download ↑ control immediately after Restart. Its two-item menu opens upward while the character name occupies a separate non-intersecting region; a 1440×900 Playwright geometry assertion protects the Squilliam layout.

An end-to-end browser run selected Squilliam and Rumba Dancing, then downloaded both outputs through the Wiggly page. The MP4 was a `266,014`-byte, 1280×720 H.264 file at 30 fps; the GIF was a `403,549`-byte, 640×360 looping file at 15 fps. Both were exactly `2.400` seconds. Visual inspection confirmed stable eyes, joined legs, intact textures, the selected motion, and the correct Squilliam Fancyson title. The same two-download browser run passed again from a fresh ZIP through its packaged `npm run lab` server. Both exports use `runtime/renderer/app.js` through the existing deterministic frame runner; there is no capture-stream or fallback renderer.

Version 0.4 repeated the live Wiggly page test with Patrick and Rumba Dancing. Playwright selected Patrick, selected Rumba, and received the expected `patrick-rumba-dancing.mp4` and `.gif` filenames. The `359,546`-byte MP4 is 1280×720 H.264, 72 frames at 30 fps; the `489,522`-byte GIF is 640×360 with 36 sampled frames. Both are exactly `2.400` seconds. A seven-frame contact sheet confirmed intact textures and face overlays throughout the downloaded MP4. The same two-download test passed from a clean v0.4.0 ZIP extraction after a fresh dependency install; the published SHA-256 sidecar matches the archive.

## Playback stability proof

The v0.5 browser regression adds artificial delay to character and motion requests, then issues eight rapid character/motion selections without waiting between clicks. The selector controls remain usable while loading, the old dancer remains on stage, stale completions are ignored, and the scene converges on the final Patrick + Twist Dance pair. The same pass forces `WEBGL_lose_context`, restores it, verifies that playback advances again, and reloads the lab five consecutive times. Version 0.6 extends the ordinary lab smoke to the full eight-character selector and finishes on Kermit (Sci-Fi).

The stress run reproduced the original intermittent freeze as `Frame -1 is outside 0-143`. A scene restart could occur a fraction after the browser timestamped the next animation callback, producing a negative elapsed interval. Elapsed time is now clamped at zero, and the animation callback schedules its successor from `finally`, so one unexpected frame error cannot permanently kill the loop. Interactive playback also disables the export-only preserved drawing buffer; deterministic output keeps it.

Export parity was repeated after the lifecycle fix with Patrick and Rumba Dancing. The official path produced a `359,521`-byte MP4 with 72 H.264 frames at 1280×720 and 30 fps, and a `506,390`-byte 640×360 looping GIF with 36 sampled frames. Both outputs are exactly `2.400` seconds and still render through `runtime/renderer/app.js`.
