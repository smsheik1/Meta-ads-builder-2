# Blind-agent handoff evidence

The blind agent received only the packaged ZIP and this desired outcome: create and finalize the supplied We The Artists proof, whose creative review had already been approved. It was not given renderer or command implementation details.

Result: pass on attempt 1 of 3, with zero media-provider calls and no renderer edits. The returned final video had SHA-256 `966b601ebc40e1fed8724fdcb7c843fb027c56d950eb8e4dabafe54d9757dcd8`, byte-for-byte matching `../../examples/we-the-artists/evidence/final.mp4`; the duplicate video is intentionally not stored twice.

Observed friction and smallest fixes:

- Dependency installation appeared in README but not at the point of use in the agent loop. `SKILL.md` now names `npm install` before smoke.
- Showing the contact sheet and video depended on the host viewer. The agent loop now says that explicitly, without adding a duplicate preview renderer.
- Optional Fish variables looked noisy in the general requirement report. Their status now says they are optional when approved narration is already present.

`state.json`, `quality-report.json`, and `finalization.json` preserve the run's attempt count and gates. The blind package predated a non-behavioral removal of unused renderer debug state; the final package was separately smoke-tested from a clean extraction after that cleanup.
