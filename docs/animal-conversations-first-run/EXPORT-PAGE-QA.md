# Exported page — browser QA

Status: **PASS — scoped exported-page UI acceptance** after the two reported presentation issues were fixed and all checks rerun against regenerated exports.

## Scope and environment

- Fixture metadata retains format version `0.16.0`; source was the isolated development kit. The corrected export module tested has SHA-256 `d5a8b1f309783864bc936f8751abdf9245d1b0452137160c1cc41c05e5afcf93`. Packaging the fixes as the new `0.16.1` candidate is handled separately by the main agent; this UI check is not a claim to have freshly installed that archive.
- Actual `file://` pages in Google Chrome `152.0.7977.76`, macOS ARM64, using local Playwright in a fresh, isolated headless browser context with networking offline. No server, personal profile, user tabs, history, or real media was used.
- This uses the documented fallback because the in-app browser previously returned `Browser is not available: iab`, and the bundled Playwright browser executable was absent. Scoped browser-launch permission was used.
- Two clearly labeled **SYNTHETIC UI TEST** fixtures, each a generated one-second sine tone and two half-second beats, went through the official animation renderer. The second uses hostile-looking title and caption text. The ordinary fixture was exported both with and without review WAVs.
- Synthetic approval and playback attestations were deliberately mocked, following the existing integration-test approach, solely to exercise finalization and export UI. They are **not real user approvals, actual perception, creative acceptance, or end-to-end release evidence**. The fixture titles, labels, and private attestation notes say this explicitly.
- All harnesses, private fixture runs, exports, and screenshots are under `/private/tmp/animal-export-browser.XBF9Gb/`, outside the released package. No original episode or historical run was edited. Package-source changes were limited to the two explicitly authorized export presentation fixes and their regression assertions.

## Observed results

| Check | Result |
| --- | --- |
| Actual native video controls | All three exported pages played after a native control click. Each video reported a one-second duration, advanced beyond 0.15 seconds, reached `readyState=4`, and had no media error. |
| Default export | Zero audio controls, with the explicit message “Review audio was not included in this export.” No missing-media controls. |
| Optional review audio | Full one-second WAV plus both half-second beat WAVs played using native controls. All three exported WAV SHA-256 values exactly match their canonical review files. |
| Ordinary wide and narrow layouts | Document width equals the 1440px or 390px viewport, with no whole-page horizontal overflow. The optional-audio table scrolls within its own container at narrow widths. |
| Local contact sheets | Loaded on every page and at both widths. |
| Hostile caption and title | Remain escaped, literal presentation text. No injected script, iframe, or extra image element; the execution marker remains false. Path-redaction transforms the closing script-like token in the title, but it never becomes markup. |
| Console, page errors, remote requests | Zero console errors, zero page errors, zero HTTP(S) requests. |
| Open video file link | Native click opens the exact local `final.mp4` in Chrome’s player. The link no longer has a download attribute; accompanying text explains that the MP4 already exists in the export folder. The opened file’s hash matches the verified MP4. |
| Long/hostile title at 390px | The title now wraps within 342px of available content space, and document width stays 390px. No document overflow at 390px or 1440px. The caption table remains scrollable inside its own container. |

Screenshots were visually inspected. Playback-time advancement verifies UI/media mechanics only; it does not establish that a reviewer heard sound or judged dialogue intelligibility or synchronization.

## Issues found and fixed

1. A valid long/hostile title expanded the 390px document to 606px, with heading text measuring 582px inside a 342px content area. Added only `overflow-wrap:anywhere` to the heading. The regenerated export now stays 390px wide.
2. Chrome’s native `file://` handling opened the MP4 instead of emitting a download event. Changed the label to **“Open video file”**, removed the download attribute, and added a note that `final.mp4` is already included in the export folder. The actual native link was clicked and its exact file target verified. No server, JavaScript downloader, or browser workaround was added.

Both issues were reported before editing; the main agent explicitly lifted the source freeze only for these fixes. Added minimal HTML guardrail assertions for heading wrapping, the exact file link, and the explanatory note. `WIGGLY_QUALITY_MEDIA_TESTS=1 node --test runtime/tests/quality-export.test.mjs` passed **9/9**; `git diff --check` passed. No approval, renderer, workflow, or media-generation semantics changed. Initial exports were preserved, and corrected exports were generated into new `-fixed` directories before browser verification.

## Reproduction evidence

Evidence directory: `/private/tmp/animal-export-browser.XBF9Gb/`

- `export-fixture.mjs`: generates isolated, labeled synthetic fixtures with the official renderer and mock validator attestations.
- `fixture-evidence.json`: source version/hash, verified export hashes, and exact optional-WAV comparisons.
- `export-regenerate.mjs`: creates corrected export presentations in new destinations while retaining the original outputs and initial evidence.
- `export-browser-proof.mjs`: isolated offline browser checks and native control actions.
- `export-browser-evidence.json`: final passing observations, dimensions, playback states, link behavior, and injection checks.
- `export-browser-evidence-initial.json`: original two findings, preserved separately.
- `synthetic-export-ui-default-fixed-1440.png` and `synthetic-export-ui-default-fixed-390.png`.
- `synthetic-export-ui-with-audio-fixed-1440.png` and `synthetic-export-ui-with-audio-fixed-390.png`.
- `synthetic-hostile-ui-default-fixed-1440.png` and `synthetic-hostile-ui-default-fixed-390.png`.
- `native-open-video-link-result.png`: Chrome native-player navigation after clicking the corrected link.

The browser harness initially clicked before metadata had established the video’s dimensions. It was corrected to wait for metadata before the native control click. A subsequent download-event timeout exposed the actual local-link behavior; that finding was recorded before changing the package. The final harness tests the revised link’s stated behavior directly.

This closes scoped exported-page browser acceptance only. It does not certify the fresh archive, Linux/WSL, real-episode approval, perceptual playback review, or production readiness.
