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
- The modified TVG decoder reads the supplied active frame-one drawings.
- TGCO color art is resolved by the encoded side of each directed boundary;
  exterior regions are excluded instead of being treated as paint buckets.
- The official `convert_pose.mjs` entrypoint exports each drawing, applies its
  source PEG transform, paints it independently with common scene bounds, and
  composites the XStage layers from bottom to top.
- Complete colored cat and bunny poses pass dimension, alpha coverage,
  transparent-border, required-palette, and source-layer-count checks without
  Toon Boom Harmony.

The 64 MB cat and 61 MB bunny Harmony projects remain external user-supplied
inputs. The Repo packages only the converter, exact frame-one manifests,
checksummed proof outputs, and receipts.

## Reproduce the proofs

```bash
npm install
npm run convert -- \
  --rig=/absolute/path/to/CAT_LOOP_1 \
  --manifest=cat-frame1 \
  --output=/absolute/path/to/cat-frame1.png

npm run convert -- \
  --rig=/absolute/path/to/BUN_LOOP_1 \
  --manifest=bunny-frame1 \
  --output=/absolute/path/to/bunny-frame1.png
```
