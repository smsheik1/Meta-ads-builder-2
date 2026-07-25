# Real production proof

## Creative quality evidence

The Repo includes three earlier Wiggly production references in `goldens/`, with provenance, reviewed narration, strengths, and known weaknesses in `goldens.json`.

- **Grüns:** the earlier Wiggly baseline. It proves the product can travel into an explanation world and return to a clean payoff, but its abstract hook and repeated tunnel shots remain weaknesses to beat.
- **Kiala Nutrition:** the clearest routine-compression example. A pile of separate supplements becomes one unified product system.
- **Theragun:** the clearest physical-mechanism example. A familiar customer action becomes a cutaway that shows why heat changes the result.

These references establish the creative bar. They do not authorize copying brand claims, wording, or shots.

## LEGO technical proof

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
- Result: `continuity-passed-style-b-failed`.
- Human review: the ladder, carpenter, workshop, wood, and toy car remain coherent; both clips use continuous physical motion; the final car is sharp; no unrelated person appears. However, both clips stay in the warm workshop and omit Style B's recognizable blue explanation stage.
- Technical review: both clips are 10.042 seconds at 496×864, the duration gate passes, and the quality report contains no problems.
- Root correction: the Format now fixes the world sequence by frame number—lifestyle setup in frames 1-2, blue/cyan blueprint-grid breakdown in frames 3-4, and lifestyle payoff in frames 5-6. This corrected world arc has not yet received a paid media reproof.
- Boundary: no voice or final 20-second composition was generated.

See `agent-runs/lego-origin-quality-proof/` for the scene, four production endpoints, both clips, contact sheet, attempt history, and quality report.

### Style B world-arc technical proof

- Direction: LEGO survives the 1930s downturn by turning difficult-to-sell carpentry into simple wooden toys.
- Planning: the approved scene moves from the warm workshop into the blue/cyan breakdown world, then returns to the workshop for the payoff.
- Paid image attempts: one Nano Banana 2 Lite storyboard, four accepted full-quality endpoints, and one replacement for a rejected final endpoint that contained fake article text.
- Video: two separately approved 10-second Seedance 2.0 Mini clips at 480p, with no retry or duplicate generation.
- Result: `style-b-clips-passed`.
- Human review: clip 1 keeps the carpenter and wooden objects coherent while moving from the workshop into the blue grid. Clip 2 assembles the wooden car in the blue world, returns to the same workshop, and ends with a finished wooden-toy collection. Neither clip invents visible text or an unrelated person.
- Technical review: both clips are 10.042 seconds, the duration gate passes, and the Repo inspector reports `clips-ready`.
- Provider finding: the first Replicate prediction took 319 seconds and the second took 1,725 seconds. The foreground runner incorrectly stopped polling before both healthy predictions completed. Their exact prediction outputs were recovered without retries. A future runner must persist and resume provider prediction IDs instead of extending a foreground timer.
- Voice: one Fish S2.1 Pro Free narration, 19.193 seconds.
- Final: one 1080×1920, 20-second MP4 with audio, rendered locally through `AdRenderSurface`.
- Final result: `technical-passed-marketing-failed`. The automated report found no mechanical problems and the contact sheet preserves the approved world arc, but the hook does not quickly establish LEGO or a strong viewer problem. The finished file is evidence that the pipeline works, not evidence that the ad is good enough to run.
- Spend note: the final proof reused the accepted clips and made no new Replicate call.

See `agent-runs/lego-origin-world-arc-proof/` for the accepted endpoints, rejected endpoint evidence, scene, clips, narration, final MP4, contact sheets, attempt history, and quality report.

## David's Cookies stopped attempt

- Input: a selected blueberry-pie product from a real saved site-research run.
- Result: stopped before selection or image generation.
- Reason: the proposed directions relied on unsupported product claims because the available evidence did not specifically support the chosen product.
- Lesson: product-led stories must validate that their evidence belongs to the selected product before approving a direction.

See `agent-runs/davids-blueberry-pie-proof/` for the research, proposed directions, and stopped state.
