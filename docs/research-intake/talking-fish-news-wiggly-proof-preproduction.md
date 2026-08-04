# Talking Fish News: Mars Proof Pre-Production

## Scope

Build one original 14-20 second vertical news report. This is a proof of the
format, not a `/create` integration, Discover entry, or portable kit.

## Selected Story

NASA announced on July 29, 2026 that Curiosity found the largest field of
honeycomb-shaped Martian polygons seen by the mission so far. The terrain
stretches across Valle Grande, and each polygon measures about 1.5 to 3 inches
across.

Primary source:

- [NASA: Curiosity Mars Rover Discovers Field of Honeycomb Textures](https://www.nasa.gov/missions/mars-science-laboratory/curiosity-rover/nasas-curiosity-mars-rover-discovers-field-of-honeycomb-textures/)

## Evidence Inventory

| Evidence | Local asset | Why it reads at phone size |
| --- | --- | --- |
| Valle Grande panorama | `mars-polygons-panorama.jpg` | Establishes the scale of the field. |
| Polygon close-up | `mars-polygons-closeup.png` | Makes the honeycomb texture unmistakable. |
| Miraflores butte | `mars-miraflores-butte.png` | Gives the report a distinct final visual. |

All three images come from NASA/JPL-Caltech/MSSS. No image-generation call was
used.

## Script

**Final voice duration: 18.504 seconds.**

1. `Breaking news. From Mars, Curiosity just found a sea of tiny honeycomb shapes stretching across an entire valley.`
2. `Each polygon is only a few inches wide.`
3. `Some may be ancient mud cracks. Others could have formed when buried water squeezed through the soil.`
4. `Scientists are testing the chemistry now. Mars has officially entered its floor-tile era.`

## Fixed Format Rules

- Evidence fills the upper half of the vertical frame.
- The supplied suited fish anchor fills the lower half behind a plain desk.
- Talking uses exactly two aligned fixed sprites: one open mouth and one closed mouth.
- The renderer swaps the two sprites during narration; it does not generate lip sync or morph the character.
- White captions with a coral outline sit directly over the anchor.
- No station header, generic report pill, or dark lower-third box.
- Narration uses Fish Audio voice `105a95c3aa3d4301b175ca1f7b3996ca` on `s2.1-pro-free`.
- No image-generation or video-generation call.

The two proof-only anchor poses were extracted from the public
[CreatorSet green-screen preview](https://shop.creatorset.com/products/spongebob-realistic-fish-head-green-screen),
whose listing limits the download to personal use. They are not cleared as a
commercial asset for a public Format kit.

## Local Proof Gate

Build the MP4 locally through the existing `AdRenderSurface` and Remotion path.
The proof must remain 1080x1920, 14-20 seconds, and contain exactly one audio
stream.
