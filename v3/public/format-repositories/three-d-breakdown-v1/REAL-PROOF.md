# Real production proof

## LEGO origin story

- Input: LEGO's documented company-origin article.
- Direction: rewind from a modern brick to the first documented 1932 wooden-toy product line.
- Planning: five directions, one selected Style B script, six storyboard frames, and two 10-second clip plans.
- Paid image attempts: one storyboard plus full-quality frame-1 and frame-4 starts. The old runner then enlarged tiny storyboard panels into frame-3 and frame-6 endpoints.
- Video: two 10-second Seedance 2.0 Mini clips were generated in one attempt from those mixed-quality inputs.
- Result: `failed-paid-media-quality`.
- Human review: the clips are not good enough to run as ads. Their ending images are visibly soft, the payoff appears too early, and clip 2 invents a different CGI person and setting.
- Root cause: planning thumbnails were used as production media, while old prompt rules forced a recurring presenter and three hard-cut subshots even when the approved story was object-led.
- Correction: the runner now requires four independently generated endpoints (frames 1, 3, 4, and 6), preserves object-only frames, makes each clip one continuous transformation, and requests 480p.
- Reproof status: no new paid calls have been made. The corrected pipeline must pass endpoint review before another video attempt.
- Technical note: the old clips are 10.042 seconds at 496×864 and contain no audio stream. Passing those mechanical checks did not make them creatively acceptable.
- Boundary: no voice or final 20-second composition was generated.

See `agent-runs/lego-origin-proof/` for the inputs, scene contract, images, attempt history, and quality report.

## David's Cookies stopped attempt

- Input: a selected blueberry-pie product from a real saved site-research run.
- Result: stopped before selection or image generation.
- Reason: the proposed directions relied on unsupported product claims because the available evidence did not specifically support the chosen product.
- Lesson: product-led stories must validate that their evidence belongs to the selected product before approving a direction.

See `agent-runs/davids-blueberry-pie-proof/` for the research, proposed directions, and stopped state.
