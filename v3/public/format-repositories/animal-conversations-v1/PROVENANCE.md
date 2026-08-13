# Provenance

- Cat and bunny source rigs: supplied by the user as Toon Boom Harmony projects. The projects are converter inputs and are not redistributed here.
- Background plates: five files supplied by the user for this format; checksums are recorded in `assets.json`.
- Character pose PNGs: locally reconstructed from the supplied rigs by `converter/convert_pose.mjs`; pose receipts and converter tests prove layer count, palette, transparent borders, required head/body/tail opacity, and the recovered bunny head-shadow fill.
- TVG decoder foundation: `c-probably-archived20260718/tvg`, commit `9d09471e`, MIT licensed. The vendored source attribution is in `converter/source/README.md`.
- Runtime audio: every new episode's raw audio is supplied locally by its user, stays in the ignored run folder, and is excluded from version control. The approved fixed example MP4s are intentionally distributed with their soundtracks as reference media; the user explicitly requested publication of the corrected `i-made-a-mistake` example.
- Speaker evidence: per-beat review clips and checksum-bound assignment receipts stay in the ignored local run folder and are not packaged as standalone audio.
- Provider calls: none.
