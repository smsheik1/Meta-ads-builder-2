import { DEFAULT_NVIDIA_NIM_MODEL } from "./nvidiaNim";

export const DEFAULT_NVIDIA_NIM_AD_IDEA_MODEL = DEFAULT_NVIDIA_NIM_MODEL;
export const DEFAULT_NVIDIA_NIM_BRAND_CURATOR_MODEL = DEFAULT_NVIDIA_NIM_MODEL;
export const DEFAULT_NVIDIA_NIM_MEME_MODEL = DEFAULT_NVIDIA_NIM_MODEL;
export const DEFAULT_NVIDIA_NIM_JINGLE_MODEL = DEFAULT_NVIDIA_NIM_MODEL;
export const DEFAULT_NVIDIA_NIM_VIDEO_MEME_MODEL = DEFAULT_NVIDIA_NIM_MODEL;
export const DEFAULT_NVIDIA_NIM_VISUALIZER_MODEL = DEFAULT_NVIDIA_NIM_MODEL;
export const DEFAULT_NVIDIA_NIM_WERE_SORRY_MODEL = DEFAULT_NVIDIA_NIM_MODEL;
export const DEFAULT_NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL = DEFAULT_NVIDIA_NIM_MODEL;

export const NIM_MODEL_OPTIONS = [
  { id: "moonshotai/kimi-k2.6", label: "Kimi K2.6" },
  { id: "deepseek-ai/deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  { id: "deepseek-ai/deepseek-v4-pro", label: "DeepSeek V4 Pro" },
  { id: "meta/llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick" },
  { id: "qwen/qwen3.5-122b-a10b", label: "Qwen 3.5 122B" },
] as const;

export const NIM_MEME_MODEL_OPTIONS = NIM_MODEL_OPTIONS;
export const NIM_VISUALIZER_MODEL_OPTIONS = NIM_MODEL_OPTIONS;
