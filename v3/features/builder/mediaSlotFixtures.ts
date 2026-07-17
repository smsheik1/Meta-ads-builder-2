import { createMakerDraftFromAnalysis, type PaddleOcrResult } from "./referenceAnalysis";
import type { MakerAnalysis } from "./model";

type MediaSlotFixtureId = "rectangle" | "multiple";

const fixtures = {
  rectangle: {
    title: "Street Poster",
    premise: "Put a complete ad inside a real-world poster frame.",
    mechanic: "One tall rectangular poster sits inside a bus shelter photograph.",
    reference: "/maker-fixtures/media-slots/rectangle-reference.jpg",
    width: 1243,
    height: 1536,
    frames: [
      { id: "poster", label: "Poster artwork", x: 443, y: 518, width: 465, height: 731, src: "/maker-fixtures/media-slots/rectangle-slot.jpg" },
    ],
  },
  multiple: {
    title: "Four-Step Reaction",
    premise: "Build a joke by making four reaction images grow more intense.",
    mechanic: "Four rectangular reaction images stack beside four lines of copy.",
    reference: "/maker-fixtures/media-slots/multiple-reference.jpg",
    width: 963,
    height: 1350,
    frames: [
      { id: "reaction_1", label: "Reaction image 1", x: 475, y: 0, width: 488, height: 336, src: "/maker-fixtures/media-slots/multiple-slot-1.jpg" },
      { id: "reaction_2", label: "Reaction image 2", x: 475, y: 341, width: 488, height: 336, src: "/maker-fixtures/media-slots/multiple-slot-2.jpg" },
      { id: "reaction_3", label: "Reaction image 3", x: 475, y: 683, width: 488, height: 305, src: "/maker-fixtures/media-slots/multiple-slot-3.jpg" },
      { id: "reaction_4", label: "Reaction image 4", x: 475, y: 1001, width: 488, height: 349, src: "/maker-fixtures/media-slots/multiple-slot-4.jpg" },
    ],
  },
} as const;

export function createMediaSlotDraftFixture({
  fixtureId,
  fileName,
  id,
  now = Date.now(),
}: {
  fixtureId: MediaSlotFixtureId;
  fileName: string;
  id: string;
  now?: number;
}) {
  const fixture = fixtures[fixtureId];
  const ocr: PaddleOcrResult = { width: fixture.width, height: fixture.height, texts: [] };
  const analysis: MakerAnalysis = {
    formula: {
      name: fixture.title,
      premise: fixture.premise,
      visual_mechanic: fixture.mechanic,
      adaptation_rule: "Replace every framed image while keeping each frame in the same place.",
    },
    fields: [],
    lists: [],
    assets: fixture.frames.map((frame) => ({
      id: frame.id,
      label: frame.label,
      role: "supporting_visual" as const,
      evidence_ids: [],
      binding: "campaign" as const,
      sam_prompt: frame.label.toLowerCase(),
      frame: { shape: "rectangle" as const, x: frame.x, y: frame.y, width: frame.width, height: frame.height },
    })),
    reroll_groups: [{
      id: "framed_images",
      members: fixture.frames.map((frame) => frame.id),
      instruction: "Replace the framed images together so they tell one clear story.",
    }],
    maker_questions: [],
  };

  return createMakerDraftFromAnalysis({
    id,
    fileName,
    now,
    analysis,
    artifacts: {
      referenceImageUrl: fixture.reference,
      backgroundImageUrl: fixture.reference,
      ocr,
      refinedAssets: fixture.frames.map((frame) => ({
        assetId: frame.id,
        imageUrl: frame.src,
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
      })),
    },
  });
}
