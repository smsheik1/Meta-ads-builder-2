export const wereSorryEditorSchema = {
  text: [
    { id: "headline", label: "Apology", kind: "textarea" },
    { id: "subheadline", label: "Make-good line", kind: "textarea" },
    { id: "ctaText", label: "CTA", kind: "text" },
  ],
  style: [
    { id: "backgroundColor", label: "Background", kind: "color" },
    { id: "accentColor", label: "Accent", kind: "color" },
  ],
  format: [],
} as const;
