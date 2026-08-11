# Animal Conversations converter recovery

This directory preserves the Harmony-free Toon Boom conversion proof recovered
from the interrupted `Explain this tool` Codex task on 2026-08-11.

## Upstream decoder

- Project: `c-probably-archived20260718/tvg`
- Source: <https://github.com/c-probably-archived20260718/tvg>
- Recovered upstream commit: `9d09471e86356948ec7eeb37c82387e5188d1f05`
- Declared crate license: MIT

The recovered source contains uncommitted decoder extensions for additional
Harmony 22 shape identifiers, embedded thickness tags, raw component metadata,
and an experimental `export_spec` command that exposes palette colors, paths,
and paint-region seed data.

## Current proof status

- The cat and bunny Harmony projects parse at the scene level.
- The modified TVG decoder structurally reads most supplied drawings.
- Palette IDs and TGCO paint seed coordinates are recoverable.
- A single cat body drawing was partially rendered, but the fill topology is
  visibly incorrect and is not a passing proof.
- No complete colored cat or bunny pose has passed visual comparison yet.

The converter is not runtime-ready until the full-pose proofs pass and the
official runner can reproduce them from clean inputs.
