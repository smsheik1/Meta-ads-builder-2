# tvg
Decoder for the toon boom harmony drawing format.
The tvg format is unfortunately not documented, so this is the result of a whole lot of guessing from looking at the files in rehex and the tvg2xml output.

Can currently decode:

- Misc. file metadata
- Color palettes:
    - RGBA colors
- Layer data:
    - Shape colors
    - Fill shapes (shapes created using the brush tool or the fill bucket)
    - Stroke center lines
    - Some stroke thickness data

## harmony-scene
Reads the xstage scene format used by Harmony 21 plus the Harmony 22 fields
required by the tested Shaz puppet (`imageProcessingFormat`, held exposures,
and extra metadata on unsupported deformation modules).
This is mostly just to read the palette and find the locations of tvg files at the moment.
