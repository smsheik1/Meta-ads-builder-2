# Playable review page — browser QA

Status: **PASS** — scoped review-page playback, layout, and escaping acceptance after the small presentation fixes.

## Environment and scope

- The in-app browser tool returned `Browser is not available: iab`.
- Used the documented local Playwright fallback with installed Google Chrome in a fresh, isolated headless profile. The bundled Playwright headless executable was absent. Chrome required the scoped local-test sandbox approval.
- Verified browser version: Google Chrome `152.0.7977.76`, macOS ARM64.
- Opened the actual `file://` page, not an HTTP server. Browser context was offline; no personal browser profile, tabs, history, or user media was used.
- Fixture: `v3/public/format-repositories/animal-conversations-v1/agent-runs/review-layout-proof/`. Public smoke input plus a generated 4.5-second sine tone, explicitly review-only. No episode approval, render, playback-review receipt, or finalization was granted.
- A synthetic tone checks media mechanics; it cannot validate dialogue intelligibility. Advancing playback time is not a claim that the reviewer heard the audio.

## Results

| Check | Observed result |
| --- | --- |
| Complete soundtrack and all three beat players | Native controls start playback; each player's `currentTime` advances beyond 0.2 seconds. |
| Local file operation | Page and WAVs operate directly through `file://` in an offline browser context. |
| Normal 1440px and 390px layouts | Readable hierarchy and controls; no horizontal overflow. |
| Malicious-looking title, caption, and note | Render as literal text; no injected script, image, or iframe elements execute. |
| Long unbroken malicious-looking caption at 390px | Initially expanded the document to 488px. After adding text wrapping, hostile and normal content both stay within 390px. Escaping remains intact. |
| Beginner readability | Uncertainty stays visible in a plain-language callout. Technical evidence is collapsed under “How this was checked”; the actual disclosure control was clicked open and closed successfully. |
| Console, page errors, remote requests | Zero console errors, zero page errors, zero HTTP(S) requests in the offline browser context. |

The presentation adjustments were reported to and approved by the main agent before editing. Only paragraph wrapping, the visible uncertainty callout, and default disclosure presentation changed. No approval identity, renderer, soundtrack, or episode workflow semantics changed.

The full browser rerun passed. Complete soundtrack duration was 4.5 seconds; each of the three exact clips was 1.5 seconds. All four players reached `readyState=4`, advanced beyond 0.2 seconds after clicking the native control, and reported no media error. Screenshots were visually inspected after the fix.

`WIGGLY_REVIEW_MEDIA_TESTS=1 node --test runtime/tests/review.test.mjs` passed **8/8** tests; the HTML regression asserts wrapping, a visible escaped uncertainty message, and collapsed technical details. `git diff --check` passed.

## Local evidence

Temporary evidence folder: `/private/tmp/animal-review-browser.BOvjzG/`

- `review-browser-proof.mjs`: reproduction harness; uses a fresh isolated browser context.
- `review-browser-evidence.json`: complete passing machine-readable observations, including timing, dimensions, disclosure behavior, and error/request counts.
- `review-1440.png`: complete wide page.
- `review-390.png`: complete narrow page.
- `review-escaped-metadata.png`: harmless rendered payload after the caption overflow fix.

Media and screenshots are intentionally outside the published kit and not committed. The fixture run remains ignored under `agent-runs/` for inspection.

This closes review-page QA only. It does not claim episode approval, perceptual video review, an end-to-end package proof, Linux/WSL verification, or a published release.
