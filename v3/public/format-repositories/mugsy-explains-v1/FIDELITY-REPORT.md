# Wiggly Mugsy Explains Fidelity Rebuild

## Target

Rebuild the existing Wiggly proof using the source format's actual production grammar instead of a new visual interpretation.

## Locked Source Rules

- Plain white 9:16 canvas.
- One or two proof images at the top.
- Short handwritten rolling caption beneath the proof.
- The same non-speaking line-art host reused from a fixed pose pack.
- Hard cuts only.
- Continuous omniscient narration.
- No generated character, lip sync, camera motion, or decorative app chrome.

## Completed

- Preserved the approved 15-sentence Wiggly script and 27 caption cards.
- Extracted five recurring source poses: point left, point right, raised hand, coffee/explain, and question.
- Replaced the generic office avatar with those exact reusable source poses.
- Matched the source character scale by preserving its original 720-to-1080 scale ratio.
- Removed the invented grid, header badge, progress bar, caption boxes, shadows, and bordered media cards.
- Matched the source proof-image placement, rounded corners, handwritten labels, and caption hierarchy.
- Added Fish Audio zero-shot cloning with three clean, exactly transcribed source references.
- Kept Fish on the free `s2.1-pro-free` model and removed the Mac system-voice fallback.
- Generated all 15 narration sentences through the authorized source references.
- Rendered a 25.21-second, 1080x1920, 30 fps H.264/AAC proof with one audio stream.
- Measured -14.4 LUFS integrated loudness, -1.5 dBFS true peak, and no silence gap over 0.25 seconds.
- Made no product-code changes and no paid image/video calls.
- Packaged the proof as a standalone agent handoff and passed a final operator run plus independent adversarial audit.
- Added full-image containment so proof content is never cropped inside its card.
- Added atomic, decoded, hash-pinned narration caching and hash-bound MP4 inspection receipts.

## Current Status

The source-matched proof is rendered and passes the mechanical media checks. A human listening check is still required to judge subjective voice identity, pronunciation, and whether the cloned delivery feels close enough to the source narrator.

## Root Causes And Smallest Fixes

| Problem | Root cause | Smallest fix |
| --- | --- | --- |
| Presenter looked unrelated | A generic newsletter-agent portrait was reused as a host | Extract the source's fixed recurring pose pack once and reuse it |
| Presenter felt like a talking spokesperson | The replacement portrait implied an on-camera narrator | Restore the source's non-speaking line-art demonstrator |
| Layout felt like a new template | Grid, badges, bordered cards, and progress chrome were invented | Remove every element absent from the source |
| Presenter initially rendered too small | Source pixels were pasted into a 1080 canvas without the 720-to-1080 scale conversion | Scale extracted poses by 1.5 before placement |
| Narration sounded synthetic and off-format | macOS `say` was used as a placeholder | Require Fish zero-shot cloning or a deliberate Fish voice; never silently fall back to the system voice |
| Fish key was reported missing | The proof looked only in a newly created `v3/.env.local` placeholder instead of the existing CreatorOps secrets file | Delete the redundant placeholder and read only `FISH_STUDIO_APIKEY` from the existing secrets source |
| Fish rejected valid WAV references | Raw reference audio was base64-encoded into JSON, but Fish requires MessagePack for binary reference audio | Send WAV bytes with `Content-Type: application/msgpack` |
| Narration measured 24.39 seconds | Edge trimming removed enough breath space to miss the 25-second minimum | Reuse the accepted Fish clips and insert a 55 ms source-like pause between sentences |

## Remaining Acceptance Checks

- [ ] Fish narration audibly resembles the authorized source voice (human listening check).
- [x] Full narration stays continuous with no gap longer than 0.25 seconds.
- [x] Final duration stays within 25-35 seconds.
- [x] Every caption card is timed from its measured matching spoken sentence.
- [x] Final MP4 is 1080x1920, 30 fps, H.264/AAC, with one audio stream.
- [x] Final contact sheet remains visually faithful beside the source sheet.
