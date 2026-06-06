import { GoogleGenAI } from '@google/genai';
import { buildHeadlineVariationsPrompt, type ConversationAdLine, type GeneratedAdFormat, type HeadlineVariation } from '../lib/prompts/headline-variations';
import { normalizeAdAngles } from '../lib/prompts/ad-angles';
import {
  ACTIVE_GENERATED_FORMATS,
  isGeneratedAdFormat,
} from '../features/formats/registry';
import {
  cleanTextField,
  normalizeBrandBrain,
  parseJsonResponse,
  withTimeout,
  type BrandBrain,
} from './brand-research';
import {
  GROQ_DIALOGUE_MODELS,
  HEADLINE_MODEL_OPTIONS,
  HEADLINE_VARIATION_MODEL,
  HEADLINE_VARIATION_TIMEOUT_MS,
  OPENROUTER_FREE_DIALOGUE_MODELS,
} from './ai-models';

const isDisabled = (value: string | undefined) => ['0', 'false', 'off', 'no'].includes(String(value || '').trim().toLowerCase());
const normalizeHeadline = (value: unknown) => cleanTextField(value, 96)
  .replace(/["“”]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const headlineWordCount = (headline: string) => headline.split(/\s+/).filter(Boolean).length;

const isUsableHeadline = (headline: string, brandBrain: BrandBrain, previous: Set<string>) => {
  const words = headlineWordCount(headline);
  if (words < 4 || words > 12) return false;
  const lower = headline.toLowerCase();
  if (previous.has(lower)) return false;
  if (/\bwiggly\b/i.test(headline)) return false;
  if (/^why\s+(people|customers|clients|shoppers|buyers)\s+choose\b/i.test(headline)) return false;
  if (/^what\s+makes\b.+\bworth\s+(noticing|choosing|trying)\b/i.test(headline)) return false;
  if (/\b(one\s+clear\s+reason|useful\s+part\s+of|should\s+be\s+easy\s+to\s+understand)\b/i.test(headline)) return false;
  if (/\b(before\s+they\s+scroll|reason\s+to\s+stop\s+scrolling|first\s+frame|the\s+hook)\b/i.test(headline)) return false;
  if (/^(show|make|turn|lead\s+with|start\s+with|give)\b/i.test(headline) && /\b(ad|offer|proof|pitch|hook|first frame|reason|decision)\b/i.test(headline)) return false;
  if (/\b(they|people|buyers|shoppers|customers|clients|patients)\s+need\s+a\s+clear\b/i.test(headline)) return false;
  if (/\bneed\s+a\s+clear\s+is\b/i.test(headline)) return false;
  if (/\b[a-z]+\s+is\s+getting expensive$/i.test(headline) && words < 6) return false;
  if (/\b(hijack|hack|steal|trick|game|exploit|dominate)\b/i.test(headline)) return false;
  return !(brandBrain.bannedGenericPhrases || []).some((phrase) => phrase && lower.includes(phrase.toLowerCase()));
};

const normalizeFormatMix = (value: unknown): GeneratedAdFormat[] => {
  if (!Array.isArray(value)) return [...ACTIVE_GENERATED_FORMATS];
  const formats = value
    .map((item) => String(item || '').trim())
    .filter(isGeneratedAdFormat)
    .filter((item, index, list) => list.indexOf(item) === index);
  return formats.length ? formats : [...ACTIVE_GENERATED_FORMATS];
};

const pickGeneratedAdFormat = (formats: GeneratedAdFormat[], index: number): GeneratedAdFormat => {
  if (formats.length === 1) return formats[0];
  if (formats.includes('conversation') && formats.includes('visualizer')) {
    return index % 3 === 1 ? 'conversation' : 'visualizer';
  }
  return formats[index % formats.length] || 'visualizer';
};

const shortConversationPhrase = (value: unknown, fallback: string) => {
  const phrase = cleanTextField(value, 140)
    .replace(/[^\w\s$%'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return phrase.split(/\s+/).filter(Boolean).slice(0, 10).join(' ') || fallback;
};

const buildConversationLines = (brandBrain: BrandBrain, headline: string, angle: string, index: number): ConversationAdLine[] => {
  const pain = shortConversationPhrase(brandBrain.pain, 'this problem keeps showing up');
  const offer = shortConversationPhrase(brandBrain.offer, 'the better option');
  const result = shortConversationPhrase(brandBrain.promisedResult, 'the outcome people want');
  const differentiator = shortConversationPhrase(brandBrain.differentiator, 'the part that makes it easier');
  const audience = shortConversationPhrase(brandBrain.audience, 'the people this is for');
  const proof = (brandBrain.proof || []).map((item) => shortConversationPhrase(item, '')).filter(Boolean);
  const proofLine = proof[index % Math.max(proof.length, 1)] || differentiator;
  const starters = [
    `I keep seeing ${pain}.`,
    `${audience} are tired of ${pain}.`,
    `This is the part people usually ignore.`,
  ];
  const reveals = [
    `${offer} makes ${result} feel easier.`,
    `The hook is simple, ${proofLine}.`,
    `${differentiator} is the thing worth showing first.`,
  ];
  const followUps = [
    `So the ad should say ${headline.toLowerCase()}?`,
    `That is more specific than another generic product claim.`,
    `That gives people a reason to stop scrolling.`,
  ];
  const closers = [
    `Exactly. Make the angle obvious before they scroll.`,
    `Yes. Show the useful part, then let the voice carry it.`,
    `Right. The finished ad should feel ready to test.`,
  ];

  return [
    { speaker: 'Alex', text: starters[index % starters.length] },
    { speaker: 'Jordan', text: reveals[index % reveals.length] },
    { speaker: 'Alex', text: followUps[index % followUps.length] },
    { speaker: 'Jordan', text: closers[index % closers.length] },
  ];
};

const fallbackHeadlines = (brandBrain: BrandBrain, count: number, previous: Set<string>): HeadlineVariation[] => {
  const angles = normalizeAdAngles(brandBrain);
  const seen = new Set(previous);
  const shortPhrase = (value: unknown, maxWords: number, fallback: string) => {
    const phrase = cleanTextField(value, 90)
      .replace(/[^\w\s$%'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = phrase.split(/\s+/).filter(Boolean);
    const clipped = words.slice(0, maxWords).join(' ');
    if (/^(they|people|buyers|shoppers|customers|clients|patients)\s+need\s+a\s+clear\b/i.test(clipped)) return fallback;
    if (/\bneed\s+a\s+clear$/i.test(clipped)) return fallback;
    return clipped || fallback;
  };
  const proof = (brandBrain.proof || []).map((item) => shortPhrase(item, 5, '')).filter(Boolean).slice(0, 8);
  const brandName = (cleanTextField(brandBrain.businessName, 42) || 'Your brand').split(':')[0]?.trim() || 'Your brand';
  const briefText = `${brandName} ${brandBrain.offer} ${brandBrain.audience} ${brandBrain.pain} ${brandBrain.differentiator}`.toLowerCase();
  const isMedspa = /\b(medspa|skin|laser|aesthetic|rejuvenation|botox|facial|acne)\b/.test(briefText);
  const isFood = /\b(cookie|cookies|bakery|baked|dessert|cheesecake|cake|cakes|brownie|brownies|gift|gifting|delivery|snack|sweet)\b/.test(briefText);
  const isAthleticWear = /\b(nike|athlete|athletes|sport|sports|training|running|runner|basketball|workout|gym|activewear|apparel|footwear|shoe|shoes|sneaker|sneakers|gear)\b/.test(briefText);
  const isPublicConversation = /\b(public conversation|global town square|breaking news|news sharing|real-time|real time|world leaders|creators|journalists|culture|markets)\b/.test(briefText);
  const categoryTemplates = isPublicConversation ? [
    'News before it becomes news',
    'The conversation starts before the recap',
    'Where culture moves in real time',
    'Public conversation while it is still moving',
    'A front row seat to live events',
    'Hear it from the people involved',
    'The room where the internet reacts first',
    'Breaking context without the delay',
    'Follow the signal before the summary',
    'The feed where markets feel it first',
    'Real-time reactions before the headlines',
    'The town square never waits',
    'Creators watch the room here',
    'The update before the article',
    'Conversation before the media cycle',
    `${brandName} shows the room in real time`,
    `${brandName} moves before the recap`,
    `${brandName} is where culture reacts`,
    `${brandName} makes public conversation instant`,
  ] : isMedspa ? [
    'Know your skin treatment before you book',
    'Premium skin care should feel clear',
    'Choose the treatment your skin actually needs',
    'Smoother skin starts with the right plan',
    'Laser care without the guessing',
    'Make your next skin visit feel obvious',
    `${brandName} makes skin care feel guided`,
    `Book ${brandName} with more confidence`,
    'The right medspa choice starts here',
    'Stop guessing which treatment fits',
    'Skin goals deserve a clearer plan',
    'Feel confident before your appointment',
    'A better skin consult starts here',
    'Make the next treatment choice simple',
    'Premium laser care without the confusion',
    'Turn skin goals into a clearer plan',
    'The medspa visit should feel guided',
    'Know what to book before you book',
    'Clearer skin decisions start here',
    'Show the treatment before the pitch',
    'Your skin plan should feel personal',
    'A premium skin visit starts with clarity',
    'Make the consultation feel easy',
    'Give skin goals a smarter next step',
  ] : isFood ? [
    'Cookies that arrive ready to impress',
    'Send dessert without overthinking it',
    'The gift that actually gets opened',
    'Fresh cookies beat another boring gift',
    'Make the dessert table disappear first',
    'Warm cookie energy without the baking',
    'Give them cookies they remember',
    'Skip the card and send cookies',
    'Cookie delivery for the sweet tooth',
    'A better gift starts with dessert',
    'Dessert delivery should feel this easy',
    'The cookie box everyone notices',
    'Bring the bakery feeling home',
    'Make the thank you taste better',
    'Cookies make the occasion easier',
    'A sweeter way to show up',
    'Send the treat they actually want',
    'The easiest yes is dessert',
    'Make cookie delivery feel special',
    `${brandName} delivers the good part`,
    `${brandName} makes gifting sweeter`,
    `${brandName} brings dessert to them`,
    `${brandName} turns delivery into dessert`,
    `${brandName} makes cookies giftable`,
  ] : isAthleticWear ? [
    'Gear that keeps up with your pace',
    'Train like the outfit is ready',
    'The run starts before the first step',
    'Built for the days you show up',
    'Performance gear with everyday style',
    'Move better in gear that works',
    'Your workout deserves better gear',
    'From warmup to whatever comes next',
    'Shoes that make movement feel easier',
    'Athletic style that earns the miles',
    'Ready for the run and the rest',
    'Dress like the workout already started',
    'The gear should never slow you down',
    'Made for motion, worn all day',
    'Feel ready before you start moving',
    'The next workout starts with gear',
    `${brandName} gear built for movement`,
    `${brandName} makes training feel ready`,
    `${brandName} brings performance into everyday style`,
    `${brandName} keeps pace with the work`,
    `${brandName} turns gear into momentum`,
  ] : [
    `Choose ${brandName} with more confidence`,
    `A sharper reason to try ${brandName}`,
    `${brandName} makes the next step easier`,
    `${brandName} turns confusion into clarity`,
    `${brandName} helps people choose faster`,
    `${brandName} gives the problem a cleaner answer`,
    `${brandName} makes the old way feel outdated`,
  ];
  const templates = [
    ...categoryTemplates,
    `Make ${brandName} easy to trust`,
    `Make the next step feel simple`,
    `The old workaround is expensive`,
    `Make the hard part visible`,
  ];

  proof.forEach((proofPoint) => {
    templates.push(`${proofPoint} makes the choice easier`);
    templates.push(`${proofPoint} is worth remembering`);
  });
  angles.forEach((angle) => {
    const clippedAngle = shortPhrase(angle, 5, '');
    if (!clippedAngle) return;
    templates.push(`Make ${clippedAngle} feel obvious`);
  });

  const fallbacks: HeadlineVariation[] = [];
  const addHeadline = (value: string) => {
    if (fallbacks.length >= count) return;
    const headline = normalizeHeadline(value);
    if (!isUsableHeadline(headline, brandBrain, seen)) return;
    seen.add(headline.toLowerCase());
    fallbacks.push({
      id: `fallback-${fallbacks.length + 1}`,
      angle: angles[fallbacks.length % Math.max(angles.length, 1)] || 'core promise',
      headline,
    });
  };

  templates.forEach(addHeadline);
  let safety = 1;
  while (fallbacks.length < count && safety <= count * 3) {
    addHeadline(`A sharper reason to stop scrolling ${safety}`);
    safety += 1;
  }

  return fallbacks.slice(0, count);
};

const normalizeHeadlineModelChoice = (value: unknown) => {
  const choice = String(value || 'auto').trim();
  return HEADLINE_MODEL_OPTIONS.has(choice) ? choice : 'auto';
};

const getHeadlineModelProvider = (choice: string) => {
  if (choice === 'local') return 'local';
  if (choice.startsWith('groq:')) return 'groq';
  if (choice.startsWith('openrouter:')) return 'openrouter';
  if (choice.startsWith('gemini:')) return 'gemini';
  return 'auto';
};

const getHeadlineModelName = (choice: string) => choice.split(':').slice(1).join(':');

const normalizeHeadlineVariations = (value: any) => {
  const parsed = Array.isArray(value) ? value : value?.variations || [];
  return Array.isArray(parsed) ? parsed : [];
};

const generateHeadlineVariationsWithGroq = async (brandBrain: BrandBrain, count: number, modelChoices = GROQ_DIALOGUE_MODELS) => {
  const key = process.env.GROQ_API_KEY;
  if (!key || isDisabled(process.env.GROQ_ENABLED)) return { variations: [], model: '' };
  const prompt = buildHeadlineVariationsPrompt({ brandBrain, count });

  for (const model of modelChoices) {
    let timeout: NodeJS.Timeout | undefined;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), HEADLINE_VARIATION_TIMEOUT_MS);
      const response = await withTimeout(
        fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_completion_tokens: 3000,
          }),
          signal: controller.signal,
        }),
        HEADLINE_VARIATION_TIMEOUT_MS,
        `Groq headline generation (${model})`,
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.warn('Groq headline model failed:', model, response.status, String(payload?.error?.message || '').slice(0, 180));
        continue;
      }

      const text = String(payload?.choices?.[0]?.message?.content || '{"variations":[]}');
      const variations = normalizeHeadlineVariations(parseJsonResponse(text));
      if (variations.length) {
        console.info('Groq headline generation succeeded:', model);
        return { variations, model };
      }
    } catch (error: any) {
      console.warn('Groq headline generation error:', model, String(error?.message || error).slice(0, 180));
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  return { variations: [], model: '' };
};

const generateHeadlineVariationsWithOpenRouter = async (brandBrain: BrandBrain, count: number, modelChoices = OPENROUTER_FREE_DIALOGUE_MODELS) => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || isDisabled(process.env.OPENROUTER_ENABLED)) return { variations: [], model: '' };
  const prompt = buildHeadlineVariationsPrompt({ brandBrain, count });

  for (const model of modelChoices) {
    if (!model.endsWith(':free')) continue;
    let timeout: NodeJS.Timeout | undefined;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), HEADLINE_VARIATION_TIMEOUT_MS);
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
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 3000,
          }),
          signal: controller.signal,
        }),
        HEADLINE_VARIATION_TIMEOUT_MS,
        `OpenRouter headline generation (${model})`,
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.warn('OpenRouter headline model failed:', model, response.status, String(payload?.error?.message || '').slice(0, 180));
        continue;
      }

      const text = String(payload?.choices?.[0]?.message?.content || '{"variations":[]}');
      const variations = normalizeHeadlineVariations(parseJsonResponse(text));
      if (variations.length) {
        console.info('OpenRouter headline generation succeeded:', model);
        return { variations, model };
      }
    } catch (error: any) {
      console.warn('OpenRouter headline generation error:', model, String(error?.message || error).slice(0, 180));
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  return { variations: [], model: '' };
};

const generateHeadlineVariationsWithGemini = async (brandBrain: BrandBrain, count: number) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || isDisabled(process.env.GEMINI_ENABLED)) throw new Error('GEMINI_API_KEY is not set.');
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await withTimeout(ai.models.generateContent({
    model: HEADLINE_VARIATION_MODEL,
    contents: buildHeadlineVariationsPrompt({ brandBrain, count }),
    config: {
      responseMimeType: 'application/json',
    },
  }), HEADLINE_VARIATION_TIMEOUT_MS, 'Headline generation');
  const parsed = parseJsonResponse(response.text || '{"variations": []}');
  return {
    variations: normalizeHeadlineVariations(parsed),
    model: HEADLINE_VARIATION_MODEL,
  };
};

const generateHeadlineVariations = async (brandBrain: BrandBrain, count: number, modelChoice = 'auto') => {
  const selectedModel = normalizeHeadlineModelChoice(modelChoice);
  const selectedProvider = getHeadlineModelProvider(selectedModel);
  const selectedModelName = getHeadlineModelName(selectedModel);

  if (selectedProvider === 'local') {
    return { variations: [], provider: 'local', model: 'local', selectedModel, fallback: true };
  }

  if (selectedProvider === 'groq' || selectedProvider === 'auto') {
    const result = await generateHeadlineVariationsWithGroq(
      brandBrain,
      count,
      selectedProvider === 'groq' ? [selectedModelName] : GROQ_DIALOGUE_MODELS,
    );
    if (result.variations.length) {
      return { variations: result.variations, provider: 'groq-free', model: result.model, selectedModel };
    }
    if (selectedProvider === 'groq') {
      return { variations: [], provider: 'local', model: 'local', selectedModel, fallback: true };
    }
  }

  if (selectedProvider === 'openrouter' || selectedProvider === 'auto') {
    const result = await generateHeadlineVariationsWithOpenRouter(
      brandBrain,
      count,
      selectedProvider === 'openrouter' ? [selectedModelName] : OPENROUTER_FREE_DIALOGUE_MODELS,
    );
    if (result.variations.length) {
      return { variations: result.variations, provider: 'openrouter-free', model: result.model, selectedModel };
    }
    if (selectedProvider === 'openrouter') {
      return { variations: [], provider: 'local', model: 'local', selectedModel, fallback: true };
    }
  }

  if (selectedProvider === 'gemini' && selectedModelName !== HEADLINE_VARIATION_MODEL) {
    return { variations: [], provider: 'local', model: 'local', selectedModel, fallback: true };
  }

  if (selectedProvider === 'gemini' || selectedProvider === 'auto') {
    const result = await generateHeadlineVariationsWithGemini(brandBrain, count);
    if (result.variations.length) {
      return { variations: result.variations, provider: 'gemini', model: result.model, selectedModel };
    }
  }

  return { variations: [], provider: 'local', model: 'local', selectedModel, fallback: true };
};

export class AdGenerationError extends Error {
  status: number;

  constructor(message: string, status = 503) {
    super(message);
    this.name = 'AdGenerationError';
    this.status = status;
  }
}

export const generateAdStreamResponse = async (body: any) => {
  const rawBrandBrain = body?.brandBrain;
  if (!rawBrandBrain || typeof rawBrandBrain !== 'object') {
    throw new AdGenerationError('brandBrain is required.', 400);
  }

  const websiteUrl = cleanTextField(rawBrandBrain.websiteUrl, 240) || 'https://example.com';
  const brandBrain = normalizeBrandBrain(rawBrandBrain, websiteUrl, cleanTextField(rawBrandBrain.brandLogoUrl, 500));
  const totalCount = Math.min(50, Math.max(10, Number(body?.count) || 50));
  const formatMix = normalizeFormatMix(body?.formatMix);
  const selectedModel = normalizeHeadlineModelChoice(body?.model);
  const used = new Set<string>();
  const variations: HeadlineVariation[] = [];
  let provider = '';
  let model = '';

  let rawVariations: any[] = [];
  try {
    const generation = await generateHeadlineVariations(brandBrain, totalCount, selectedModel);
    rawVariations = generation.variations;
    provider = generation.provider;
    model = generation.model;
    if (generation.fallback) {
      throw new AdGenerationError('Ad writing failed before usable AI headlines were created. Try another model or try again in a moment.');
    }
  } catch (error) {
    if (error instanceof AdGenerationError) throw error;
    console.warn('[ad-stream] headline_generation_failed', error instanceof Error ? error.message : error);
    throw new AdGenerationError('Ad writing failed before usable AI headlines were created. Try another model or try again in a moment.');
  }

  rawVariations.forEach((item) => {
    const headline = normalizeHeadline(item?.headline ?? item?.text ?? item);
    if (!isUsableHeadline(headline, brandBrain, used)) return;
    used.add(headline.toLowerCase());
    const format = pickGeneratedAdFormat(formatMix, variations.length);
    const angle = cleanTextField(item?.angle, 160) || normalizeAdAngles(brandBrain)[variations.length % normalizeAdAngles(brandBrain).length] || 'core promise';
    variations.push({
      id: `variation-${variations.length + 1}`,
      angle,
      headline,
      format,
      conversationLines: format === 'conversation'
        ? buildConversationLines(brandBrain, headline, angle, variations.length)
        : undefined,
    });
  });

  if (variations.length < totalCount) {
    fallbackHeadlines(brandBrain, totalCount - variations.length, used).forEach((item) => {
      const headline = normalizeHeadline(item.headline);
      if (!isUsableHeadline(headline, brandBrain, used)) return;
      used.add(headline.toLowerCase());
      const format = pickGeneratedAdFormat(formatMix, variations.length);
      variations.push({
        ...item,
        id: `variation-${variations.length + 1}`,
        headline,
        format,
        conversationLines: format === 'conversation'
          ? buildConversationLines(brandBrain, headline, item.angle, variations.length)
          : undefined,
      });
    });
  }

  if (!variations.length) {
    throw new AdGenerationError('Ad writing returned no usable headlines. Try another model or try again in a moment.');
  }

  return {
    brandBrain,
    variations: variations.slice(0, totalCount),
    provider,
    model,
    selectedModel,
    fallback: false,
  };
};
