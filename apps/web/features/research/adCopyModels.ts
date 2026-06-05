export const DEFAULT_AD_COPY_MODEL_CHOICE = 'auto' as const;

export const AD_COPY_MODEL_CHOICES = [
  {
    value: DEFAULT_AD_COPY_MODEL_CHOICE,
    label: 'Auto best available (Auto)',
    provider: 'auto',
    model: null,
  },
  {
    value: 'kimi-k2.6-free',
    label: 'Kimi K2.6 Free (OpenRouter)',
    provider: 'openrouter',
    model: 'moonshotai/kimi-k2.6:free',
  },
  {
    value: 'llama-3.3-70b-free',
    label: 'Llama 3.3 70B Free (OpenRouter)',
    provider: 'openrouter',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
  },
] as const;

export type AdCopyModelChoice = typeof AD_COPY_MODEL_CHOICES[number]['value'];

export type ResolvedAdCopyModel = {
  choice: AdCopyModelChoice;
  label: string;
  model: string | null;
  provider: 'auto' | 'openrouter';
};

const modelChoicesByValue = new Map(
  AD_COPY_MODEL_CHOICES.map((choice) => [choice.value, choice]),
);

export const parseAdCopyModelChoice = (value: unknown): AdCopyModelChoice | null => {
  if (value === undefined || value === null || value === '') return DEFAULT_AD_COPY_MODEL_CHOICE;
  if (typeof value !== 'string') return null;
  return modelChoicesByValue.has(value as AdCopyModelChoice) ? value as AdCopyModelChoice : null;
};

export const resolveAdCopyModel = (
  choice: AdCopyModelChoice,
  environmentModel = process.env.OPENROUTER_AD_MODEL || '',
): ResolvedAdCopyModel => {
  const config = modelChoicesByValue.get(choice) ?? modelChoicesByValue.get(DEFAULT_AD_COPY_MODEL_CHOICE)!;
  const model = config.model || environmentModel.trim() || null;

  return {
    choice: config.value,
    label: config.label,
    model,
    provider: config.provider,
  };
};
