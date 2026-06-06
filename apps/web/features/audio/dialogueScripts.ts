import type { AdScene } from '@/features/engine/scene';

type Fetcher = typeof fetch;

export type DialogueLine = {
  speaker: 'Ava' | 'Sam';
  tone: string;
  text: string;
};

export type DialogueScript = {
  id: string;
  title: string;
  angle: string;
  lines: DialogueLine[];
};

export type GenerateDialogueScriptsOptions = {
  apiKey?: string;
  fetcher?: Fetcher;
  model?: string;
  count?: number;
  timeoutMs?: number;
};

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_DIALOGUE_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_DIALOGUE_TIMEOUT_MS = 30_000;

const cleanText = (value: unknown, maxLength = 240) => String(value ?? '')
  .replace(/[—–]/g, ', ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength)
  .trim();

const slugify = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 54) || 'script';

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ''));
const isAbortError = (error: unknown) => (
  error instanceof Error && (error.name === 'AbortError' || /aborted/i.test(error.message))
);

const parseJsonObject = (value: string) => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith('{')
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || '';
  if (!jsonText) throw new Error('Script writer returned no JSON.');
  return JSON.parse(jsonText) as { scripts?: unknown[] };
};

const hasBadLine = (value: string) => (
  /\b(?:this tool|is it working|will that really make a difference|i'?m worried|i don'?t understand|unlock your potential|game[- ]changer|revolutionary)\b/i.test(value) ||
  /[—–]/.test(value)
);

export const normalizeDialogueScripts = (payload: unknown, count = 5): DialogueScript[] => {
  const rawScripts = Array.isArray((payload as { scripts?: unknown[] })?.scripts)
    ? (payload as { scripts: unknown[] }).scripts
    : [];

  return rawScripts
    .map((script, scriptIndex) => {
      const record = script as {
        title?: unknown;
        angle?: unknown;
        lines?: Array<{ speaker?: unknown; tone?: unknown; text?: unknown }>;
      };
      const lines = Array.isArray(record.lines)
        ? record.lines.map((line, lineIndex) => ({
          speaker: lineIndex % 2 === 0 ? 'Ava' as const : 'Sam' as const,
          tone: cleanText(line.tone || 'natural', 36),
          text: cleanText(line.text, 180),
        })).filter((line) => {
          const wordCount = line.text.split(/\s+/).filter(Boolean).length;
          return wordCount >= 3 && wordCount <= 28 && !hasBadLine(line.text);
        })
        : [];
      const title = cleanText(record.title || `Option ${scriptIndex + 1}`, 60);
      const angle = cleanText(record.angle || 'Brand-specific conversation', 96);

      return {
        id: slugify(`${title}-${angle}-${scriptIndex}`),
        title,
        angle,
        lines,
      };
    })
    .filter((script) => script.lines.length >= 4)
    .slice(0, count);
};

const receiptLines = (label: string, values: string[]) => (
  values.length ? `${label}:\n${values.map((value) => `- ${value}`).join('\n')}` : `${label}: []`
);

const buildPrompt = (scene: AdScene, count: number) => `
Return ONLY valid JSON. Create exactly ${count} short two-person dialogue ad scripts.

BRAND:
${scene.brand.name}

CANVAS COPY:
Headline: ${scene.creative.headline}
Subheadline: ${scene.creative.subheadline}
CTA: ${scene.creative.ctaText}

BRIEF:
Offer: ${scene.brand.offer}
Audience: ${scene.brand.audience}

RECEIPTS:
${receiptLines('specificClaims', scene.brand.receipts.specificClaims)}
${receiptLines('buyerMoments', scene.brand.receipts.buyerMoments)}
${receiptLines('exactSiteLanguage', scene.brand.receipts.exactSiteLanguage)}
${receiptLines('namedProof', scene.brand.receipts.namedProof)}

BEFORE writing each script, decide:
- Setting: texting, car, hallway, Slack DM, front counter, voice note, or another real place.
- Relationship: co-founder/co-founder, boss/employee, two operators, friend/friend, founder/customer.
- Pain: one specific buyerMoment from RECEIPTS when available.
- Proof: one specific claim or namedProof from RECEIPTS when available.

Required shape:
- Line 1: Ava drops a specific moment, number, tab, meeting, metric, customer quote, or real situation. Not a vague feeling.
- Line 2: Sam reacts like a real person. Do not pitch yet.
- Line 3: Ava asks what changed, asks for the link, calls BS, or asks what they did next.
- Line 4: Sam drops the proof casually, then names the brand or mechanism only if natural.

Rules:
- 4 to 6 lines per script, alternating Ava and Sam.
- 14 to 26 seconds when read aloud.
- No fake stats, fake testimonials, hype, buzzwords, em dashes, or Wiggly mentions.
- Never use "this tool", "is it working", "I'm worried", or "I don't understand".
- Use only the brand and receipts above.

Schema:
{"scripts":[{"title":"short","angle":"short","lines":[{"speaker":"Ava","tone":"curious","text":"line"},{"speaker":"Sam","tone":"calm","text":"line"}]}]}
`;

export const generateDialogueScripts = async (
  scene: AdScene,
  options: GenerateDialogueScriptsOptions = {},
) => {
  const count = Math.min(5, Math.max(3, Number(options.count) || 5));
  const apiKey = options.apiKey ?? process.env.GROQ_API_KEY;
  const model = options.model ?? process.env.GROQ_DIALOGUE_MODEL ?? DEFAULT_DIALOGUE_MODEL;

  if (!apiKey || isDisabled(process.env.GROQ_ENABLED) || isDisabled(process.env.AUDIO_SCRIPTS_ENABLED)) {
    throw new Error('Voice script generation is not configured.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_DIALOGUE_TIMEOUT_MS);

  try {
    const response = await (options.fetcher ?? fetch)(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: buildPrompt(scene, count) }],
        response_format: { type: 'json_object' },
        temperature: 0.72,
        max_completion_tokens: 3000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Groq returned ${response.status}.`);
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const scripts = normalizeDialogueScripts(
      parseJsonObject(payload.choices?.[0]?.message?.content || ''),
      count,
    );

    if (scripts.length < 3) {
      throw new Error('Voice script generation returned too few usable options.');
    }

    return { scripts, provider: 'groq', model };
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('Voice script generation took too long. Try again in a moment.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const scriptCacheMatches = (
  sceneId: string,
  cachedSceneId: string,
  scripts: DialogueScript[],
) => sceneId === cachedSceneId && scripts.length > 0;
