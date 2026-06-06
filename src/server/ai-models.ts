export const HEADLINE_VARIATION_MODEL = 'gemini-3.1-flash-lite';
export const GROQ_DIALOGUE_MODELS = [
  'llama-3.3-70b-versatile',
  'qwen/qwen3-32b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.1-8b-instant',
];
export const OPENROUTER_PREMIUM_DIALOGUE_MODELS = [
  'moonshotai/kimi-k2.6',
  'moonshotai/kimi-k2.6:free',
];
export const OPENROUTER_FREE_DIALOGUE_MODELS = [
  'liquid/lfm-2.5-1.2b-instruct:free',
  'openai/gpt-oss-20b:free',
  'openrouter/auto:free',
];
export const DIALOGUE_PROVIDER_TIMEOUT_MS = 25000;
export const GEMINI_DIALOGUE_MODEL = 'gemini-3-flash-preview';
export const PINNED_TTS_MODEL = 'gemini-3.1-flash-tts-preview';
export const DIALOGUE_MODEL_OPTIONS = new Set([
  'auto',
  'local',
  `gemini:${GEMINI_DIALOGUE_MODEL}`,
  ...GROQ_DIALOGUE_MODELS.map((model) => `groq:${model}`),
  ...OPENROUTER_PREMIUM_DIALOGUE_MODELS.map((model) => `openrouter:${model}`),
  ...OPENROUTER_FREE_DIALOGUE_MODELS.map((model) => `openrouter:${model}`),
]);
export const HEADLINE_MODEL_OPTIONS = new Set([
  'auto',
  'local',
  `gemini:${HEADLINE_VARIATION_MODEL}`,
  ...GROQ_DIALOGUE_MODELS.map((model) => `groq:${model}`),
  ...OPENROUTER_FREE_DIALOGUE_MODELS.map((model) => `openrouter:${model}`),
]);
export const HEADLINE_VARIATION_TIMEOUT_MS = 20000;
