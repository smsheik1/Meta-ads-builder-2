import type { DiscoveryEntry } from "./types";

type DatabaseFormatSlug =
  | "brainrot"
  | "meme"
  | "motion-story"
  | "reviews"
  | "text-message"
  | "visualizer"
  | "were-sorry";

type DatabaseFormatRow = readonly [
  sceneId: string,
  format: DatabaseFormatSlug,
  brand: string,
  title: string,
  goal: DiscoveryEntry["goal"],
  mediaKind: DiscoveryEntry["media"]["kind"],
  durationLabel: string,
  order: number,
];

const formatDefinitions: Record<DatabaseFormatSlug, {
  name: string;
  note: string;
}> = {
  brainrot: {
    name: "Minecraft Brainrot",
    note: "A buyer truth becomes a fast character exchange over familiar gameplay.",
  },
  meme: {
    name: "Meme",
    note: "A real brand tension lands inside a visual pattern people recognize instantly.",
  },
  "motion-story": {
    name: "Motion Story",
    note: "Product, proof, and CTA move through one compact performance-ad story.",
  },
  reviews: {
    name: "Reviews",
    note: "A real customer quote becomes the ad instead of supporting copy.",
  },
  "text-message": {
    name: "iMessage Ad",
    note: "The product enters a familiar conversation at the moment it becomes useful.",
  },
  visualizer: {
    name: "Audio Visualizer",
    note: "A voice-led pitch becomes a branded, captioned visual people can watch or hear.",
  },
  "were-sorry": {
    name: "We're Sorry",
    note: "An official apology format flips product proof into a confident punchline.",
  },
};

const databaseFormatRows: DatabaseFormatRow[] = [
  ["j570dgv9b5m38fggrz5xpezn8d89j7bc", "visualizer", "David's Cookies", "Forgot the birthday? Cookies still ship.", "sell", "video", "27 sec", 4.5],
  ["j57fa2r71czda26mvjkfwz59gn89nx2g", "brainrot", "David's Cookies", "You brought paper plates to Jenn's birthday again", "entertain", "video", "21 sec", 7.5],
  ["j57c7ehtw4hspa5d5teh9d5ay989j8kf", "motion-story", "David's Cookies", "First tin is a test. Second tin is trust.", "sell", "video", "20 sec", 10.5],
  ["j57a69mzgpf7agqa2we3aek1d189jqtb", "were-sorry", "Agent Enamel", "A formal statement from Agent Enamel", "sell", "image", "Static", 12.5],
  ["j57cr2xv8py1b30waepejjm5wh8axj7d", "text-message", "David's Cookies", "The dinner-party cheesecake save", "sell", "image", "Static", 13.5],
  ["j57emmcyegr9kzephvj2kv5hyd8axwdb", "reviews", "David's Cookies", "The sampler review says it all", "sell", "image", "Static", 14.5],
  ["j574rw8c8h7rwezy6062m5ga1d89jz55", "meme", "Agent Enamel", "Hiring more front desk staff", "entertain", "image", "Static", 15.5],
  ["j57fwgx42dgwxnjncd8kw7dzzs8avykj", "were-sorry", "LEGO", "A statement from LEGO", "entertain", "image", "Static", 120],
  ["j57253mdxgv4qbqcj8kntrv64s89j4ay", "text-message", "OGTool", "SEO agency, month four: nothing", "sell", "image", "Static", 121],
  ["j57bv2qcgdz6mnhty3rzpvdfmx89n5np", "text-message", "Plato Group AI", "The six-month vendor timeline", "sell", "image", "Static", 122],
  ["j57at2t8b0sxw2147g751jgp7h8at9sc", "text-message", "LEGO", "Build the moment after the final", "sell", "image", "Static", 123],
  ["j57792h0nbhsnghkvze9s2zv7189j5z1", "text-message", "Agent Enamel", "The old answering service", "sell", "image", "Static", 124],
  ["j575fj5a8aw1h3ttbdaxmh082s8ax3f1", "reviews", "David's Cookies", "The freshest cookies she has ever had", "sell", "image", "Static", 125],
  ["j571rh5xgv46nnwq4sgx2z96f98ax5b5", "reviews", "David's Cookies", "The meltaways were delicious", "sell", "image", "Static", 126],
  ["j579knqrv7fzm2zchbmkdkr98s8axd1x", "reviews", "David's Cookies", "Melt-in-your-mouth proof", "sell", "image", "Static", 127],
  ["j57aqvpgb9qbdvg2n36pac3rm18axnm3", "meme", "David's Cookies", "Buying a few cookies", "entertain", "image", "Static", 128],
  ["j57232yv1p7chd21s82q82vjw58appq1", "meme", "Grüns", "Hiding pills in food", "entertain", "image", "Static", 129],
  ["j5788szxq9dhha0qcgg3ecn6e189z987", "meme", "OGTool", "Trust the agency vibes", "entertain", "image", "Static", 130],
  ["j570n8pp525w048vrt0nes902s8atdk4", "meme", "LEGO", "Buying regular static toys", "entertain", "image", "Static", 131],
  ["j579vcsvwcx9pt1j2xvsfg9r0x89njrr", "meme", "Plato Group AI", "Catch errors after they happen", "entertain", "image", "Static", 132],
];

export const databaseFormatDiscoveryEntries: DiscoveryEntry[] = databaseFormatRows.map((
  [sceneId, format, brand, title, goal, mediaKind, durationLabel, order],
) => {
  const mediaBase = `/discovery/db-formats/${format}/${sceneId}`;
  const definition = formatDefinitions[format];

  return {
    id: `scene-${sceneId}`,
    status: "published",
    showInDiscovery: ["meme", "reviews", "were-sorry"].includes(format) ? false : undefined,
    order,
    brand,
    title,
    curatorNote: definition.note,
    goal,
    media: {
      kind: mediaKind,
      src: `${mediaBase}.${mediaKind === "video" ? "mp4" : "jpg"}`,
      poster: mediaKind === "video" ? `${mediaBase}.jpg` : undefined,
      durationLabel,
    },
    format: {
      slug: format,
      name: definition.name,
      version: "1.0.0",
      owner: "Wiggly Studio",
    },
  };
});
