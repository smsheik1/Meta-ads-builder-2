---
name: bikini-bottom-dance-off
description: "Create a 30-second vertical four-character dance-off from a local song using the verified Character Dance Lab renderer."
---

# Bikini Bottom Dance Off

1. Run `npm run check` before a real run.
2. Initialize with `node runner.mjs init --run=<id> --song=/absolute/path/to/song.mp3`.
3. Review the detected excerpt and edit only the run's `input.json` if a different section is desired.
4. Run `validate`, then `render`. Do not replace the Character Dance Lab renderer or retargeter.
5. Run `inspect` and watch the MP4. Check eyes, faces, full-body framing, solo ordering, captions, beat feel, and CTA safety.
6. Finalize only with `--human-review=pass` after a person approves the rendered proof.

Keep operator-supplied songs inside ignored run folders. Voice generation is optional and must not block the music-and-caption proof.
