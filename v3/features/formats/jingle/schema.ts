import type { FormatEditorSchema } from "../types";

export const jingleEditorSchema: FormatEditorSchema = {
  text: [
    { id: "headline", label: "Hook", kind: "text" },
    { id: "subheadline", label: "Angle", kind: "textarea" },
    { id: "ctaText", label: "CTA", kind: "text" },
  ],
  style: [
    { id: "backgroundColor", label: "Background", kind: "color" },
    { id: "textColor", label: "Text", kind: "color" },
    { id: "accentColor", label: "Pulse", kind: "color" },
  ],
  format: [
    { id: "audio", label: "Music", kind: "audio" },
    { id: "captions", label: "Lyrics", kind: "captions" },
  ],
};
