# Wiggly v3 References

This file records the external and internal references that shaped Wiggly v3. It is a guardrail for future work, not a feature backlog.

## Avnac Inspiration

Avnac influenced the editor architecture at the pattern level:

- Model scenes as typed data first, then render from that data.
- Keep rendering separate from the scene model.
- Keep editor interaction state in a small Zustand store.
- Treat formats as registry modules, so a new format plugs in without changing the create page core.
- Split large editor surfaces into focused modules once the scene contract is stable.

Wiggly reimplements these patterns in its own code. We are not copying Avnac source into v3.

If we ever paste source code from an AGPL project or another copyleft project, pause first and handle license compatibility, source availability, and attribution explicitly.

## Wiggly v1 Reference

Wiggly v1 remains useful as a read-only product reference:

- Visual taste for the original `/create` page.
- Visualizer feel, idle waveform recipe, and reroll shine behavior.
- Latest ad copy, research, and dialogue prompt decisions.
- The user journey from website URL to ad, audio, download, and share link.

Do not ship from v1 and do not port old wiring wholesale. v1 is reference material; v3 is the product path.

## v3 Architecture Rules

- `AdScene` is the data contract.
- `AdRenderSurface` is the visual render entry point.
- The format registry owns format-specific rendering and interaction metadata.
- `/create` orchestrates the product flow, but format behavior belongs in `features/formats/*`.
- The canvas interaction store is for editor interaction only. It must not import Convex, server data, or scene/product data.
- Save, share, and download should all consume the same frozen scene contract.

These rules exist so future formats can be added as isolated modules instead of creating another app-wide surgery.
