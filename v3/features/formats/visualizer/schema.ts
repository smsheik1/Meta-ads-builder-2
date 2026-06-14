import { visualizerSceneVariants } from "../../scene/visualizerVariants";

const visualizerPreviewPlatformOptions = [
  { label: "FB Feed", value: "facebook-feed" },
  { label: "IG Feed", value: "instagram-feed" },
  { label: "Reels", value: "reels" },
  { label: "Stories", value: "stories" },
  { label: "YouTube", value: "youtube" },
];

export const visualizerEditorSchema = {
  text: [
    { id: "headline", label: "Headline", kind: "textarea" },
    { id: "subheadline", label: "Subheadline", kind: "textarea" },
    { id: "ctaText", label: "CTA", kind: "text" },
  ],
  style: [
    { id: "backgroundColor", label: "Background", kind: "color" },
    { id: "textColor", label: "Text", kind: "color" },
    { id: "accentColor", label: "Accent", kind: "color" },
    { id: "visualizerColor", label: "Visualizer", kind: "color" },
  ],
  format: [
    { id: "previewPlatform", label: "Preview", kind: "select", options: visualizerPreviewPlatformOptions },
    {
      id: "visualizerPreset",
      label: "Visualizer style",
      kind: "preset",
      options: visualizerSceneVariants.map((variant) => ({
        label: variant.id
          .replace(/^legacy-/, "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        value: variant.id,
      })),
    },
    { id: "audio", label: "Audio", kind: "audio" },
    { id: "captions", label: "Captions", kind: "captions" },
  ],
} as const;
