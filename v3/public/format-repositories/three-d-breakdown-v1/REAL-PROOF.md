# Real production proof

## LEGO origin story

- Input: LEGO's documented company-origin article.
- Direction: rewind from a modern brick to the first documented 1932 wooden-toy product line.
- Planning: five directions, one selected Style B script, six storyboard frames, and two 10-second clip plans.
- Paid image attempts: one storyboard, one frame-1 anchor, and one frame-4 anchor. All three succeeded without retries or provider fallbacks.
- Video: two sequential 10-second Seedance 2.0 Mini clips, each generated in one attempt from its approved production anchor and storyboard ending frame.
- Result: `clips-ready`.
- Human review: the two anchors are visually coherent and usable. Frame 4 includes the workshop, brick, wood shavings, and wooden toy, but the transformation is less literal than the written plan because the toy is already visible.
- Video review: clip 1 moves from the modern brick through the dark crisis beat into the rewind path. Clip 2 turns that path into a wooden car and returns to the modern brick. The same workshop, objects, and visual language survive both clips with no generated text.
- Technical review: both clips are 10.042 seconds at 496×864, contain no audio stream, and pass the packaged duration and media-presence checks.
- Boundary: no voice or final 20-second composition was generated.

See `agent-runs/lego-origin-proof/` for the inputs, scene contract, images, attempt history, and quality report.

## David's Cookies stopped attempt

- Input: a selected blueberry-pie product from a real saved site-research run.
- Result: stopped before selection or image generation.
- Reason: the proposed directions relied on unsupported product claims because the available evidence did not specifically support the chosen product.
- Lesson: product-led stories must validate that their evidence belongs to the selected product before approving a direction.

See `agent-runs/davids-blueberry-pie-proof/` for the research, proposed directions, and stopped state.
