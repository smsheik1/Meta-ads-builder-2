import { createMakerDraftFromAnalysis, type PaddleOcrResult } from "./referenceAnalysis";
import type { MakerAnalysis } from "./model";

// Saved from the successful 2026-07-12 Gemma 4 31B OpenRouter/DeepInfra run so
// browser QA never spends another provider call.
export const savedCodexReferenceAnalysis: MakerAnalysis = {
  formula: {
    name: "Active relationship",
    premise: "Codex integrates with your favorite productivity tools.",
    visual_mechanic: "A central brand name connected via a handshake emoji to a vertical list of integrated software names.",
    adaptation_rule: "The list of tools can be swapped based on the target audience's tech stack.",
  },
  fields: [
    { id: "field_brand", value: "Codex", evidence_ids: ["text_05"], binding: "brand" },
    { id: "field_cta", value: "Work with Codex", evidence_ids: ["text_09"], binding: "campaign" },
  ],
  lists: [{
    id: "list_integrations",
    binding: "fixed",
    items: [
      ["item_1", "GitHub", "text_01"],
      ["item_2", "Sheets", "text_02"],
      ["item_3", "Asana", "text_03"],
      ["item_4", "Docs", "text_04"],
      ["item_5", "Slack", "text_06"],
      ["item_6", "Gmail", "text_07"],
      ["item_7", "Slides", "text_08"],
    ].map(([id, value, evidenceId]) => ({
      id: id!,
      values: [{ key: "app_name", value: value!, evidence_ids: [evidenceId!] }],
      asset_ids: [],
    })),
    active_item_id: "item_5",
  }],
  assets: [
    { id: "asset_logo", label: "Codex Logo", role: "brand_identity", evidence_ids: [], binding: "brand", sam_prompt: "minimalist spiral logo" },
    { id: "asset_handshake", label: "Handshake Emoji", role: "decorative", evidence_ids: [], binding: "fixed", sam_prompt: "handshake emoji" },
  ],
  reroll_groups: [
    { id: "group_brand", members: ["field_brand", "asset_logo"], instruction: "Update brand identity" },
    { id: "group_integrations", members: ["list_integrations"], instruction: "Change the set of integrated tools" },
    { id: "group_cta", members: ["field_cta"], instruction: "Modify the call to action" },
  ],
  maker_questions: [],
};

export const savedCodexOcr: PaddleOcrResult = {
  width: 1080,
  height: 1080,
  texts: [
    { id: "text_01", text: "GitHuu", confidence: 0.8782, polygon: [[517, 17], [891, 0], [907, 75], [533, 129]], textColor: "#aaaaaa" },
    { id: "text_02", text: "Sheets", confidence: 0.9866, polygon: [[558, 140], [906, 81], [922, 179], [575, 238]], textColor: "#a7a7a7" },
    { id: "text_03", text: "Asana", confidence: 0.9999, polygon: [[608, 253], [926, 215], [938, 315], [620, 353]], textColor: "#a7a7a7" },
    { id: "text_04", text: "Docs", confidence: 0.9982, polygon: [[685, 366], [946, 353], [952, 455], [691, 468]], textColor: "#a7a7a7" },
    { id: "text_05", text: "Codex", confidence: 0.9998, polygon: [[125, 485], [467, 489], [466, 598], [123, 594]], textColor: "#010101" },
    { id: "text_06", text: "Slack", confidence: 0.9985, polygon: [[662, 487], [949, 487], [949, 592], [662, 592]], textColor: "#010101" },
    { id: "text_07", text: "Gmail", confidence: 0.9978, polygon: [[656, 614], [954, 624], [950, 728], [652, 717]], textColor: "#aeaeae" },
    { id: "text_08", text: "Slides", confidence: 0.9383, polygon: [[646, 736], [950, 764], [941, 867], [637, 839]], textColor: "#e6e6e6" },
    { id: "text_09", text: "Work with Codex", confidence: 0.9964, polygon: [[226, 897], [682, 899], [682, 955], [226, 953]], textColor: "#030303" },
  ],
};

const savedBackground = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
    <rect width="1080" height="1080" fill="white"/>
    <text x="500" y="590" font-size="82">🤝</text>
    <circle cx="155" cy="930" r="38" fill="none" stroke="#050505" stroke-width="9"/>
    <circle cx="155" cy="930" r="13" fill="#050505"/>
  </svg>
`)}`;

export function createSavedReferenceDraftFixture({
  fileName,
  id,
  imageUrl,
  now = Date.now(),
}: {
  fileName: string;
  id: string;
  imageUrl: string;
  now?: number;
}) {
  return createMakerDraftFromAnalysis({
    id,
    fileName,
    now,
    analysis: savedCodexReferenceAnalysis,
    artifacts: {
      referenceImageUrl: imageUrl,
      backgroundImageUrl: savedBackground,
      ocr: savedCodexOcr,
      refinedAssets: [],
    },
  });
}
