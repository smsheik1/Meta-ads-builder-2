# Wiggly Format Kit

This workspace contains one versioned, runnable Wiggly Format.

Before taking task action:

1. Read `KIT-MANIFEST.json` and report its `formatVersion` as the exact resolved version. The website selects the latest published kit; this manifest pins the copy you actually received.
2. Read `bikini-bottom-dance-off-v1/SKILL.md` completely. It is the single canonical workflow for this kit.
3. Follow the files and contracts that workflow names. Do not replace the packaged runtime or renderer, and do not invent a parallel workflow from the website launcher.
4. Begin the Format's intake flow from the canonical skill.

Codex, Antigravity app and CLI, and GitHub Copilot read this root file directly. Claude Code and Cursor use thin adapters that only route here. No agent-specific file may restate or override the canonical workflow.
