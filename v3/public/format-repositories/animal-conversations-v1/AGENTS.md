# Wiggly Format Kit

This workspace contains one versioned, runnable Wiggly Format.

Before taking task action:

1. Read `KIT-MANIFEST.json` and report its `formatVersion` as the exact resolved version.
2. Read `SKILL.md` completely; it is the single canonical workflow for this kit.
3. Follow the contracts named there. Do not replace the packaged runtime or renderer, and do not invent a parallel workflow from a website prompt.
4. Begin the Format's intake flow from the canonical skill.

Codex, Antigravity app and CLI, and GitHub Copilot read this root file directly. Claude Code and Cursor use thin adapters that only route here.
