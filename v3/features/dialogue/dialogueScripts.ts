import { GoogleGenAI } from "@google/genai";
import type { AdScene, AdSceneCaption } from "../scene/types";

export type DialogueLine = {
  speaker: string;
  tone: string;
  text: string;
};

export type DialogueScript = {
  title: string;
  angle: string;
  lines: DialogueLine[];
};

export type DialogueGenerationProvider = "gemini" | "deterministic";

export type DialogueGenerationResult = {
  scripts: DialogueScript[];
  model: string;
  provider: DialogueGenerationProvider;
  providerStatus: {
    provider: "gemini";
    status: "used" | "skipped" | "failed";
    reason: string;
  };
};

type GeminiGenerateContent = (input: { model: string; prompt: string }) => Promise<string>;

export const DEFAULT_DIALOGUE_SCRIPT_COUNT = 5;
export const DEFAULT_GEMINI_DIALOGUE_MODEL = "gemini-3.1-flash-lite";

const DEFAULT_TIMEOUT_MS = 30_000;
const maxScripts = 8;
const dialogueLinesPerScript = 6;
const maxLinesPerScript = dialogueLinesPerScript;
const allowedTones = ["frustrated", "calm", "surprised", "skeptical", "casual", "relieved"] as const;

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const cleanText = (value: unknown, maxLength = 320) => String(value ?? "")
  .replace(/[—–]/g, ", ")
  .replace(/\s+/g, " ")
  .replace(/\s+([,.!?])/g, "$1")
  .trim()
  .slice(0, maxLength)
  .trim();

const normalizeCount = (count?: number) => {
  if (!Number.isFinite(count)) return DEFAULT_DIALOGUE_SCRIPT_COUNT;
  return Math.max(1, Math.min(maxScripts, Math.floor(count ?? DEFAULT_DIALOGUE_SCRIPT_COUNT)));
};

const listForPrompt = (items: string[] | undefined, maxItems = 8) => {
  const cleanItems = (items || [])
    .map((item) => cleanText(item, 220))
    .filter(Boolean)
    .slice(0, maxItems);

  return cleanItems.length
    ? cleanItems.map((item) => `- ${item}`).join("\n")
    : "[]";
};

const adAnglesForPrompt = (scene: AdScene) => {
  const adAngles = (scene.metadata.adAngles || [])
    .map((angle) => ({
      buyer: cleanText(angle.buyer, 120),
      moment: cleanText(angle.moment, 180),
      pain: cleanText(angle.pain, 180),
      proof: cleanText(angle.proof, 180),
      sitePhrase: angle.sitePhrase ? cleanText(angle.sitePhrase, 140) : null,
    }))
    .filter((angle) => angle.buyer || angle.moment || angle.pain || angle.proof)
    .slice(0, 8);

  return adAngles.length ? JSON.stringify(adAngles, null, 2) : "[]";
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out.`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const parseJsonObject = (value: string) => {
  const trimmed = value
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const json = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  return JSON.parse(json) as unknown;
};

const speakerForIndex = (index: number) => (index % 2 === 0 ? "Ava" : "Sam");
const normalizeTone = (value: unknown, lineIndex: number) => {
  const tone = cleanText(value, 36).toLowerCase();
  return allowedTones.find((allowedTone) => allowedTone === tone) || (lineIndex % 2 === 0 ? "skeptical" : "calm");
};

export const cleanDialogueScriptForVoiceover = (script: DialogueScript): DialogueScript => ({
  title: cleanText(script.title, 80) || "Conversation Ad",
  angle: cleanText(script.angle, 160) || "Two people talking about the offer.",
  lines: script.lines.map((line, index) => ({
    speaker: speakerForIndex(index),
    tone: normalizeTone(line.tone, index),
    text: cleanText(line.text, 180),
  })).filter((line) => line.text),
});

export const cloneDialogueScript = (script: DialogueScript): DialogueScript => ({
  title: script.title,
  angle: script.angle,
  lines: script.lines.map((line) => ({ ...line })),
});

const normalizeDialogueScriptsPayload = (payload: unknown, count: number): DialogueScript[] => {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const scripts = Array.isArray(record.scripts) ? record.scripts : [];

  return scripts
    .map((script, scriptIndex) => {
      const scriptRecord = script && typeof script === "object" ? script as Record<string, unknown> : {};
      const rawLines = Array.isArray(scriptRecord.lines) ? scriptRecord.lines : [];
      const lines = rawLines
        .slice(0, maxLinesPerScript)
        .map((line, lineIndex) => {
          const lineRecord = line && typeof line === "object" ? line as Record<string, unknown> : {};
          return {
            speaker: cleanText(lineRecord.speaker, 24) || speakerForIndex(lineIndex),
            tone: cleanText(lineRecord.tone, 36) || (lineIndex % 2 === 0 ? "curious" : "calm"),
            text: cleanText(lineRecord.text, 180),
          };
        })
        .filter((line) => line.text);

      return cleanDialogueScriptForVoiceover({
        title: cleanText(scriptRecord.title, 80) || `Option ${scriptIndex + 1}`,
        angle: cleanText(scriptRecord.angle, 160) || "A specific buyer moment becomes a casual conversation.",
        lines,
      });
    })
    .filter((script) => script.lines.length === dialogueLinesPerScript)
    .slice(0, count);
};

const firstReal = (...values: Array<string | undefined>) => (
  values.map((value) => cleanText(value, 180)).find(Boolean) || ""
);

export const buildFallbackDialogueScripts = (scene: AdScene, count = DEFAULT_DIALOGUE_SCRIPT_COUNT): DialogueScript[] => {
  const normalizedCount = normalizeCount(count);
  const brandName = cleanText(scene.brand.name, 44) || "the brand";
  const pain = firstReal(scene.creative.selectedPain, scene.brand.receipts.buyerMoments[0], scene.creative.subheadline);
  const proof = firstReal(scene.creative.selectedProof, scene.brand.receipts.specificClaims[0], scene.brand.receipts.namedProof[0]);
  const headline = cleanText(scene.creative.headline, 84);
  const cta = cleanText(scene.creative.ctaText, 44) || "See it";
  const proofLine = proof ? `${proof}. That is the receipt.` : `${brandName} makes the next step feel obvious.`;
  const painLine = pain || `People keep missing what ${brandName} actually does.`;
  const ctaLine = `${brandName}. ${cta}.`;

  const scripts: DialogueScript[] = [
    {
      title: "The Receipt",
      angle: "One person notices the buyer problem, the other drops proof casually.",
      lines: [
        { speaker: "Ava", tone: "frustrated", text: painLine },
        { speaker: "Sam", tone: "calm", text: "Yeah, that is the part most ads skip." },
        { speaker: "Ava", tone: "skeptical", text: "So what would you lead with instead?" },
        { speaker: "Sam", tone: "calm", text: proofLine },
        { speaker: "Ava", tone: "surprised", text: "Okay, what is the next step?" },
        { speaker: "Sam", tone: "casual", text: ctaLine },
      ],
    },
    {
      title: "The Link Ask",
      angle: "The proof sounds useful enough that the other person asks for the link.",
      lines: [
        { speaker: "Ava", tone: "frustrated", text: `I keep seeing the same issue, ${painLine}` },
        { speaker: "Sam", tone: "calm", text: `That is exactly why ${brandName} stands out.` },
        { speaker: "Ava", tone: "skeptical", text: "Wait, what changed?" },
        { speaker: "Sam", tone: "casual", text: proofLine },
        { speaker: "Ava", tone: "relieved", text: "Send me that." },
        { speaker: "Sam", tone: "casual", text: ctaLine },
      ],
    },
    {
      title: "Before The Pitch",
      angle: "The opening names the real moment before the brand is mentioned.",
      lines: [
        { speaker: "Ava", tone: "frustrated", text: painLine },
        { speaker: "Sam", tone: "calm", text: "I would not start with a pitch. I would start right there." },
        { speaker: "Ava", tone: "skeptical", text: `Then the headline is basically, ${headline}.` },
        { speaker: "Sam", tone: "calm", text: `${proofLine} That makes it feel real.` },
        { speaker: "Ava", tone: "surprised", text: "What should someone do after hearing that?" },
        { speaker: "Sam", tone: "casual", text: ctaLine },
      ],
    },
    {
      title: "Operator Check",
      angle: "Two operators translate a messy website claim into a human ad line.",
      lines: [
        { speaker: "Ava", tone: "skeptical", text: `If I only had five seconds, I would say ${headline}.` },
        { speaker: "Sam", tone: "calm", text: "Good. But make the reason feel like something that happened." },
        { speaker: "Ava", tone: "skeptical", text: "Like what?" },
        { speaker: "Sam", tone: "calm", text: proofLine },
        { speaker: "Ava", tone: "relieved", text: "That is the part I would remember." },
        { speaker: "Sam", tone: "casual", text: ctaLine },
      ],
    },
    {
      title: "The Simple Version",
      angle: "The ad becomes a conversation instead of a feature list.",
      lines: [
        { speaker: "Ava", tone: "frustrated", text: "Most ads make this sound way more complicated than it is." },
        { speaker: "Sam", tone: "calm", text: `Then keep it simple. ${painLine}` },
        { speaker: "Ava", tone: "skeptical", text: `And ${brandName} is the next step?` },
        { speaker: "Sam", tone: "calm", text: proofLine },
        { speaker: "Ava", tone: "relieved", text: "That is enough for me to check it out." },
        { speaker: "Sam", tone: "casual", text: ctaLine },
      ],
    },
  ];

  return scripts.slice(0, normalizedCount).map(cleanDialogueScriptForVoiceover);
};

export const captionsFromDialogueScript = (
  script: DialogueScript,
  totalDurationMs?: number,
): AdSceneCaption[] => {
  const cleaned = cleanDialogueScriptForVoiceover(script);
  const gapMs = 180;
  const speakers = Array.from(new Set(cleaned.lines.map((line) => line.speaker))).slice(0, 2);
  const wordCounts = cleaned.lines.map((line) => Math.max(1, line.text.split(/\s+/).filter(Boolean).length));
  const totalWords = wordCounts.reduce((sum, words) => sum + words, 0) || 1;
  const usableDurationMs = totalDurationMs && totalDurationMs > 0
    ? Math.max(cleaned.lines.length * 1200, totalDurationMs - gapMs * Math.max(0, cleaned.lines.length - 1))
    : 0;
  let cursor = 0;

  return cleaned.lines.map((line, index) => {
    const durationMs = usableDurationMs
      ? Math.max(1200, Math.round(usableDurationMs * (wordCounts[index] / totalWords)))
      : Math.max(1400, Math.min(4500, wordCounts[index] * 380));
    const startMs = cursor;
    const endMs = totalDurationMs && index === cleaned.lines.length - 1
      ? Math.max(startMs + 700, totalDurationMs)
      : startMs + durationMs;
    cursor = endMs + gapMs;

    return {
      text: line.text,
      startMs,
      endMs,
      speaker: speakers.indexOf(line.speaker) === 1 ? 2 : 1,
    };
  });
};

export const buildDialogueScriptsPrompt = (scene: AdScene, count = DEFAULT_DIALOGUE_SCRIPT_COUNT) => {
  const receipts = scene.brand.receipts;

  return `You are writing short two-person dialogue scripts for Wiggly's visualizer ad format.

OBJECTIVE:
Write ${normalizeCount(count)} natural, overheard conversation options for the brand below.
These scripts will become two-speaker audio for a social video ad that plays on mute first, so the conversation needs enough runway that the key beats land after a viewer's sound turns on.

BRAND:
Name: ${cleanText(scene.brand.name, 80)}
Website: ${cleanText(scene.brand.url, 140)}
Description: ${cleanText(scene.brand.description, 220)}

CURRENT AD IDEA:
Headline: ${cleanText(scene.creative.headline, 120)}
Subheadline: ${cleanText(scene.creative.subheadline, 220)}
CTA: ${cleanText(scene.creative.ctaText, 80)}
Pain picked for this ad: ${cleanText(scene.creative.selectedPain, 180) || "[]"}
Proof picked for this ad: ${cleanText(scene.creative.selectedProof, 180) || "[]"}

RECEIPTS:
Use these exact extracted artifacts as source material. Do not summarize them before writing.
specificClaims:
${listForPrompt(receipts.specificClaims)}
buyerMoments:
${listForPrompt(receipts.buyerMoments)}
exactSiteLanguage:
${listForPrompt(receipts.exactSiteLanguage)}
namedProof:
${listForPrompt(receipts.namedProof)}

CACHED AD ANGLES:
Use these first when available. Each script must be built on a different adAngle.
${adAnglesForPrompt(scene)}

BEFORE writing each script, decide:
- Setting: texting, car, hallway, Slack DM, front counter, voice note, or another real place
- Relationship: co-founder/co-founder, boss/employee, two operators, friend/friend, founder/customer
- Angle: ONE adAngle from CACHED AD ANGLES. If none exist, use ONE specific buyerMoment from RECEIPTS or the selected ad pain
- Proof: the chosen adAngle proof, ONE specific claim, namedProof, or selected ad proof

The proof must land like a casual receipt dropped in conversation, not a pitch.

BANNED SHAPE. Do not produce:
- A: vague worry
- B: pitches the product
- A: "is it working?" or "how does it work?"
- B: receipt
That is an infomercial structure. Real overheard conversations do not work that way.

REQUIRED SHAPE (exactly 6 lines, speakers strictly alternate Ava, Sam, Ava, Sam, Ava, Sam):
- Line 1: A drops a specific moment, number, time, place, tab, meeting, metric, or customer quote. Not a feeling. This is the hook and must read well as on-screen text on mute.
- Line 2: B reacts like a friend or operator. Does not pitch.
- Line 3: A probes: asks what changed, asks what they did, or calls BS.
- Line 4: B drops the proof casually. Names the brand only if natural, never as a pitch.
- Line 5: A wants in. Asks for the name, the link, or how to start. The CTA comes from A pulling, never from B pushing.
- Line 6: B answers plainly with the brand name or next step, flat and human, not a pitch or a recap. This carries ${cleanText(scene.creative.ctaText, 80)} as something a person would actually say.

DISTINCTNESS:
- Every script must use a different adAngle when CACHED AD ANGLES has enough options.
- Every script must use a different setting and a different relationship.
- Do not write reworded versions of the same conversation.

STUDY THESE EXAMPLES. Copy the rhythm, not the specifics. Never copy names, settings, industries, numbers, phrases, titles, or lines.

Local service:
Ava (frustrated): "The dishwasher died at 8pm and every repair form said tomorrow."
Sam (calm): "That is when people stop comparing and just want a slot."
Ava: "Who actually picked it up?"
Sam: "The shop with live evening booking. Grabbed the first morning window."
Ava (surprised): "Okay, who was that, I have one dying too."
Sam (casual): "Northside. Booked it from my phone in under a minute."

Operator workflow:
Ava (skeptical): "Inventory said twelve left. The warehouse found three."
Sam (calm): "That mismatch is what keeps support buried."
Ava (frustrated): "Did the new scan flow actually fix it?"
Sam (calm): "By Friday the counts matched before the pick list went out."
Ava (surprised): "What's it called, I want this before peak season."
Sam (casual): "I'll drop you the link. Took an afternoon to set up."

Ecommerce:
Ava (frustrated): "I forgot the gift and the party is this weekend."
Sam (calm): "Then do not make it complicated."
Ava (skeptical): "What would you send?"
Sam (calm): "Fresh baked cookies. Feels personal, ships like a real gift."
Ava (relieved): "Perfect, where do I order?"
Sam (casual): "I'll text you the site, you can have it out by tonight."

BANNED PHRASES:
"this tool", "is it working", "will that really make a difference", "I'm worried", "I don't understand", "how does it work", "what's your secret", "unlock", "elevate", "transform your business"

RULES:
- Return exactly ${normalizeCount(count)} scripts.
- Each script must be exactly 6 lines.
- Use the same two speakers, Ava and Sam.
- Speakers strictly alternate: Ava, Sam, Ava, Sam, Ava, Sam.
- No fake names, fake stats, fake testimonials, or made-up claims.
- If proof is weak, stay vague and human instead of quoting marketing copy or inventing numbers.
- The CTA must come from A asking, never from B pitching. Line 6 carries ${cleanText(scene.creative.ctaText, 80)} as a natural human reply.
- Tone must be one of: frustrated, calm, surprised, skeptical, casual, relieved.
- Name the brand above (${cleanText(scene.brand.name, 80)}) only if natural. Never mention Wiggly.
- No em dashes or en dashes.
- Every line must sound like fluent English that can be read aloud.

Return ONLY valid JSON:
{
  "scripts": [
    {
      "title": "short option title",
      "angle": "short strategy angle",
      "chosenSetting": "setting used for this script",
      "chosenRelationship": "relationship used for this script",
      "chosenBuyerMoment": "the adAngle moment or receipt moment used",
      "chosenProof": "the adAngle proof or receipt proof used",
      "lines": [
        {"speaker": "Ava", "tone": "frustrated", "text": "line"},
        {"speaker": "Sam", "tone": "calm", "text": "line"}
      ]
    }
  ]
}`;
};

const callGeminiDialogue = async ({
  apiKey,
  model,
  prompt,
  timeoutMs,
  geminiGenerateContent,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  timeoutMs: number;
  geminiGenerateContent?: GeminiGenerateContent;
}) => {
  if (geminiGenerateContent) {
    return withTimeout(geminiGenerateContent({ model, prompt }), timeoutMs, "Gemini dialogue scripts");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await withTimeout(ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  }), timeoutMs, "Gemini dialogue scripts");

  return response.text || "{\"scripts\":[]}";
};

export const generateDialogueScriptsForScene = async (
  scene: AdScene,
  options: {
    count?: number;
    apiKey?: string;
    model?: string;
    timeoutMs?: number;
    geminiGenerateContent?: GeminiGenerateContent;
  } = {},
): Promise<DialogueGenerationResult> => {
  const count = normalizeCount(options.count);
  const fallback = buildFallbackDialogueScripts(scene, count);
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  const model = options.model || process.env.GEMINI_DIALOGUE_MODEL || DEFAULT_GEMINI_DIALOGUE_MODEL;

  if (!apiKey || isDisabled(process.env.GEMINI_ENABLED)) {
    return {
      scripts: fallback,
      model: "deterministic-dialogue",
      provider: "deterministic",
      providerStatus: {
        provider: "gemini",
        status: "skipped",
        reason: "Gemini dialogue generation was not configured; used deterministic receipt-based scripts.",
      },
    };
  }

  try {
    const content = await callGeminiDialogue({
      apiKey,
      model,
      prompt: buildDialogueScriptsPrompt(scene, count),
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      geminiGenerateContent: options.geminiGenerateContent,
    });
    const scripts = normalizeDialogueScriptsPayload(parseJsonObject(content), count);

    return {
      scripts: scripts.length >= count ? scripts : [...scripts, ...fallback.slice(scripts.length, count)],
      model,
      provider: "gemini",
      providerStatus: {
        provider: "gemini",
        status: "used",
        reason: `Generated ${count} dialogue scripts with ${model}.`,
      },
    };
  } catch (error) {
    const reason = error instanceof Error
      ? `${error.message} Used deterministic receipt-based scripts.`
      : "Gemini dialogue generation failed; used deterministic receipt-based scripts.";

    return {
      scripts: fallback,
      model,
      provider: "deterministic",
      providerStatus: {
        provider: "gemini",
        status: "failed",
        reason,
      },
    };
  }
};
