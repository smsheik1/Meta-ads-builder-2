export const wereSorryEditorSchema = {
  text: [
    { id: "headline", label: "Statement title", kind: "textarea" },
    { id: "subheadline", label: "Legal opener", kind: "textarea" },
    { id: "ctaText", label: "CTA", kind: "text" },
  ],
  style: [
    { id: "backgroundColor", label: "Background", kind: "color" },
    { id: "accentColor", label: "Accent", kind: "color" },
  ],
  format: [],
} as const;
