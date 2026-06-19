import type { FormatEditorSchema } from "../types";

export const brainrotEditorSchema: FormatEditorSchema = {
  text: [
    { id: "headline", label: "Hook", kind: "text" },
    { id: "subheadline", label: "Angle", kind: "textarea" },
    { id: "ctaText", label: "CTA", kind: "text" },
  ],
  style: [],
  format: [
    { id: "audio", label: "Voices", kind: "audio" },
  ],
};
