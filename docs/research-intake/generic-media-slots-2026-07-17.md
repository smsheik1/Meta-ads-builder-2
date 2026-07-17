# Generic fixed media slots

## What changed

When Maker analysis finds a complete circle or rectangle, it can mark that area as a fixed media slot. Wiggly crops the original pixels locally, keeps the slot in the same position, and lets the Maker replace its image.

This path does not call SAM 3, RevealLayer, Replicate, or a rented GPU. Freeform objects still use the existing refinement path.

## MVP rule

- Use a fixed slot only when the whole circle or rectangle is clearly visible.
- Keep its position, size, and shape fixed so the original flattened image stays covered.
- Let the Maker replace the image and change its semantic binding.
- If the boundary is unclear, do not guess; leave the asset on the existing refinement path.

## Browser checks

All checks used the real `/builder` screen through Playwright and the existing `AdRenderSurface`.

| Reference | Check | Result |
| --- | --- | --- |
| Breaking-news ad | Replace one circular subject inset | Pass |
| Bus-shelter poster | Replace one tall rectangular poster | Pass |
| Four-step reaction meme | Replace two of four rectangular slots independently | Pass |

Screenshots:

- `output/playwright/generic-slot-circle.png`
- `output/playwright/generic-slot-rectangle.png`
- `output/playwright/generic-slot-multiple.png`

## Known boundary

Fixed slots are intentionally not draggable or resizable in this MVP. Moving one would expose the old image in the flattened background. Supporting free movement requires background repair and remains a separate, larger feature.
