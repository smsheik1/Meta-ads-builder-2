import { getJingleStyle, JINGLE_STYLES, type JingleStyleId } from "./prompt";

export const BRAND_JINGLE_DEFAULT_DURATION_SECONDS = 20;
export const BRAND_JINGLE_MIN_DURATION_SECONDS = 10;
export const BRAND_JINGLE_MAX_DURATION_SECONDS = 300;
export const ELEVENLABS_MUSIC_PRICE_PER_MINUTE_USD = 0.15;
export const ELEVENLABS_MUSIC_MODEL_ID = "music_v2";

export type BrandJingleEvidence = {
  text: string;
  sourceUrl: string | null;
};

export type BrandJingleResearch = {
  sourceType: "website" | "brief";
  brandName: string;
  websiteUrl: string | null;
  offer: string;
  audience: string;
  buyerMoments: string[];
  proof: BrandJingleEvidence[];
  siteLanguage: string[];
  visual: {
    logoUrl: string | null;
    colors: string[];
    notes: string[];
  };
};

export type BrandJinglePlan = {
  version: 1;
  angle: string;
  brandPhonetic: string;
  durationSeconds: number;
  genreId: JingleStyleId;
  hook: string;
  verseLines: string[];
  bridgeLines: string[];
  selectedEvidenceIndexes: number[];
};

export type BrandJingleCompositionChunk = {
  text: string;
  duration_ms: number;
  positive_styles: string[];
  negative_styles: string[];
  context_adherence: "high";
};

export type BrandJingleCompositionPlan = {
  chunks: BrandJingleCompositionChunk[];
};

const clean = (value: unknown, maxLength = 400) => String(value ?? "")
  .replace(/[—–]/g, "-")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

const unique = (items: string[]) => items
  .map((item) => clean(item))
  .filter(Boolean)
  .filter((item, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index);

const numberTokens = (value: string) => value.match(/\b\d+(?:[.,]\d+)?%?\b/g) || [];

const xmlEscape = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll("\"", "&quot;")
  .replaceAll("'", "&apos;");

const normalizeHex = (value: string) => {
  const color = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color.slice(1).split("").map((character) => `${character}${character}`).join("")}`.toUpperCase();
  }
  return null;
};

const words = (value: string) => clean(value).split(/\s+/).filter(Boolean);

export const resolveBrandJingleDuration = (value: unknown) => {
  const duration = Number(value ?? BRAND_JINGLE_DEFAULT_DURATION_SECONDS);
  if (!Number.isFinite(duration)) return BRAND_JINGLE_DEFAULT_DURATION_SECONDS;
  return Math.round(duration);
};

export const estimateBrandJingleMusicCost = (durationSeconds: number) => (
  Math.round((durationSeconds / 60) * ELEVENLABS_MUSIC_PRICE_PER_MINUTE_USD * 10_000) / 10_000
);

export const createBrandJingleDurationTemplate = (durationSeconds: number) => {
  const durationMs = resolveBrandJingleDuration(durationSeconds) * 1_000;
  if (durationMs === 20_000) {
    return [
      { section: "hook" as const, durationMs: 6_000 },
      { section: "verse" as const, durationMs: 8_000 },
      { section: "hook" as const, durationMs: 6_000 },
    ];
  }
  if (durationMs === 30_000) {
    return [
      { section: "hook" as const, durationMs: 8_000 },
      { section: "verse" as const, durationMs: 14_000 },
      { section: "hook" as const, durationMs: 8_000 },
    ];
  }
  if (durationMs === 60_000) {
    return [
      { section: "hook" as const, durationMs: 10_000 },
      { section: "verse" as const, durationMs: 20_000 },
      { section: "bridge" as const, durationMs: 10_000 },
      { section: "hook" as const, durationMs: 20_000 },
    ];
  }
  if (durationMs <= 40_000) {
    const firstHook = Math.round(durationMs * 0.3 / 1_000) * 1_000;
    const verse = Math.round(durationMs * 0.4 / 1_000) * 1_000;
    return [
      { section: "hook" as const, durationMs: firstHook },
      { section: "verse" as const, durationMs: verse },
      { section: "hook" as const, durationMs: durationMs - firstHook - verse },
    ];
  }
  const firstHook = Math.round(durationMs / 6 / 1_000) * 1_000;
  const verse = Math.round(durationMs / 3 / 1_000) * 1_000;
  const bridge = Math.round(durationMs / 6 / 1_000) * 1_000;
  return [
    { section: "hook" as const, durationMs: firstHook },
    { section: "verse" as const, durationMs: verse },
    { section: "bridge" as const, durationMs: bridge },
    { section: "hook" as const, durationMs: durationMs - firstHook - verse - bridge },
  ];
};

export const validateBrandJingleResearch = (research: BrandJingleResearch) => {
  const errors: string[] = [];
  if (!["website", "brief"].includes(research.sourceType)) errors.push("sourceType must be website or brief.");
  if (!clean(research.brandName, 100)) errors.push("brandName is required.");
  if (!clean(research.offer, 240)) errors.push("offer is required.");
  if (research.sourceType === "website" && !research.websiteUrl) errors.push("websiteUrl is required for website research.");
  if (research.sourceType === "website" && !research.proof.some((item) => clean(item.text) && item.sourceUrl)) {
    errors.push("Website research needs at least one proof item with a source URL.");
  }
  if (research.sourceType === "brief" && !research.proof.some((item) => clean(item.text))) {
    errors.push("A no-website brief needs at least one proof item copied from the user's brief.");
  }
  return errors;
};

export const validateBrandJinglePlan = (
  research: BrandJingleResearch,
  plan: BrandJinglePlan,
) => {
  const errors = validateBrandJingleResearch(research);
  const durationSeconds = resolveBrandJingleDuration(plan.durationSeconds);
  if (durationSeconds < BRAND_JINGLE_MIN_DURATION_SECONDS || durationSeconds > BRAND_JINGLE_MAX_DURATION_SECONDS) {
    errors.push(`durationSeconds must be ${BRAND_JINGLE_MIN_DURATION_SECONDS}-${BRAND_JINGLE_MAX_DURATION_SECONDS}.`);
  }
  if (!JINGLE_STYLES.some((style) => style.id === plan.genreId)) errors.push("genreId is invalid.");
  if (!clean(plan.angle, 180)) errors.push("angle is required.");
  if (!clean(plan.brandPhonetic, 100)) errors.push("brandPhonetic is required.");
  if (!clean(plan.hook, 140)) errors.push("hook is required.");
  if (words(plan.hook).length > 12) errors.push("hook must be 12 words or fewer.");
  if (/[\r\n]/.test(plan.hook)) errors.push("hook must be one line.");
  const brandName = clean(research.brandName);
  if (brandName && clean(plan.hook).toLowerCase().includes(brandName.toLowerCase())) {
    errors.push("hook must not contain the brand name; Wiggly adds brandPhonetic.");
  }
  const verseRange = durationSeconds <= 24 ? [2, 3] : durationSeconds <= 40 ? [3, 5] : [4, 10];
  if (plan.verseLines.length < verseRange[0]! || plan.verseLines.length > verseRange[1]!) {
    errors.push(`verseLines must contain ${verseRange[0]}-${verseRange[1]} lines for this duration.`);
  }
  if (durationSeconds > 40 && (plan.bridgeLines.length < 1 || plan.bridgeLines.length > 4)) {
    errors.push("Songs longer than 40 seconds need 1-4 bridge lines.");
  }
  if (durationSeconds <= 40 && plan.bridgeLines.length) errors.push("Songs of 40 seconds or less must not include bridgeLines.");
  if ([...plan.verseLines, ...plan.bridgeLines].some((line) => !clean(line, 140) || words(line).length > 14)) {
    errors.push("Every verse and bridge line must be non-empty and 14 words or fewer.");
  }
  if (!plan.selectedEvidenceIndexes.length) errors.push("Select at least one evidence item.");
  if (plan.selectedEvidenceIndexes.some((index) => !Number.isInteger(index) || index < 0 || index >= research.proof.length)) {
    errors.push("selectedEvidenceIndexes contains an invalid index.");
  }
  const evidenceText = plan.selectedEvidenceIndexes
    .map((index) => research.proof[index]?.text || "")
    .join(" ");
  const unsupportedNumbers = unique(numberTokens([plan.hook, ...plan.verseLines, ...plan.bridgeLines].join(" ")))
    .filter((token) => !evidenceText.includes(token));
  if (unsupportedNumbers.length) errors.push(`Lyrics contain unsupported numbers: ${unsupportedNumbers.join(", ")}.`);
  return errors;
};

export const createBrandJingleCompositionPlan = (
  research: BrandJingleResearch,
  plan: BrandJinglePlan,
): BrandJingleCompositionPlan => {
  const errors = validateBrandJinglePlan(research, plan);
  if (errors.length) throw new Error(`Invalid Brand Jingle plan: ${errors.join(" ")}`);
  const style = getJingleStyle(plan.genreId);
  const sectionText = {
    hook: `[Hook]\n${clean(plan.hook, 140)}\n${clean(plan.brandPhonetic, 100)}`,
    verse: `[Verse]\n${plan.verseLines.map((line) => clean(line, 140)).join("\n")}`,
    bridge: `[Bridge]\n${plan.bridgeLines.map((line) => clean(line, 140)).join("\n")}`,
  };
  return {
    chunks: createBrandJingleDurationTemplate(plan.durationSeconds).map(({ section, durationMs }) => ({
      text: sectionText[section],
      duration_ms: durationMs,
      positive_styles: [...style.positiveStyles],
      negative_styles: [...style.negativeStyles],
      context_adherence: "high" as const,
    })),
  };
};

export const buildElevenLabsBrandJingleRequest = (
  research: BrandJingleResearch,
  plan: BrandJinglePlan,
) => ({
  composition_plan: createBrandJingleCompositionPlan(research, plan),
  model_id: ELEVENLABS_MUSIC_MODEL_ID,
});

export async function generateBrandJingleMusic({
  apiKey,
  fetcher = fetch,
  plan,
  research,
}: {
  apiKey: string;
  fetcher?: typeof fetch;
  plan: BrandJinglePlan;
  research: BrandJingleResearch;
}) {
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is required.");
  const response = await fetcher("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify(buildElevenLabsBrandJingleRequest(research, plan)),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`ElevenLabs Music failed with ${response.status}${body ? `: ${body.slice(0, 240)}` : ""}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) throw new Error("ElevenLabs Music returned empty audio.");
  return {
    bytes,
    contentType: response.headers.get("content-type") || "audio/mpeg",
    estimatedCostUsd: estimateBrandJingleMusicCost(plan.durationSeconds),
  };
}

const splitCoverHook = (hook: string) => {
  const hookWords = words(hook);
  if (hookWords.length <= 5) return [hookWords.join(" ")];
  const middle = Math.ceil(hookWords.length / 2);
  return [hookWords.slice(0, middle).join(" "), hookWords.slice(middle).join(" ")];
};

export const createBrandJingleCoverSvg = ({
  logoDataUri,
  plan,
  research,
}: {
  logoDataUri?: string | null;
  plan: BrandJinglePlan;
  research: BrandJingleResearch;
}) => {
  const colors = research.visual.colors.map(normalizeHex).filter((color): color is string => Boolean(color));
  const accent = colors[0] || "#6D4AFF";
  const secondary = colors[1] || "#35D8C8";
  const hookLines = splitCoverHook(plan.hook);
  const brandName = xmlEscape(clean(research.brandName, 80));
  const initials = xmlEscape(research.brandName.split(/\s+/).map((word) => word[0]).join("").slice(0, 3).toUpperCase());
  const logo = logoDataUri
    ? `<image href="${xmlEscape(logoDataUri)}" x="92" y="88" width="164" height="164" preserveAspectRatio="xMidYMid meet"/>`
    : `<circle cx="174" cy="170" r="82" fill="#FFFFFF"/><text x="174" y="193" text-anchor="middle" font-family="Arial, sans-serif" font-size="58" font-weight="800" fill="${accent}">${initials}</text>`;
  const hook = hookLines.map((line, index) => (
    `<text x="86" y="${570 + index * 104}" font-family="Arial, sans-serif" font-size="82" font-weight="900" fill="#FFFFFF">${xmlEscape(line)}</text>`
  )).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="${secondary}"/>
    </linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="24" flood-opacity="0.22"/></filter>
  </defs>
  <rect width="1080" height="1080" fill="url(#background)"/>
  <circle cx="944" cy="122" r="220" fill="#FFFFFF" opacity="0.12"/>
  <circle cx="102" cy="968" r="260" fill="#07111F" opacity="0.15"/>
  <g filter="url(#shadow)">${logo}</g>
  <text x="294" y="143" font-family="Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="4" fill="#FFFFFF" opacity="0.78">BRAND JINGLE</text>
  <text x="294" y="207" font-family="Arial, sans-serif" font-size="48" font-weight="900" fill="#FFFFFF">${brandName}</text>
  ${hook}
  <g transform="translate(86 866)">
    ${[58, 104, 152, 82, 128, 182, 96, 142, 70, 118, 166, 88].map((height, index) => (
      `<rect x="${index * 72}" y="${190 - height}" width="30" height="${height}" rx="15" fill="#FFFFFF" opacity="${index % 3 === 0 ? "1" : "0.74"}"/>`
    )).join("")}
  </g>
</svg>`;
};
