import type { StaticAdLayer, StaticShapeLayer, StaticTextLayer } from "../scene/types";
import { createMakerDraftFromAnalysis, type PaddleOcrResult } from "./referenceAnalysis";
import type { MakerAnalysis } from "./model";

const evidence = (
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  textColor: string,
) => ({
  id,
  text,
  confidence: 0.99,
  polygon: [[x, y], [x + width, y], [x + width, y + height], [x, y + height]] as Array<[number, number]>,
  textColor,
});

const ocr: PaddleOcrResult = {
  width: 464,
  height: 1024,
  texts: [
    evidence("text_01", "kingkong.com.au", 58, 67, 230, 34, "#ffffff"),
    evidence("text_02", "BREAKING NEWS", 8, 514, 146, 22, "#ffffff"),
    evidence("text_03", "NEWLY LEAKED META ADS ‘CHEAT CODES’ REVEAL HOW TO GET 5–11 ROAS", 9, 546, 404, 126, "#050505"),
    evidence("text_04", "NEW FREE REPORT REVEALS HOW TO UNLOCK WILD SCALE WITH ADS", 9, 682, 405, 26, "#ffffff"),
    evidence("text_05", "Check out our site 👉", 80, 822, 304, 48, "#111111"),
  ],
};

const analysis: MakerAnalysis = {
  formula: {
    premise: "Make a brand update feel like urgent, credible breaking news.",
    visual_mechanic: "A story setting and circular subject inset sit above a breaking-news label, large headline, proof line, and CTA inside locked social chrome.",
    adaptation_rule: "Replace the publisher, story setting, subject, headline, proof line, and CTA together while keeping the news hierarchy intact.",
  },
  fields: [
    { id: "company_name", value: "kingkong.com.au", evidence_ids: ["text_01"], binding: "brand" },
    { id: "breaking_label", value: "BREAKING NEWS", evidence_ids: ["text_02"], binding: "fixed" },
    { id: "headline", value: "NEWLY LEAKED META ADS ‘CHEAT CODES’ REVEAL HOW TO GET 5–11 ROAS", evidence_ids: ["text_03"], binding: "campaign" },
    { id: "subheadline", value: "NEW FREE REPORT REVEALS HOW TO UNLOCK WILD SCALE WITH ADS", evidence_ids: ["text_04"], binding: "proof" },
    { id: "cta", value: "Check out our site 👉", evidence_ids: ["text_05"], binding: "campaign" },
  ],
  lists: [],
  assets: [
    { id: "publisher_logo", label: "Publisher logo", role: "brand_identity", evidence_ids: [], binding: "brand", sam_prompt: "publisher logo" },
    { id: "story_setting", label: "Story setting", role: "story_setting", evidence_ids: [], binding: "campaign", sam_prompt: "Meta office building" },
    { id: "news_subject", label: "News subject inset", role: "news_subject", evidence_ids: [], binding: "campaign", sam_prompt: "Mark Zuckerberg portrait" },
  ],
  reroll_groups: [
    { id: "publisher_identity", members: ["company_name", "publisher_logo"], instruction: "Replace the publisher name and logo together." },
    { id: "breaking_story", members: ["headline", "subheadline", "cta", "story_setting", "news_subject"], instruction: "Make the setting, subject, headline, proof line, and CTA tell one believable news story." },
  ],
  maker_questions: [],
};

const plate = (
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  zIndex: number,
  borderRadius = 0,
): StaticShapeLayer => ({
  id,
  type: "shape",
  name,
  shape: "rectangle",
  fill,
  borderColor: fill,
  borderWidth: 0,
  borderRadius,
  x,
  y,
  width,
  height,
  rotation: 0,
  visible: true,
  locked: true,
  opacity: 1,
  zIndex,
  binding: "locked",
  semanticRole: "reference:plate",
});

const tuneText = (layer: StaticTextLayer): StaticTextLayer => {
  const styles: Record<string, Partial<StaticTextLayer>> = {
    "field-company_name": { x: 58, y: 67, width: 230, height: 34, color: "#ffffff", fontSize: 20, fontWeight: 800, lineHeight: 1, zIndex: 40 },
    "field-breaking_label": { x: 7, y: 514, width: 147, height: 22, color: "#ffffff", fontSize: 15, fontWeight: 800, lineHeight: 1, textAlign: "center", zIndex: 40 },
    "field-headline": { x: 9, y: 545, width: 404, height: 128, color: "#050505", fontFamily: "Impact, Arial Narrow, sans-serif", fontSize: 29, fontWeight: 900, lineHeight: 0.96, zIndex: 40 },
    "field-subheadline": { x: 9, y: 682, width: 405, height: 26, color: "#ffffff", fontFamily: "Arial Narrow, Arial, sans-serif", fontSize: 8, fontWeight: 800, lineHeight: 1, zIndex: 40 },
    "field-cta": { x: 80, y: 822, width: 304, height: 48, color: "#111111", fontSize: 22, fontWeight: 500, lineHeight: 1, textAlign: "center", zIndex: 40 },
  };
  return { ...layer, ...styles[layer.id] };
};

export function createHybridNewsDraftFixture({
  id,
  fileName,
  imageUrl,
  now = Date.now(),
}: {
  id: string;
  fileName: string;
  imageUrl: string;
  now?: number;
}) {
  const draft = createMakerDraftFromAnalysis({
    id,
    fileName,
    analysis,
    now,
    artifacts: {
      referenceImageUrl: imageUrl,
      backgroundImageUrl: "/maker-fixtures/hybrid-news/repaired-background.png",
      ocr,
      refinedAssets: [
        { assetId: "publisher_logo", imageUrl: "/maker-fixtures/hybrid-news/kingkong-avatar.svg", x: 16, y: 67, width: 36, height: 36 },
        { assetId: "story_setting", imageUrl: "/maker-fixtures/hybrid-news/meta-story-setting.png", x: 0, y: 112, width: 464, height: 428 },
        { assetId: "news_subject", imageUrl: "/maker-fixtures/hybrid-news/zuckerberg-inset.png", x: 255, y: 235, width: 209, height: 216 },
      ],
    },
  });

  const tunedLayers = draft.scene.layout.layers.map((layer): StaticAdLayer => {
    if (layer.type === "text") return tuneText(layer);
    if (layer.type === "image" && layer.semanticRole === "asset:publisher_logo") return { ...layer, objectFit: "contain", zIndex: 40 };
    if (layer.type === "image" && layer.semanticRole === "asset:story_setting") return { ...layer, objectFit: "cover", zIndex: 5 };
    if (layer.type === "image" && layer.semanticRole === "asset:news_subject") return { ...layer, objectFit: "cover", borderRadius: layer.width / 2, zIndex: 30 };
    return layer;
  });

  draft.title = "Breaking news story";
  draft.scene.layout.layers = [
    ...tunedLayers,
    plate("publisher-plate", "Publisher plate", 8, 58, 292, 49, "#59639e", 10),
    plate("breaking-plate", "Breaking label plate", 0, 511, 160, 29, "#f40d13", 20),
    plate("headline-plate", "Headline plate", 0, 540, 416, 140, "#ffffff", 20),
    plate("subheadline-plate", "Subheadline plate", 0, 680, 416, 35, "#164bbd", 20),
    plate("cta-plate", "CTA plate", 56, 818, 354, 57, "#ffffff", 20, 18),
  ];
  return draft;
}
