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

`scene_runtime_manifest.py` is the lossless runtime boundary for modules the
typed Rust reader does not execute yet. It preserves every nested node, link,
port, drawing exposure, animation column, and attribute column reference. The
finished Harmony preview frames are deliberately not inputs to that manifest.
