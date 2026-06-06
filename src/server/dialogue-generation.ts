import { GoogleGenAI } from '@google/genai';
import {
  DIALOGUE_MODEL_OPTIONS,
  DIALOGUE_PROVIDER_TIMEOUT_MS,
  GEMINI_DIALOGUE_MODEL,
  GROQ_DIALOGUE_MODELS,
  OPENROUTER_FREE_DIALOGUE_MODELS,
  OPENROUTER_PREMIUM_DIALOGUE_MODELS,
  PINNED_TTS_MODEL,
} from './ai-models';
import {
  normalizeBrandReceipts,
  parseJsonResponse,
  withTimeout,
  type BrandReceipts,
} from './brand-research';

const isDisabled = (value: string | undefined) => ['0', 'false', 'off', 'no'].includes(String(value || '').trim().toLowerCase());

export class DialogueGenerationError extends Error {
  status: number;
  selectedModel?: string;

  constructor(message: string, status = 503, selectedModel?: string) {
    super(message);
    this.name = 'DialogueGenerationError';
    this.status = status;
    this.selectedModel = selectedModel;
  }

  toResponseBody() {
    return {
      error: this.message,
      ...(this.selectedModel ? { selectedModel: this.selectedModel } : {}),
    };
  }
}

const gibberishPattern = /\b(?:[bcdfghjklmnpqrstvwxyz]{4,}|(?:asdf|sdfg|qwer|zxcv|hjkl|lorem|ipsum)[a-z]*)\b/i;
const forcedNegationPattern = /\b(?:not this|not that|not because|not more|not another|it'?s not|this isn'?t|don'?t just|stop (?:trying|doing|using|making))\b/i;
const staccatoPattern = /(?:^|[.!?]\s+)(?:[A-Z][a-z]{2,12}\. ){2,}/;
const copiedDialogueExamplePattern = /\b(?:q4 ad invoice|fourteen grand|meta auction|we stopped trying to win every|where are the buyers coming from|recommendation searches|three good booking requests|that is the leak|best leads arrive|busy hours into booked slots|catch those moments and book|serum sold out|sensitive skin|glossy product claim|friend explaining it|d2c operators texting|local service owner and employee|skincare founder and friend)\b/i;
const bannedAdBuzzwordPattern = /\b(?:game[- ]changer|revolutionary|cutting[- ]edge|unlock your potential|take it to the next level|transform your business)\b/i;
const bannedDialogueShapePattern = /\b(?:this tool|is it working|will that really make a difference|i'?m worried|i don'?t understand|how did you do it\??|how does it work\??|what kind of results did you see\??|what'?s your secret|what'?s a better way|what'?s the best way)\b/i;

export const cleanHumanDialogueText = (value: unknown) => String(value || '')
  .replace(/[—–]/g, ', ')
  .replace(/\s+/g, ' ')
  .trim();

const hasGarbageText = (value: unknown) => {
  const text = String(value || '').trim();
  return (
    !text ||
    gibberishPattern.test(text) ||
    /\bwiggly\b/i.test(text) ||
    /[—–]/.test(text) ||
    forcedNegationPattern.test(text) ||
    staccatoPattern.test(text) ||
    copiedDialogueExamplePattern.test(text) ||
    bannedAdBuzzwordPattern.test(text) ||
    bannedDialogueShapePattern.test(text)
  );
};

const normalizeDialogueScripts = (payload: any, count: number) => {
  const rawScripts = Array.isArray(payload?.scripts) ? payload.scripts : [];

  return rawScripts
    .map((script: any) => {
      const lines = Array.isArray(script?.lines)
        ? script.lines
            .map((line: any, index: number) => ({
              speaker: String(line?.speaker || (index % 2 === 0 ? 'Ava' : 'Sam')).trim(),
              tone: String(line?.tone || 'natural').trim(),
              text: cleanHumanDialogueText(line?.text),
            }))
            .filter((line: any) => {
              const words = line.text.split(/\s+/).filter(Boolean);
              return words.length >= 3 && words.length <= 28 && !hasGarbageText(line.text);
            })
        : [];

      return {
        title: cleanHumanDialogueText(script?.title || 'Conversation option'),
        angle: cleanHumanDialogueText(script?.angle || 'Problem and solution'),
        lines,
      };
    })
    .filter((script: any) => {
      const combined = [
        script.title,
        script.angle,
        ...script.lines.map((line: any) => line.text),
      ].join(' ');
      const repeatsSpeaker = script.lines.some((line: any, index: number) => (
        index > 0 && line.speaker.toLowerCase() === script.lines[index - 1].speaker.toLowerCase()
      ));
      return script.lines.length >= 4 && !repeatsSpeaker && !hasGarbageText(combined);
    })
    .slice(0, count);
};

const asBriefString = (brief: any, key: string, fallback = '') => {
  const value = typeof brief === 'object' && brief ? brief[key] : '';
  return String(value || fallback).replace(/\s+/g, ' ').trim();
};

const getBriefReceipts = (brief: any): BrandReceipts => normalizeBrandReceipts(
  typeof brief === 'object' && brief ? brief.receipts : undefined
);

const formatReceiptArrayForPrompt = (label: string, values: string[]) => {
  if (!values.length) return `${label}: []`;
  return `${label}:\n${values.map((value) => `- ${value}`).join('\n')}`;
};

const formatDialogueReceiptsForPrompt = (creativeBrief: any) => {
  const receipts = getBriefReceipts(creativeBrief);
  return [
    formatReceiptArrayForPrompt('specificClaims', receipts.specificClaims),
    formatReceiptArrayForPrompt('buyerMoments', receipts.buyerMoments),
    formatReceiptArrayForPrompt('exactSiteLanguage', receipts.exactSiteLanguage),
    formatReceiptArrayForPrompt('namedProof', receipts.namedProof),
  ].join('\n');
};

const DIALOGUE_SCRIPT_CREATIVE_PROCESS = `BEFORE writing each script, decide:
- Setting: where are they? texting, car, hallway, Slack DM, front counter, voice note, or another real place
- Relationship: who are they? co-founder/co-founder, boss/employee, two operators, friend/friend, founder/customer
- Pain: ONE specific buyerMoment from RECEIPTS
- Proof: ONE specific claim or namedProof from RECEIPTS

The proof must land like a casual receipt dropped in conversation, not a pitch.`;

const DIALOGUE_SCRIPT_SHAPE_RULES = `BANNED SHAPE. Do not produce:
- A: vague worry
- B: pitches the tool
- A: "is it working?" or "how does it work?"
- B: receipt
That is an infomercial structure. Real overheard conversations do not work that way.

REQUIRED SHAPE:
- Line 1: A drops a specific moment, number, time, place, tab, meeting, metric, or customer quote. Not a feeling.
  Bad: "I'm worried we're losing sales."
  Good: "Just checked GA. Organic is down 40% this month."
- Line 2: B reacts like a friend or operator. Do not pitch yet.
  Bad: "We're using this tool to fix that."
  Good: "Yeah, we were there in March. Brutal."
- Line 3: A asks what changed, asks for the link, calls BS, or asks what they did next. No robotic "is it working?"
- Line 4: B drops the proof casually, then names the brand or mechanism only if it sounds natural.

Banned phrases:
- "this tool"
- "is it working"
- "will that really make a difference"
- "I'm worried"
- "I don't understand"
- "how does it work"
- "how did you do it"
- "what's your secret"
- "what's the best way"`;

const DIALOGUE_SCRIPT_EXAMPLES = `STUDY THESE EXAMPLES. Copy the rhythm, not the specifics. Never copy names, settings, industries, numbers, phrases, titles, or lines from these examples. Your only source material is THIS brief and RECEIPTS.

Example 1, D2C operators texting about search visibility:
Ava (tired): "Just got the Q4 ad invoice. Fourteen grand for leads we used to get for six."
Sam (calm): "We stopped trying to win every Meta auction."
Ava: "Then where are the buyers coming from."
Sam: "The recommendation searches. We show up before they even hit a site."
Ava: "How fast did that happen."
Sam: "First ranking in two weeks. Tracked revenue followed."

Example 2, local service owner and employee after a busy day:
Ava (frustrated): "We had three good booking requests sit unanswered while I was on jobs."
Sam (practical): "That is the leak. Not demand, response time."
Ava: "I hate that the best leads arrive when nobody can reply."
Sam: "The new setup catches those moments and books the next step."
Ava: "So fewer people drift to whoever answers first."
Sam: "Exactly. It turns the busy hours into booked slots."

Example 3, skincare founder and friend after a product drop:
Ava (excited): "The serum sold out again, but the comments are all asking if it works for sensitive skin."
Sam (warm): "Then say that first. That is the hesitation."
Ava: "Not another glossy product claim."
Sam: "Right. Lead with the real concern, then the proof from the people using it."
Ava: "So it feels like a friend explaining it."
Sam: "That is why people stop scrolling."`;

const fallbackDialogueScripts = (count: number, creativeBrief: any = {}) => {
  const offer = asBriefString(creativeBrief, 'offer', 'this offer');
  const buyer = asBriefString(creativeBrief, 'buyer', 'people who need this');
  const pain = asBriefString(creativeBrief, 'pain', 'they are not sure what to choose');
  const differentiator = asBriefString(creativeBrief, 'differentiator', 'the guidance feels clearer than the usual options');
  const cta = asBriefString(creativeBrief, 'cta', 'Learn more.');
  const brandName = offer.match(/^(.+?)\s+(?:offers|provides|sells|helps|makes)\b/i)?.[1]?.trim() || 'this brand';
  const category = offer
    .replace(new RegExp(`^${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i'), '')
    .replace(/^(offers|provides|sells|makes|helps with)\s+/i, '')
    .replace(/\s+for\s+people.*$/i, '')
    .trim() || 'the right option';
  const categoryPhrase = /\bservices\b/i.test(category) ? `${category} can help` : `${category} helps`;
  const shortBuyer = buyer.replace(/^people\s+/i, 'people ').slice(0, 72).trim();
  const shortPain = pain
    .replace(/^they\s+want/i, 'you want')
    .replace(/^they\s+are/i, 'you are')
    .replace(/^they\s+/i, 'you ')
    .replace(/\s+but\s+do\s+not\s+/i, ' and you do not ')
    .slice(0, 82)
    .trim();
  const sentencePain = shortPain ? `${shortPain.charAt(0).toUpperCase()}${shortPain.slice(1).replace(/[.]+$/g, '')}` : 'The choice feels unclear';
  const trustReason = /\bguid/i.test(differentiator)
    ? 'the guidance feels personal and clear'
    : 'the value is easy to understand';
  const simpleCta = cta.replace(/[.]+$/g, '').toLowerCase();

  const scripts = [
    {
      title: 'Clear Next Step',
      angle: 'A buyer needs confidence before choosing.',
      lines: [
        { speaker: 'Ava', tone: 'unsure', text: `I keep looking at options, but ${shortPain.toLowerCase()}.` },
        { speaker: 'Sam', tone: 'calm', text: `${brandName} makes ${category.toLowerCase()} feel easier to choose.` },
        { speaker: 'Ava', tone: 'curious', text: `So it helps ${shortBuyer.toLowerCase()} know what actually fits?` },
        { speaker: 'Sam', tone: 'assured', text: `Yes. The next step is simple, ${simpleCta}.` },
      ],
    },
    {
      title: 'Review Spiral',
      angle: 'The old research path is not enough.',
      lines: [
        { speaker: 'Ava', tone: 'frustrated', text: `I keep comparing options and still feel unsure.` },
        { speaker: 'Sam', tone: 'practical', text: `${brandName} should make the choice feel clear right away.` },
        { speaker: 'Ava', tone: 'thoughtful', text: `So the ad should make the choice feel less risky?` },
        { speaker: 'Sam', tone: 'confident', text: `Exactly. Show that ${trustReason}.` },
      ],
    },
    {
      title: 'Trust Before Action',
      angle: 'The customer needs a reason to trust the choice.',
      lines: [
        { speaker: 'Ava', tone: 'careful', text: `I would book, but I want to know I am choosing the right place.` },
        { speaker: 'Sam', tone: 'warm', text: `${brandName} should make that feel easier to understand.` },
        { speaker: 'Ava', tone: 'interested', text: `Because ${shortBuyer.toLowerCase()} need more than a generic promise?` },
        { speaker: 'Sam', tone: 'steady', text: `Right. Lead with the result, then ask them to ${simpleCta}.` },
      ],
    },
    {
      title: 'Simple Explanation',
      angle: 'Make the offer easy to repeat.',
      lines: [
        { speaker: 'Ava', tone: 'curious', text: `How would you explain this without making it sound complicated?` },
        { speaker: 'Sam', tone: 'clear', text: `${brandName} helps when ${shortPain.toLowerCase()}.` },
        { speaker: 'Ava', tone: 'relieved', text: `That sounds easier than trying to figure it out alone.` },
        { speaker: 'Sam', tone: 'friendly', text: `That is the point. Make the next step feel obvious.` },
      ],
    },
    {
      title: 'Before They Scroll',
      angle: 'The first line names the hidden hesitation.',
      lines: [
        { speaker: 'Ava', tone: 'honest', text: `Most ads do not answer the thing I am actually worried about.` },
        { speaker: 'Sam', tone: 'direct', text: `Then say it plainly. ${sentencePain}.` },
        { speaker: 'Ava', tone: 'curious', text: `And then show how ${categoryPhrase.toLowerCase()}?` },
        { speaker: 'Sam', tone: 'assured', text: `Yes. Keep it human, specific, and easy to act on.` },
      ],
    },
  ];

  return normalizeDialogueScripts({ scripts }, count);
};

const buildDialogueScriptsPrompt = ({
  creativeBrief,
  persona,
  count,
}: {
  creativeBrief: any;
  persona: string;
  count: number;
}) => {
  const briefText = typeof creativeBrief === 'object'
    ? Object.entries(creativeBrief)
      .filter(([label]) => label !== 'receipts')
      .map(([label, value]) => `${label}: ${value}`)
      .join('\n')
    : String(creativeBrief || '');
  const receiptsText = formatDialogueReceiptsForPrompt(creativeBrief);

  return `You are a direct-response creative strategist for Wiggly, a visual ad creator.

Create ${count} short two-person dialogue ad scripts for this brief.
Return exactly ${count} scripts. Do not stop after one option.

Brief:
${briefText}

RECEIPTS:
Use these exact extracted artifacts as source material. Do not summarize them before writing.
${receiptsText}

${DIALOGUE_SCRIPT_CREATIVE_PROCESS}

${DIALOGUE_SCRIPT_SHAPE_RULES}

${DIALOGUE_SCRIPT_EXAMPLES}

Persona: ${persona}

The ad should feel like a real-life overheard conversation, not a sales pitch.
One person has the problem. The other casually reveals the solution.
Each script must reference one specific claim or named proof from RECEIPTS when available.
Each script must reference one concrete buyer moment from RECEIPTS when available.
Use exactSiteLanguage as a voice cue when it fits naturally.
If a receipts field is empty, ignore that field. Do not invent replacement proof, fake stats, or fake testimonials.
Keep each script 14-26 seconds when read aloud.
No hype. No buzzwords. No testimonials. No fake stats.
No em dashes or en dashes. Use commas or periods only.
No forced negation structure like "not this, but that", "it is not X, it is Y", or "stop doing X".
No staccato sentence stacking. Do not write choppy fragments like "Missed calls. Lost patients. Empty chairs."
Use normal conversational sentences that sound like people talking naturally.
Do not include placeholder text, keyboard-mash text, filler words, lorem ipsum, or nonsensical tokens.
Do not copy any sentence, title, number, setting, or industry from STUDY THESE EXAMPLES.
Every line must be fluent English that could be read aloud in the ad.
Never mention Wiggly. Wiggly is the internal builder, not the product being advertised.
Use the offer and CTA from the brief. If the brand name is unknown, refer to it as "the tool", "this thing", or "the brand" instead of inventing one.

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

const normalizeDialogueModelChoice = (value: unknown) => {
  const choice = String(value || 'auto').trim();
  return DIALOGUE_MODEL_OPTIONS.has(choice) ? choice : 'auto';
};

const getDialogueModelProvider = (choice: string) => {
  if (choice === 'local') return 'local';
  if (choice.startsWith('groq:')) return 'groq';
  if (choice.startsWith('openrouter:')) return 'openrouter';
  if (choice.startsWith('gemini:')) return 'gemini';
  return 'auto';
};

const getDialogueModelName = (choice: string) => choice.split(':').slice(1).join(':');

const generateDialogueScriptsWithOpenRouter = async (prompt: string, count: number, modelChoices = OPENROUTER_FREE_DIALOGUE_MODELS, options: { requireFree?: boolean } = {}) => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || isDisabled(process.env.OPENROUTER_ENABLED)) return { scripts: [], model: '' };

  for (const model of modelChoices) {
    let timeout: NodeJS.Timeout | undefined;
    try {
      let bestScripts: any[] = [];
      for (let attempt = 0; attempt < 2 && bestScripts.length < count; attempt += 1) {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), DIALOGUE_PROVIDER_TIMEOUT_MS);
        const response = await withTimeout(
          fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.PUBLIC_APP_URL || 'http://localhost:3000',
              'X-Title': 'Wiggly',
            },
            body: JSON.stringify({
              model,
              messages: [{
                role: 'user',
                content: attempt === 0
                  ? prompt
                  : `${prompt}\n\nYour previous output returned only ${bestScripts.length} usable scripts. Return exactly ${count} fresh, non-duplicative scripts. Do not reuse weak generic lines.`,
              }],
              response_format: { type: 'json_object' },
              temperature: 0.7,
              max_tokens: 3000,
            }),
            signal: controller.signal,
          }),
          DIALOGUE_PROVIDER_TIMEOUT_MS,
          `OpenRouter dialogue generation (${model})`,
        );
        if (timeout) clearTimeout(timeout);

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.warn('OpenRouter dialogue model failed:', model, response.status, String(payload?.error?.message || '').slice(0, 180));
          break;
        }

        const text = String(payload?.choices?.[0]?.message?.content || '{"scripts":[]}');
        const scripts = normalizeDialogueScripts(parseJsonResponse(text), count);
        if (scripts.length > bestScripts.length) bestScripts = scripts;
      }
      if (bestScripts.length) {
        console.info('OpenRouter dialogue fallback succeeded:', model);
        return { scripts: bestScripts, model };
      }
    } catch (error: any) {
      console.warn('OpenRouter dialogue fallback error:', model, String(error?.message || error).slice(0, 180));
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  return { scripts: [], model: '' };
};

const generateDialogueScriptsWithGroq = async (prompt: string, count: number, modelChoices = GROQ_DIALOGUE_MODELS) => {
  const key = process.env.GROQ_API_KEY;
  if (!key || isDisabled(process.env.GROQ_ENABLED)) return { scripts: [], model: '' };

  for (const model of modelChoices) {
    let timeout: NodeJS.Timeout | undefined;
    try {
      let bestScripts: any[] = [];
      for (let attempt = 0; attempt < 2 && bestScripts.length < count; attempt += 1) {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), DIALOGUE_PROVIDER_TIMEOUT_MS);
        const response = await withTimeout(
          fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [{
                role: 'user',
                content: attempt === 0
                  ? prompt
                  : `${prompt}\n\nYour previous output returned only ${bestScripts.length} usable scripts. Return exactly ${count} fresh, non-duplicative scripts. Do not reuse weak generic lines.`,
              }],
              response_format: { type: 'json_object' },
              temperature: 0.7,
              max_completion_tokens: 3000,
            }),
            signal: controller.signal,
          }),
          DIALOGUE_PROVIDER_TIMEOUT_MS,
          `Groq dialogue generation (${model})`,
        );
        if (timeout) clearTimeout(timeout);

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.warn('Groq dialogue model failed:', model, response.status, String(payload?.error?.message || '').slice(0, 180));
          break;
        }

        const text = String(payload?.choices?.[0]?.message?.content || '{"scripts":[]}');
        const scripts = normalizeDialogueScripts(parseJsonResponse(text), count);
        if (scripts.length > bestScripts.length) bestScripts = scripts;
      }
      if (bestScripts.length) {
        console.info('Groq dialogue fallback succeeded:', model);
        return { scripts: bestScripts, model };
      }
    } catch (error: any) {
      console.warn('Groq dialogue fallback error:', model, String(error?.message || error).slice(0, 180));
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  return { scripts: [], model: '' };
};

const fillDialogueScripts = (scripts: any[], count: number, creativeBrief: any = {}) => {
  const fallbacks = fallbackDialogueScripts(count, creativeBrief);
  const combined = [...scripts];
  for (const fallback of fallbacks) {
    if (combined.length >= count) break;
    if (!combined.some((script) => script.title === fallback.title)) {
      combined.push(fallback);
    }
  }
  return combined.slice(0, count);
};

const providerUnavailable = (error: any) => {
  const status = Number(error?.status || error?.code || 0);
  return status === 403 || status === 429 || status === 503 || /timed out|UNAVAILABLE|high demand/i.test(String(error?.message || ''));
};

export const generateDialogueScriptsResponse = async (body: any) => {
  const { creativeBrief, persona = 'Dental practice owner', count = 5 } = body || {};
  const requestedCount = Math.min(5, Math.max(1, Number(count) || 5));
  const generationCount = Math.min(8, requestedCount + 3);
  const selectedModel = normalizeDialogueModelChoice(body?.model);
  const selectedProvider = getDialogueModelProvider(selectedModel);
  const selectedModelName = getDialogueModelName(selectedModel);
  const prompt = buildDialogueScriptsPrompt({ creativeBrief, persona, count: generationCount });

  try {
    if (selectedProvider === 'local') {
      return {
        scripts: fillDialogueScripts([], requestedCount, creativeBrief),
        fallback: true,
        provider: 'local',
        model: 'local',
        selectedModel,
        warning: 'Using local script options by request.',
      };
    }

    if (selectedProvider === 'auto') {
      const kimiResult = await generateDialogueScriptsWithOpenRouter(
        prompt,
        requestedCount,
        OPENROUTER_PREMIUM_DIALOGUE_MODELS,
      );
      if (kimiResult.scripts.length) {
        return {
          scripts: kimiResult.scripts,
          provider: 'openrouter',
          model: kimiResult.model,
          selectedModel,
        };
      }
    }

    if (selectedProvider === 'groq' || selectedProvider === 'auto') {
      const groqResult = await generateDialogueScriptsWithGroq(
        prompt,
        requestedCount,
        selectedProvider === 'groq' ? [selectedModelName] : GROQ_DIALOGUE_MODELS,
      );
      if (groqResult.scripts.length) {
        return {
          scripts: groqResult.scripts,
          provider: 'groq-free',
          model: groqResult.model,
          selectedModel,
        };
      }
      if (selectedProvider === 'groq') {
        throw new DialogueGenerationError(`Selected Groq model (${selectedModelName}) did not return usable scripts. Try another model or try again in a moment.`, 503, selectedModel);
      }
    }

    if (selectedProvider === 'openrouter' || selectedProvider === 'auto') {
      const openRouterResult = await generateDialogueScriptsWithOpenRouter(
        prompt,
        requestedCount,
        selectedProvider === 'openrouter' ? [selectedModelName] : OPENROUTER_FREE_DIALOGUE_MODELS,
        { requireFree: selectedProvider !== 'openrouter' },
      );
      if (openRouterResult.scripts.length) {
        return {
          scripts: openRouterResult.scripts,
          provider: 'openrouter-free',
          model: openRouterResult.model,
          selectedModel,
        };
      }
      if (selectedProvider === 'openrouter') {
        throw new DialogueGenerationError(`Selected OpenRouter model (${selectedModelName}) did not return usable scripts. Try another model or try again in a moment.`, 503, selectedModel);
      }
    }

    if (selectedProvider === 'gemini' && selectedModelName !== GEMINI_DIALOGUE_MODEL) {
      throw new DialogueGenerationError(`Selected Gemini model (${selectedModelName}) is not configured for dialogue scripts.`, 503, selectedModel);
    }

    if (selectedProvider === 'gemini' || selectedProvider === 'auto') {
      const key = process.env.GEMINI_API_KEY;
      if (!key || isDisabled(process.env.GEMINI_ENABLED)) {
        console.warn('Generate dialogue scripts using provider fallback: GEMINI_API_KEY is not set.');
        throw new DialogueGenerationError('AI script generation is not configured.', 503, selectedModel);
      }

      const ai = new GoogleGenAI({ apiKey: key });

      let scripts: any[] = [];

      for (let attempt = 0; attempt < 2 && scripts.length === 0; attempt += 1) {
        const response = await withTimeout(
          ai.models.generateContent({
            model: GEMINI_DIALOGUE_MODEL,
            contents: attempt === 0
              ? prompt
              : `${prompt}\n\nYour previous output failed quality checks. Return clean, fluent English only. Absolutely no em dashes, forced negation, staccato fragments, placeholder text, or keyboard-mash text.`,
            config: {
              responseMimeType: 'application/json',
            },
          }),
          DIALOGUE_PROVIDER_TIMEOUT_MS,
          'Gemini dialogue generation',
        );

        const text = response.text || '{"scripts":[]}';
        scripts = normalizeDialogueScripts(parseJsonResponse(text), requestedCount);
      }

      return {
        scripts,
        provider: 'gemini',
        model: GEMINI_DIALOGUE_MODEL,
        selectedModel,
      };
    }

    throw new DialogueGenerationError('AI script generation is not configured.', 503, selectedModel);
  } catch (error: any) {
    if (error instanceof DialogueGenerationError) throw error;
    if (providerUnavailable(error)) {
      throw new DialogueGenerationError('AI script generation is temporarily unavailable. Try again in a moment.', 503, selectedModel);
    }
    throw error;
  }
};

const pcmBase64ToWavBase64 = (pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16) => {
  const pcm = Buffer.from(pcmBase64, 'base64');
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]).toString('base64');
};

export const generateDialogueAudioResponse = async (body: any) => {
  const { script } = body || {};

  if (!script?.lines?.length) {
    throw new DialogueGenerationError('No script lines provided.', 400);
  }

  const speakers = Array.from(new Set(script.lines.map((line: any) => String(line.speaker || 'Speaker').trim()).filter(Boolean))).slice(0, 2) as string[];
  while (speakers.length < 2) speakers.push(`Speaker ${speakers.length + 1}`);
  const cleanedLines = script.lines.map((line: any) => ({
    ...line,
    text: cleanHumanDialogueText(line.text),
  }));
  const ttsText = `Read this as a natural, subtle, two-person conversation for a Meta ad. Keep it conversational and not salesy. Do not add em dashes, choppy dramatic pauses, forced contrast phrasing, or robotic cadence.\n\n${cleanedLines.map((line: any) => `${line.speaker}: [${line.tone || 'natural'}] ${line.text}`).join('\n')}`;
  const baseFilename = `${(script.title || 'conversation-ad').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'conversation-ad'}`;

  const key = process.env.GEMINI_API_KEY;
  if (!key || isDisabled(process.env.GEMINI_ENABLED)) {
    throw new DialogueGenerationError('Gemini 3.1 Flash TTS is not configured. Add GEMINI_API_KEY and set TTS_ENABLED=true.', 503);
  }
  if ((process.env.TTS_MODEL || PINNED_TTS_MODEL) !== PINNED_TTS_MODEL) {
    throw new DialogueGenerationError(`Speech generation is pinned to ${PINNED_TTS_MODEL}. Remove the TTS_MODEL override or set it to ${PINNED_TTS_MODEL}.`, 503);
  }

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: PINNED_TTS_MODEL,
    contents: [{ parts: [{ text: ttsText }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: speakers[0],
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Zephyr' },
              },
            },
            {
              speaker: speakers[1],
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Puck' },
              },
            },
          ],
        },
      },
    },
  } as any);

  const part = response.candidates?.[0]?.content?.parts?.find((candidatePart: any) => candidatePart.inlineData);
  const inlineData = part?.inlineData;
  if (!inlineData?.data) {
    throw new DialogueGenerationError('No audio returned from Gemini TTS.', 500);
  }

  const mimeType = inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000';
  const normalizedMimeType = mimeType.toLowerCase();
  const sampleRateMatch = normalizedMimeType.match(/rate=(\d+)/);
  const sampleRate = sampleRateMatch ? Number(sampleRateMatch[1]) : 24000;
  const channelsMatch = normalizedMimeType.match(/channels=(\d+)/);
  const channels = channelsMatch ? Number(channelsMatch[1]) : 1;
  const isPcm = normalizedMimeType.includes('audio/l16') || normalizedMimeType.includes('pcm');
  const audioBase64 = isPcm ? pcmBase64ToWavBase64(inlineData.data, sampleRate, channels) : inlineData.data;

  return {
    audioBase64,
    mimeType: isPcm ? 'audio/wav' : mimeType,
    filename: `${baseFilename}.wav`,
    provider: 'gemini',
    model: PINNED_TTS_MODEL,
  };
};
