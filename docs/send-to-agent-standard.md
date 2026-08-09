# Send to Agent standard

## Decision

Wiggly sends a launcher, not a master prompt.

The website selects the latest published Format package and tells the agent where to get it. The downloaded Repo owns the workflow, contracts, approvals, validation, and deliverables. After download, the agent reports the exact version from `KIT-MANIFEST.json`; that resolved version—not a version copied into the launcher—is the reproducible identity of the run.

This prevents the website prompt, Codex deep link, shell commands, and agent-specific instruction files from drifting into different operating manuals.

## Launcher contract

Every launcher contains only:

1. The creative goal and Format name.
2. The stable Format page.
3. The stable latest-package URL when a runnable Repo exists.
4. A direction to read the package-owned instructions and report the manifest version.
5. The hard boundaries that must survive transport: use the packaged runtime, obtain explicit approval before paid providers, pass validation and quality checks, and return the Repo-defined deliverables.

Do not copy required-input lists, command sequences, proof links, provider recipes, first-question scripts, or exact public versions into the launcher. Those belong in the package and change more often than the transport.

If a Format does not yet publish a runnable Repo, the launcher points to its Format page and published technical files. It must remain concise; it must not recreate a hidden Repo in prose.

## Package instruction layout

The built ZIP root is the portability boundary:

```text
AGENTS.md                         # root router for Codex, Antigravity, and Copilot
CLAUDE.md                         # imports AGENTS.md
.cursor/rules/wiggly-format.mdc   # always-on pointer to AGENTS.md
KIT-MANIFEST.json                 # exact resolved version and package inventory
<format>/SKILL.md                 # one canonical operating workflow
```

Only agents that do not consume `AGENTS.md` directly receive adapters. Adapters stay thin: they may identify `AGENTS.md`; they may not restate commands, provider rules, deliverables, or Format behavior. `AGENTS.md` reports the manifest version and routes to one canonical `SKILL.md`. The skill owns intake, provider approval, validation, inspection, and delivery.

## Version behavior

- The stable website and ZIP links resolve the latest published package.
- A launcher never pins the page's current version string.
- The extracted `KIT-MANIFEST.json` pins the exact bytes the agent received.
- The agent reports `formatVersion` before intake and preserves it with run evidence.
- Any material workflow or package-entrypoint change requires a new Format version and rebuilt checksum.

## Adoption checklist

For every runnable Format:

1. Add a stable `repositoryHref` to its Discovery profile.
2. Generate the root instruction layout above during packaging.
3. Keep one canonical `SKILL.md`; make all adapters route to it.
4. Add a package check that compares root `package.json` with `KIT-MANIFEST.json`, confirms every entrypoint exists, and rejects detailed adapter copies.
5. Test that the website launcher is concise, says latest, omits a hard-coded version, and retains paid-provider and definition-of-done boundaries.
6. Rebuild the ZIP and checksum.
7. Extract into a clean directory, install, check, smoke, and hand it to a fresh agent with only the launcher.
8. Verify the agent reports the exact manifest version, reads the canonical skill, begins the correct intake, and does not invent another workflow.
9. Test the actual Discovery menu in a browser, including Codex URL generation, Antigravity copy-then-open behavior, every CLI command, and catch-all copy.

## Pilot

`bikini-bottom-dance-off-v1` is the first package using this standard. Version `0.10.0` changes the handoff and package instruction boundary while preserving the `0.9.1` renderer and finished-media proof.
