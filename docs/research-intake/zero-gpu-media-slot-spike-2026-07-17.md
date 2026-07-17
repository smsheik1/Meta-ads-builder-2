# Zero-GPU Media-Slot Spike

- Date: 2026-07-17
- Branch: `codex/maker-zero-gpu-spike`
- Reference: saved Breaking News ad (`IMG_1499.PNG`)
- Goal: learn whether the Maker MVP needs RevealLayer merely to replace or move the circular news-subject image

## What ran

The comparison script is `v3/scripts/maker-zero-gpu-slot-spike.py`. It uses only local Pillow and OpenCV operations. It makes no network request and calls no model.

1. Load the normalized saved reference.
2. Reuse the saved subject alpha only to identify the original circle during the comparison.
3. Crop a regular rectangular story-setting slot and circular subject slot directly from the reference.
4. Put a David's Cookies product image inside the same circular frame.
5. Try moving that frame after covering its old position with a sampled color plane.
6. Try moving it after CPU-only OpenCV Telea inpainting.
7. Save every result and a labeled comparison board to the requested output directory.

The branch keeps the comparison board and browser before/after screenshots. The script regenerates the larger raw experiment files when needed.

## Result

| Treatment | Result | Decision |
|---|---|---|
| Replace inside the original circle | Clean; the replacement completely covers Zuckerberg | **Pass for MVP** |
| Move and cover with sampled color | Obvious round patch; not sendable | Fail |
| Move and repair with OpenCV Telea | Large smear; not sendable | Fail |

The MVP does not need RevealLayer for a regular image frame. It should replace that frame in place. The same rule applies to rectangular product photos and other fixed-shape media slots.

## Builder proof

The saved `hybrid-news` fixture now reconstructs from:

- the flattened reference as the locked base;
- a deterministic crop for the rectangular story-setting slot;
- a deterministic crop clipped by the existing circular image layer for the news-subject slot;
- the existing `AdRenderSurface` path for every pixel.

This removes RevealLayer from this saved fixture. Uploading a replacement image keeps the original circle's position, size, and crop.

The flow was also tested through the real `/builder` screen with Playwright:

1. Open `/builder?analysisFixture=hybrid-news`.
2. Upload the saved Breaking News reference.
3. Click **Build draft** and wait for the editable scene.
4. Select **News subject inset** in the visible Layers list.
5. Click **Upload image** and choose the David's Cookies product image.
6. Confirm that the replacement fills the existing circle without revealing Zuckerberg underneath.

Browser evidence:

- `artifacts/maker-zero-gpu-slot-spike/browser-reconstructed.png`
- `artifacts/maker-zero-gpu-slot-spike/browser-replaced-in-place.png`

The browser console contained no product errors after the replacement.

## Known limit

Moving the circular slot away from its original position is not approved by this spike. Both cheap background repairs look visibly bad on this reference. The Maker can still replace the subject in place, or replace the entire story-setting image and then move the subject over that new setting. A later advanced repair action should be considered only if real Maker use shows that moving a subject over the untouched source background is a frequent blocker.

## Reproduce the comparison

From the repository root:

```bash
python3 v3/scripts/maker-zero-gpu-slot-spike.py \
  --reference v3/public/maker-fixtures/hybrid-news/reference.png \
  --subject-alpha v3/public/maker-fixtures/hybrid-news/zuckerberg-inset.png \
  --replacement v3/public/maker-fixtures/hybrid-news/davids-product-inset.png \
  --output-dir artifacts/maker-zero-gpu-slot-spike
```

## Cost

- Rented GPU: `$0`
- Hosted model calls: `0`
- Image-generation calls: `0`
- Runtime work: local crop, mask, compositing, and CPU inpainting only
