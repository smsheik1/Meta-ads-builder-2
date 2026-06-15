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
        maxWords: 7,
        maxLines: 4,
        fontSize: 52,
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
        maxWords: 7,
        maxLines: 4,
        fontSize: 52,
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
    id: "two_buttons",
    name: "Two Buttons",
    image: "/memes/two_buttons.png",
    width: 600,
    height: 908,
    slots: [
      {
        id: "leftButton",
        label: "Option 1",
        x: 86,
        y: 92,
        width: 160,
        height: 150,
        maxChars: 34,
        maxWords: 4,
        maxLines: 3,
        fontSize: 22,
        textCase: "uppercase",
        align: "center",
      },
      {
        id: "rightButton",
        label: "Option 2",
        x: 275,
        y: 72,
        width: 150,
        height: 145,
        maxChars: 34,
        maxWords: 4,
        maxLines: 3,
        fontSize: 22,
        textCase: "uppercase",
        align: "center",
      },
      {
        id: "captionText",
        label: "Sweating decision",
        x: 88,
        y: 510,
        width: 420,
        height: 250,
        maxChars: 70,
        maxWords: 9,
        maxLines: 4,
        fontSize: 34,
        textCase: "mixed",
        align: "center",
      },
    ],
    semantics: {
      situations: "A buyer is stuck between two painful options until the brand reframes the choice.",
      tone: "anxious, funny, relatable",
      textPatterns: "Buttons are competing choices. Caption names the buyer sweating over the decision.",
    },
    directorsNotes: "The joke is the tension. Do not make both buttons positive. One should expose the awkward tradeoff.",
  },
  {
    id: "this_is_fine",
    name: "This Is Fine",
    image: "/memes/this_is_fine.png",
    width: 580,
    height: 282,
    slots: [
      {
        id: "captionText",
        label: "The fire",
        x: 18,
        y: 18,
        width: 250,
        height: 86,
        maxChars: 58,
        maxWords: 8,
        maxLines: 3,
        fontSize: 24,
        textCase: "mixed",
        align: "center",
      },
    ],
    semantics: {
      situations: "A buyer is pretending a real problem is under control.",
      tone: "dry, painfully honest, deadpan",
      textPatterns: "Caption names the specific fire the buyer is ignoring.",
    },
    directorsNotes: "Never write 'this is fine.' The image already says that. Name the actual problem burning around them.",
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
        maxChars: 38,
        maxWords: 5,
        maxLines: 4,
        fontSize: 34,
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
        maxChars: 38,
        maxWords: 5,
        maxLines: 4,
        fontSize: 34,
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
        maxChars: 38,
        maxWords: 5,
        maxLines: 4,
        fontSize: 34,
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
        maxChars: 38,
        maxWords: 5,
        maxLines: 4,
        fontSize: 34,
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
