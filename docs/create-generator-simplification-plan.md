# Create Generator Simplification Plan

Status: saved plan only. Do not implement until the user explicitly says to begin.

## Goal

Simplify `/create` into a generator and preview surface, not an editor.

The user should get as much value as possible without reintroducing the fragile mini-editor bug class. `/create` should help users paste a URL, generate ads, spacebar-reroll full scenes, add or replace audio, edit caption text, download, share, save, and open the result in builder.

Detailed movement, resizing, precision layout controls, per-element colors, locks, and visual layout editing belong in `/builder`.

## One-Sentence Removal Summary

Remove `/create`'s individual component editing behavior: selection overlays, selected-slot state, hover lock/color/background controls, scoped reroll, movement, resizing, and per-element layout tweaking.

## Functionality That Must Stay

- Website research and generated variants.
- Fresh visitor placeholder reroll.
- Full-ad spacebar reroll.
- Preview formats.
- Audio generation, upload, replace, and playback.
- Caption text editing.
- Download video.
- Create share link.
- Save design.
- All ideas / brand dump visibility where useful.
- Open in builder as the eventual path for detailed edits.

## Functionality That Moves To Builder

- Selecting individual visual elements for layout work.
- Moving components.
- Resizing components.
- Per-element layout precision.
- Hover lock controls.
- Hover color/background controls.
- Scoped reroll of only one selected visual slot.
- Detailed visual/canvas editing.

## Phase 1: Remove Mini-Editor Behavior

Strip `/create` back to full-scene preview/reroll only.

Remove or disable:
- `CreatePreviewSelectionOverlay` from `/create`.
- Selected slot UI.
- Hover lock/color/background controls.
- Scoped reroll affordances.
- Movement and resizing behavior.

Keep:
- Audio controls.
- Caption text editing.
- Download/share/save.
- Preview formats.
- Website research.
- Full-scene spacebar reroll.

## Phase 2: Tighten Reroll And State Contract

Make spacebar reroll operate only at the full `AdScene` level.

Rules:
- Reroll selects or creates a complete next `AdScene`.
- No reroll mutates scattered top-level UI state.
- Remove `/create` dependence on selected-slot and lock state.
- Keep Zustand small: `uiStatus` and `playbackStatus` stay; scene data, Convex data, audio URLs, render jobs, and format data stay out.
- URL inputs, modals, and audio playback must block reroll.

## Phase 3: Protect Render, Share, And Download Parity

Ensure preview, share, and download all consume the same active scene contract through `AdRenderSurface`.

Rules:
- `AdRenderSurface` remains passive and renders only the active scene contract.
- Canvas preview, Remotion export, and share pages use the same renderer path.
- Mini-editor leftovers must not affect export.
- Caption text and audio state must survive the simplified `/create` flow.

## Phase 4: Guardrail Tests And Cleanup

Remove obsolete tests/components tied to `/create` editing and add tests for the simplified generator contract.

Required coverage:
- No selection overlay import/render in `/create`.
- No selected-slot or lock local state in `/create`.
- Spacebar rerolls the full scene.
- Reroll returns or swaps complete scene data.
- `AdRenderSurface` does not own mutation logic.
- URL input, modals, and audio playback block reroll.
- Download, share, save, audio, and caption text controls still work.
- Fresh visitor placeholder reroll works.
- Generated ad reroll works.
- Submit keeps canvas stable while researching.
- Add audio and edit captions still open modals.

## Completion Signal

When Phase 4 is complete, tell the user exactly:

Congratulations, all phases are finished.

## Assumptions

- `/create` is the acquisition/product hook, not the editor.
- `/builder` becomes the real editing surface later.
- The core app swaps scene data; format-specific rendering stays behind the format registry.
- Caption text editing is content editing and may remain on `/create`.
- Audio upload/generation/replacement is part of generation/export and may remain on `/create`.
- Waveform/caption positioning and other visual layout controls belong in `/builder`.
