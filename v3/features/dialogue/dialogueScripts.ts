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
const maxLinesPerScript = 8;

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

export const cleanDialogueScriptForVoiceover = (script: DialogueScript): DialogueScript => ({
  title: cleanText(script.title, 80) || "Conversation Ad",
  angle: cleanText(script.angle, 160) || "Two people talking about the offer.",
  lines: script.lines.map((line, index) => ({
    speaker: cleanText(line.speaker, 24) || speakerForIndex(index),
    tone: cleanText(line.tone, 36) || (index % 2 === 0 ? "curious" : "calm"),
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
    .filter((script) => script.lines.length >= 4)
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

  const scripts: DialogueScript[] = [
    {
      title: "The Receipt",
      angle: "One person notices the buyer problem, the other drops proof casually.",
      lines: [
        { speaker: "Ava", tone: "frustrated", text: painLine },
        { speaker: "Sam", tone: "calm", text: "Yeah, that is the part most ads skip." },
        { speaker: "Ava", tone: "curious", text: "So what would you lead with instead?" },
        { speaker: "Sam", tone: "matter-of-fact", text: `${proofLine} Then point them to ${cta}.` },
      ],
    },
    {
      title: "The Link Ask",
      angle: "The proof sounds useful enough that the other person asks for the link.",
      lines: [
        { speaker: "Ava", tone: "direct", text: `I keep seeing the same issue, ${painLine}` },
        { speaker: "Sam", tone: "practical", text: `That is exactly why ${brandName} stands out.` },
        { speaker: "Ava", tone: "skeptical", text: "Wait, what changed?" },
        { speaker: "Sam", tone: "casual", text: proofLine },
        { speaker: "Ava", tone: "interested", text: "Send me that." },
      ],
    },
    {
      title: "Before The Pitch",
      angle: "The opening names the real moment before the brand is mentioned.",
      lines: [
        { speaker: "Ava", tone: "tired", text: painLine },
        { speaker: "Sam", tone: "warm", text: "I would not start with a pitch. I would start right there." },
        { speaker: "Ava", tone: "thinking", text: `Then the headline is basically, ${headline}.` },
        { speaker: "Sam", tone: "clear", text: `${proofLine} That makes it feel real.` },
      ],
    },
    {
      title: "Operator Check",
      angle: "Two operators translate a messy website claim into a human ad line.",
      lines: [
        { speaker: "Ava", tone: "focused", text: `If I only had five seconds, I would say ${headline}.` },
        { speaker: "Sam", tone: "thoughtful", text: "Good. But make the reason feel like something that happened." },
        { speaker: "Ava", tone: "curious", text: "Like what?" },
        { speaker: "Sam", tone: "steady", text: proofLine },
      ],
    },
    {
      title: "The Simple Version",
      angle: "The ad becomes a conversation instead of a feature list.",
      lines: [
        { speaker: "Ava", tone: "honest", text: "Most ads make this sound way more complicated than it is." },
        { speaker: "Sam", tone: "easy", text: `Then keep it simple. ${painLine}` },
        { speaker: "Ava", tone: "curious", text: `And ${brandName} is the next step?` },
        { speaker: "Sam", tone: "confident", text: `${proofLine} ${cta}.` },
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
These scripts will become two-speaker audio for a social video ad.

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

BEFORE writing each script, decide:
- Setting: where are they? texting, car, hallway, Slack DM, front counter, voice note, or another real place
- Relationship: who are they? co-founder/co-founder, boss/employee, two operators, friend/friend, founder/customer
- Pain: ONE specific buyerMoment from RECEIPTS or the selected ad pain
- Proof: ONE specific claim, namedProof, or selected ad proof

The proof must land like a casual receipt dropped in conversation, not a pitch.

BANNED SHAPE. Do not produce:
- A: vague worry
- B: pitches the product
- A: "is it working?" or "how does it work?"
- B: receipt
That is an infomercial structure. Real overheard conversations do not work that way.

REQUIRED SHAPE:
- Line 1: A drops a specific moment, number, time, place, tab, meeting, metric, or customer quote. Not a feeling.
- Line 2: B reacts like a friend or operator. Do not pitch yet.
- Line 3: A asks what changed, asks for the link, calls BS, or asks what they did next.
- Line 4: B drops the proof casually, then names the brand or mechanism only if it sounds natural.

STUDY THESE EXAMPLES. Copy the rhythm, not the specifics. Never copy names, settings, industries, numbers, phrases, titles, or lines from these examples.

Example 1:
Ava (tired): "Just got the Q4 ad invoice. Fourteen grand for leads we used to get for six."
Sam (calm): "We stopped trying to win every auction."
Ava: "Then where are the buyers coming from."
Sam: "The recommendation searches. We show up before they even hit a site."
Ava: "How fast did that happen."
Sam: "First ranking in two weeks. Tracked revenue followed."

Example 2:
Ava (frustrated): "We had three good booking requests sit unanswered while I was on jobs."
Sam (practical): "That is the leak. Not demand, response time."
Ava: "I hate that the best leads arrive when nobody can reply."
Sam: "The new setup catches those moments and books the next step."

FORMAT-SPECIFIC EXAMPLES. Copy the conversational shape, not the facts.

Local service:
Ava (annoyed): "Three calls came in after closing yesterday. All from people ready to book."
Sam (plain): "That is the expensive part, the lead was already warm."
Ava: "So what did they change?"
Sam: "The receptionist answers after hours and gets the appointment on the calendar."

Operator workflow:
Ava (focused): "Our competitor showed up in the AI answer again. We were not even mentioned."
Sam (calm): "That is where buyers are checking before they visit a site."
Ava: "Did the visibility work actually move?"
Sam: "First mention showed up in 14 days. That was the receipt."

Ecommerce:
Ava (rushed): "I forgot the gift and the party is this weekend."
Sam (warm): "Then do not make it complicated."
Ava: "What would you send?"
Sam: "Fresh baked cookies. It still feels personal, and it ships like a real gift."

BANNED PHRASES:
"this tool", "is it working", "will that really make a difference", "I'm worried", "I don't understand", "how does it work", "what's your secret", "unlock", "elevate", "transform your business"

RULES:
- Return exactly ${normalizeCount(count)} scripts.
- Each script should be 4-6 lines.
- Use the same two speakers, Ava and Sam.
- No fake names, fake stats, fake testimonials, or made-up claims.
- If proof is weak, use the selected headline/subheadline instead of inventing numbers.
- Never mention Wiggly. Wiggly is the internal builder.
- No em dashes or en dashes.
- Every line must sound like fluent English that can be read aloud.

Return ONLY valid JSON:
{
  "scripts": [
    {
      "title": "short option title",
      "angle": "short strategy angle",
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
