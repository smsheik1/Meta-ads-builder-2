# Phase A/B — local implementation evidence

These are development checkpoints, not a published release or completed cross-platform acceptance.

## A — pause accounting

- Seven new regression tests; existing animation behavior and three-frame threshold unchanged.
- Synthetic two-second source: baseline incorrectly reported two clipped intervals, `[20,21]` and `[26,27]`, and failed `pauseClosuresStable`.
- Patched report measures the complete `[20,27]` quiet interval; all 17 technical gates pass.
- All 48 decoded video frames and decoded PCM audio are identical before/after. The proof also happened to produce the same MP4 hash; cross-platform byte identity is not required or claimed.
- Runtime test run: 28/28 passed at the Phase A checkpoint.
- Source proof: `/private/tmp/animal-pause-proof.AELUmu/parity-evidence.json`; reproduction script and before/after decoding evidence are alongside it.
- Same-environment synthetic mechanics proof only; not a perceptual or Linux/WSL claim.

## B — bootstrap

- `doctor`/`check` load before rendering/native Sharp; missing dependencies are reported together.
- Current macOS ARM64 doctor passes tools, FFmpeg capabilities, installed Sharp and all 11 asset checks.
- Extracted-kit regression works without node_modules or rendering modules.
- `env PYTHON=/not-installed/python CARGO=/not-installed/cargo npm test`: 55/55 passed at the Phase B checkpoint, including the seven pause regressions.
- Optional converter profile: three Python converter tests and seven Rust tests passed using the available offline cache.
- Central tool overrides and atomic same-directory JSON replacement are tested.
- Default test coverage was separated from Python/Cargo converter tests, not discarded.

## Remaining release acceptance

Build and install the versioned archive, repeat the full workflow on genuinely fresh inputs, review the actual videos, verify final exports, and execute Linux/WSL acceptance. These local phase results do not substitute for those checks.
