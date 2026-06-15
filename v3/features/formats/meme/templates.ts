export type MemeTextCase = "uppercase" | "mixed";

export type MemeSlot = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  maxChars: number;
  maxWords: number;
  maxLines: number;
  fontSize: number;
  textCase: MemeTextCase;
  align?: "left" | "center";
  textStyle?: "classic" | "poster";
};

export type MemeTemplate = {
  id: string;
  name: string;
  image: string;
  width: number;
  height: number;
  slots: readonly MemeSlot[];
  semantics: {
    situations: string;
    tone: string;
    textPatterns: string;
  };
  directorsNotes: string;
};

export const MEME_TEMPLATES = [
  {
    id: "drake",
    name: "Drake",
    image: "/memes/drake.png",
    width: 1200,
    height: 1200,
    slots: [
      {
        id: "topText",
        label: "Rejected option",
        x: 642,
        y: 70,
        width: 500,
        height: 500,
        maxChars: 54,
        maxWords: 6,
        maxLines: 3,
        fontSize: 92,
        textCase: "uppercase",
        align: "center",
      },
      {
        id: "bottomText",
        label: "Preferred option",
        x: 642,
        y: 670,
        width: 500,
        height: 450,
        maxChars: 54,
        maxWords: 6,
        maxLines: 3,
        fontSize: 92,
        textCase: "uppercase",
        align: "center",
      },
    ],
    semantics: {
      situations: "A buyer rejects the old annoying way and chooses the brand's better way.",
      tone: "clear contrast, slightly smug, instantly readable",
      textPatterns: "Top slot is the painful old behavior. Bottom slot is the brand-native better choice. Both should be parallel, short phrases.",
    },
    directorsNotes: "Make the bottom choice feel obviously smarter. Keep both slots short and parallel.",
  },
  {
    id: "woman_yelling_cat",
    name: "Woman Yelling at Cat",
    image: "/memes/woman_yelling_cat.png",
    width: 1200,
    height: 1200,
    slots: [
      {
        id: "yellingText",
        label: "The loud accusation",
        x: 650,
        y: 110,
        width: 500,
        height: 330,
        maxChars: 42,
        maxWords: 6,
        maxLines: 3,
        fontSize: 76,
        textCase: "uppercase",
        align: "center",
        textStyle: "poster",
      },
      {
        id: "catResponseText",
        label: "The calm response",
        x: 650,
        y: 720,
        width: 500,
        height: 310,
        maxChars: 42,
        maxWords: 6,
        maxLines: 3,
        fontSize: 76,
        textCase: "uppercase",
        align: "center",
        textStyle: "poster",
      },
    ],
    semantics: {
      situations: "A loud complaint, misconception, or panic meets the brand's calm obvious answer.",
      tone: "argumentative, deadpan, contrast-driven",
      textPatterns: "Top/right slot is the frantic accusation. Bottom/right slot is the dry, simple response.",
    },
    directorsNotes: "The woman side should sound like the market yelling. The cat side should sound unimpressed and correct.",
  },
  {
    id: "this_is_fine",
    name: "This Is Fine",
    image: "/memes/this_is_fine_full.png",
    width: 1322,
    height: 1322,
    slots: [
      {
        id: "topText",
        label: "The bad thing happening",
        x: 70,
        y: 55,
        width: 1180,
        height: 225,
        maxChars: 74,
        maxWords: 9,
        maxLines: 2,
        fontSize: 78,
        textCase: "mixed",
        align: "center",
        textStyle: "poster",
      },
      {
        id: "bottomText",
        label: "The calm coping line",
        x: 80,
        y: 1075,
        width: 1160,
        height: 180,
        maxChars: 66,
        maxWords: 8,
        maxLines: 2,
        fontSize: 74,
        textCase: "mixed",
        align: "center",
        textStyle: "poster",
      },
    ],
    semantics: {
      situations: "A buyer is pretending a real problem is under control.",
      tone: "dry, painfully honest, deadpan",
      textPatterns: "Top slot names the specific bad thing happening. Bottom slot names the forced calm response.",
    },
    directorsNotes: "Use the top and bottom white space. Do not write the exact baked example; adapt the structure to the buyer's fire.",
  },
  {
    id: "expanding_brain",
    name: "Expanding Brain",
    image: "/memes/expanding_brain.png",
    width: 857,
    height: 1202,
    slots: [
      {
        id: "level1Text",
        label: "Basic thought",
        x: 18,
        y: 34,
        width: 390,
        height: 225,
        maxChars: 34,
        maxWords: 4,
        maxLines: 3,
        fontSize: 54,
        textCase: "mixed",
        align: "center",
      },
      {
        id: "level2Text",
        label: "Better thought",
        x: 18,
        y: 330,
        width: 390,
        height: 225,
        maxChars: 34,
        maxWords: 4,
        maxLines: 3,
        fontSize: 54,
        textCase: "mixed",
        align: "center",
      },
      {
        id: "level3Text",
        label: "Smarter thought",
        x: 18,
        y: 630,
        width: 390,
        height: 225,
        maxChars: 34,
        maxWords: 4,
        maxLines: 3,
        fontSize: 54,
        textCase: "mixed",
        align: "center",
      },
      {
        id: "level4Text",
        label: "Galaxy brain",
        x: 18,
        y: 925,
        width: 390,
        height: 225,
        maxChars: 34,
        maxWords: 4,
        maxLines: 3,
        fontSize: 54,
        textCase: "mixed",
        align: "center",
      },
    ],
    semantics: {
      situations: "Four escalating ways to understand the offer, ending with the funniest or sharpest reframe.",
      tone: "escalating, playful, increasingly absurd",
      textPatterns: "Level 1 is the naive/basic move. Level 2 is a slightly smarter tactic. Level 3 is the specific brand-native insight. Level 4 is the punchline or sharp aha.",
    },
    directorsNotes: "Make level four the punchline. Avoid four generic benefits; it must feel like an escalating ladder with short, distinct phrases.",
  },
] as const satisfies readonly MemeTemplate[];

export type MemeTemplateId = (typeof MEME_TEMPLATES)[number]["id"];

export function getMemeTemplate(templateId: string): MemeTemplate | null {
  return MEME_TEMPLATES.find((template) => template.id === templateId) || null;
}
