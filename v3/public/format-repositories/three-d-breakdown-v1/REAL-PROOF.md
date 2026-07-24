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
- Technical note: the old clips are 10.042 seconds at 496×864 and contain no audio stream. Passing those mechanical checks did not make them creatively acceptable.

See `agent-runs/lego-origin-proof/` for the inputs, scene contract, images, attempt history, and quality report.

### Corrected 480p proof

- Direction: a failed carpentry livelihood turns heavy wooden work into the first easy-to-sell toys.
- Planning: the locked GLM 5.2 path produced a 48-word script, six-frame plan, and two continuous clip contracts.
- Paid image attempts: one Nano Banana 2 Lite storyboard plus four separate full-quality endpoints at frames 1, 3, 4, and 6.
- Video: two 10-second Seedance 2.0 Mini clips at 480p, generated and inspected one at a time.
- Result: `clips-ready`.
- Human review: the ladder, carpenter, workshop, wood, and toy car remain coherent; both clips use continuous physical motion; the final car is sharp; no unrelated person or setting appears.
- Technical review: both clips are 10.042 seconds at 496×864, the duration gate passes, and the quality report contains no problems.
- Boundary: no voice or final 20-second composition was generated.

See `agent-runs/lego-origin-quality-proof/` for the scene, four production endpoints, both clips, contact sheet, attempt history, and quality report.

## David's Cookies stopped attempt

- Input: a selected blueberry-pie product from a real saved site-research run.
- Result: stopped before selection or image generation.
- Reason: the proposed directions relied on unsupported product claims because the available evidence did not specifically support the chosen product.
- Lesson: product-led stories must validate that their evidence belongs to the selected product before approving a direction.

See `agent-runs/davids-blueberry-pie-proof/` for the research, proposed directions, and stopped state.
