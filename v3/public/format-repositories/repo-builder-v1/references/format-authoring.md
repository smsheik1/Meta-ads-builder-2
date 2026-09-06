# Author the child Format

Read this after blueprint approval and before implementing the scaffold. The builder does not supply the child's finished renderer: the host coding agent must write it.

## One reusable implementation

Choose the smallest implementation that can express the approved grammar. A deterministic FFmpeg composition may suit a simple media sequence; a scene-based renderer may suit authored animation. This is an implementation decision, not a requirement to copy the source creator's inaccessible project or install a particular framework.

Use one official renderer and one input contract. If the child offers previews and exports, both must consume the same input/scene data and renderer behavior. Episode-specific content belongs in inputs and declared assets, not hardcoded alternate scripts. Preserve fixed rules with validations or tests; expose only supported variable/optional controls.

The scaffold is intentionally a draft. Replace unfinished authoring boundaries with working code and useful child instructions before marking it ready for review. Do not change a status label or substitute arbitrary preexisting MP4s to make a draft appear complete.

Keep the real media inputs supported even when no-paid tests use fixtures. If the format depends on gameplay and recognizable character voices, the official runtime must accept the supplied authorized footage and voice clips; a procedural background or silent output cannot silently replace those requirements. Declare any upstream acquisition or generation capability that remains unimplemented. An explicitly labeled fixture can prove composition and reuse, not voice identity, production readiness, or reference fidelity.

## Standalone child contract

The child root must contain:

- `SKILL.md`: canonical operating workflow for using this particular Format.
- `AGENTS.md`: thin pointer to the child's `SKILL.md`.
- `README.md`: purpose, setup, required inputs, commands, outputs, and known limitations.
- `requirements.json`: `localTools`, `providers`, and `paidApprovalRequired: true`.
- `blueprint.json`: the interpreted format and evidence provenance without private reference media.
- `FORMAT-REPO.json`: runtime, release boundary, asset declarations, and proof receipts.
- The official runtime entrypoint named by the manifest.

Use only portable relative paths inside the child. Do not reference this builder's checkout, another user's machine, an internal skill, a Wiggly app route, or unshipped files. Declare any additional package manifest/lockfile and native tools needed to run it. Do not auto-install tools or hide provider requirements behind fallback code.

`FORMAT-REPO.json` uses:

| Field | Meaning |
| --- | --- |
| `schemaVersion`, `kind` | `1`, `"wiggly-format"`. |
| `slug`, `version` | Format identity and release version. |
| `status` | `"draft"` until authored; `"ready-for-review"` for a working, proved implementation. This is not a creative approval. |
| `runtime` | One official relative entrypoint. |
| `releaseFiles` | Explicit relative file allowlist; include everything required for a clean extraction to operate. |
| `assets` | `{path, source, usage, notes}` with the same provenance vocabulary as the blueprint. |
| `proofs` | At least two `{id, input, output, inspection}` entries pointing to distinct inputs and their resulting outputs/technical receipts. |
| `review` | `{status, reviewer, notes}`; status `"pending"` or `"approved"`, with accurate attribution and limitations. |

Do not package raw reference footage, extracted reference frames/audio or transcripts, secrets, cookies, model caches, dependency directories, private run artifacts, symlinks, or files outside the child. Only deliberately distributable, declared assets and proof media belong in the release. Rights to analyze a reference and rights to distribute its media are separate.

## Two independent content proofs

The goal is to show that users can change the content without asking an agent to rewrite the renderer.

1. Implement the first proof brief from the approved blueprint.
2. Record the official runtime's checksum and command; render through that entrypoint.
3. Change the actual content for the second brief—not just its file name or a hidden implementation flag. Use the same runtime without code edits.
4. Record input, output, technical inspection, command, runtime checksum, and review limitations for both. Verify that the differences appear in the actual outputs and that fixed rules still hold.
5. If a defect requires an implementation change, retain the failed evidence, fix the cause, add a guardrail test, and rerun both inputs on that same repaired runtime. Stop for user direction when essential reference evidence, rights, or permitted dependencies are missing.

The builder's `check-repo` is structural validation. It does not execute the child, determine whether the second story is meaningfully different, detect every hardcoded behavior, or certify the reference was understood. Those checks require inspecting the code and resulting outputs.

## Inspect, review, and package

Use `inspect --media <file> --output <new-report.json>` from the builder for each proof. The report supplies dimensions, duration, streams, and a checksum. Compare these facts with the child's output contract. Render success alone is not a technical pass for that contract.

Review moving video and sound directly if supported. A qualified human may supply that judgment when the host cannot. Report who reviewed what and preserve unresolved limitations. A sampled frame sheet or transcript alone cannot support complete audiovisual approval. Blueprint approval or benchmark attestation must never be copied into `review.status: "approved"` as though it judged the finished outputs.

Before packaging, run `check-repo --repo <directory>` and the child's own validation/tests. `package-repo --repo <directory> --output <new-archive.zip>` creates a local allowlisted archive and inventory, not a published listing. Pending creative review must remain visible.

Extract the actual archive into a clean directory. Check inventory/checksums and run the documented child commands on both inputs without access to the authoring checkout. Record any installation permission, network dependency, or platform limitation rather than quietly using local development resources. An independent agent given only the archive and new content is a stronger consumer proof; it is not a substitute for the separate fresh-agent test that created the child in the first place.

Deliver the archive, checksum, official commands, proof outcomes, and unresolved review/setup limits. Publishing, pushing, or adding the child to a discovery page is a separate task.
