import type { DialogueScript } from '@/features/audio/dialogueScripts';
import type { AdCopyResult } from '@/features/research/adCopy';
import type { ResearchQuality } from '@/features/research/researchQuality';
import type { WebsiteResearch } from '@/features/research/websiteResearch';
import type { AdScene } from './scene';

export type CreateSceneResponse = {
  adCopy?: AdCopyResult;
  scene?: AdScene;
  research?: WebsiteResearch;
  quality?: ResearchQuality;
  error?: string;
};

export type AudioScriptsResponse = {
  scripts?: DialogueScript[];
  sourceSceneId?: string;
  error?: string;
};

export type CreateAudioResponse = {
  audioUrl?: string;
  storageId?: string;
  mimeType?: string;
  transcript?: string;
  captions?: AdScene['audio']['captions'];
  durationMs?: number;
  sourceSceneId?: string;
  scriptId?: string;
  error?: string;
};

export type ShareSceneResponse = {
  shareUrl?: string;
  error?: string;
};

export type RenderSceneTicketResponse = {
  downloadUrl?: string;
  error?: string;
};
