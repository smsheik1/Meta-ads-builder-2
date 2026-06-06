import { useEffect, useState } from 'react';
import type { Caption } from '../../store';
import {
  captionsFromDialogueScript,
  cleanDialogueScriptForVoiceover,
  cloneDialogueScript,
  type ConversationWizardStep,
  type CreativeBrief,
  type DialogueLine,
  type DialogueScript,
} from './createVoiceScripts';

type GeneratedVoiceAudioPayload = {
  url: string;
  filename: string;
  blob: Blob;
  captions: Caption[];
};

type CreateVoiceControllerOptions = {
  creativeBrief: CreativeBrief;
  personaLabel: string;
  briefCompletion: number;
  requiredBriefFields: number;
  onBeforeOpenWizard: () => void;
  onGeneratedVoiceAudio: (payload: GeneratedVoiceAudioPayload) => Promise<void> | void;
};

const getObjectAudioDuration = (url: string) => new Promise<number>((resolve) => {
  const audio = new Audio(url);
  const timeout = window.setTimeout(() => resolve(0), 1500);
  audio.preload = 'metadata';
  audio.onloadedmetadata = () => {
    window.clearTimeout(timeout);
    resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
  };
  audio.onerror = () => {
    window.clearTimeout(timeout);
    resolve(0);
  };
  audio.src = url;
});

export const useCreateVoiceController = ({
  creativeBrief,
  personaLabel,
  briefCompletion,
  requiredBriefFields,
  onBeforeOpenWizard,
  onGeneratedVoiceAudio,
}: CreateVoiceControllerOptions) => {
  const [dialogueScripts, setDialogueScripts] = useState<DialogueScript[]>([]);
  const [conversationWizardOpen, setConversationWizardOpen] = useState(false);
  const [conversationWizardStep, setConversationWizardStep] = useState<ConversationWizardStep>('brief');
  const [selectedDialogueScriptIndex, setSelectedDialogueScriptIndex] = useState(0);
  const [lastDialogueScriptBriefKey, setLastDialogueScriptBriefKey] = useState('');
  const [draftDialogueScript, setDraftDialogueScript] = useState<DialogueScript | null>(null);
  const [previewingDialogueKey, setPreviewingDialogueKey] = useState<string | null>(null);
  const [isGeneratingDialogueScripts, setIsGeneratingDialogueScripts] = useState(false);
  const [isGeneratingDialogueAudio, setIsGeneratingDialogueAudio] = useState(false);
  const [generatedDialogueAudioUrl, setGeneratedDialogueAudioUrl] = useState<string | null>(null);

  useEffect(() => () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const clearGeneratedDialogueAudio = () => {
    setGeneratedDialogueAudioUrl(null);
  };

  const stopDialoguePreview = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPreviewingDialogueKey(null);
  };

  const playDialoguePreview = (script: DialogueScript, key: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Voice preview is not available in this browser.');
      return;
    }

    if (previewingDialogueKey === key) {
      stopDialoguePreview();
      return;
    }

    const lines = script.lines.filter((line) => line.text.trim());
    if (!lines.length) return;

    window.speechSynthesis.cancel();
    setPreviewingDialogueKey(key);

    const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('en'));
    const speakers = Array.from(new Set(lines.map((line) => line.speaker).filter(Boolean))).slice(0, 2);
    let remainingLines = lines.length;

    lines.forEach((line) => {
      const utterance = new SpeechSynthesisUtterance(line.text.trim());
      const speakerIndex = speakers.indexOf(line.speaker);
      utterance.rate = 1.02;
      utterance.pitch = speakerIndex === 1 ? 0.92 : 1.08;
      utterance.voice = voices[speakerIndex === 1 ? 1 : 0] || voices[0] || null;
      utterance.onend = () => {
        remainingLines -= 1;
        if (remainingLines <= 0) setPreviewingDialogueKey(null);
      };
      utterance.onerror = () => {
        remainingLines -= 1;
        if (remainingLines <= 0) setPreviewingDialogueKey(null);
      };
      window.speechSynthesis.speak(utterance);
    });
  };

  const openConversationWizard = () => {
    onBeforeOpenWizard();
    const firstScript = dialogueScripts[selectedDialogueScriptIndex] || dialogueScripts[0];
    if (firstScript && !draftDialogueScript) {
      setDraftDialogueScript(cloneDialogueScript(firstScript));
      setSelectedDialogueScriptIndex(Math.max(0, dialogueScripts.indexOf(firstScript)));
    }
    setConversationWizardStep(dialogueScripts.length > 0 || briefCompletion >= requiredBriefFields ? 'scripts' : 'brief');
    setConversationWizardOpen(true);
  };

  const closeConversationWizard = () => {
    stopDialoguePreview();
    setConversationWizardOpen(false);
  };

  const selectDialogueScript = (script: DialogueScript, index: number) => {
    setSelectedDialogueScriptIndex(index);
    setDraftDialogueScript(cloneDialogueScript(script));
    setConversationWizardStep('edit');
  };

  const updateDraftDialogueLine = (index: number, patch: Partial<DialogueLine>) => {
    setDraftDialogueScript((current) => {
      if (!current) return current;
      return {
        ...current,
        lines: current.lines.map((line, lineIndex) => (
          lineIndex === index ? { ...line, ...patch } : line
        )),
      };
    });
  };

  const addDraftDialogueLine = () => {
    setDraftDialogueScript((current) => {
      if (!current) return current;
      const lastSpeaker = current.lines[current.lines.length - 1]?.speaker;
      const nextSpeaker = lastSpeaker === 'Ava' ? 'Sam' : 'Ava';
      return {
        ...current,
        lines: [
          ...current.lines,
          {
            speaker: nextSpeaker,
            tone: 'natural',
            text: '',
          },
        ],
      };
    });
  };

  const removeDraftDialogueLine = (index: number) => {
    setDraftDialogueScript((current) => {
      if (!current || current.lines.length <= 2) return current;
      return {
        ...current,
        lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
      };
    });
  };

  const getCreativeBriefCacheKey = () => {
    const persona = (personaLabel || 'Dental practice owner').trim().toLowerCase();
    const payload = {
      persona,
      ...creativeBrief,
    };
    return JSON.stringify(payload);
  };

  const generateDialogueScripts = async (openEditorAfterGenerate = false, force = false) => {
    const requestKey = getCreativeBriefCacheKey();
    if (!force && !openEditorAfterGenerate && dialogueScripts.length > 0 && lastDialogueScriptBriefKey === requestKey) {
      if (openEditorAfterGenerate) {
        setConversationWizardStep('scripts');
      } else if (conversationWizardStep === 'brief') {
        setConversationWizardStep('scripts');
      }
      return dialogueScripts;
    }

    try {
      setIsGeneratingDialogueScripts(true);
      const res = await fetch('/api/generate-dialogue-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creativeBrief,
          persona: personaLabel || 'Dental practice owner',
          count: 5,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      const data = await res.json();
      const scripts = Array.isArray(data.scripts) ? data.scripts : [];
      setDialogueScripts(scripts);
      setLastDialogueScriptBriefKey(requestKey);
      if (scripts[0]) {
        setSelectedDialogueScriptIndex(0);
        setDraftDialogueScript(cloneDialogueScript(scripts[0]));
        setConversationWizardStep(openEditorAfterGenerate ? 'edit' : 'scripts');
      }
      return scripts;
    } catch (error: any) {
      console.error('Dialogue script generation failed:', error);
      alert(`Dialogue generation failed: ${error.message || 'Unknown error'}`.slice(0, 180));
      return [];
    } finally {
      setIsGeneratingDialogueScripts(false);
    }
  };

  const generateDialogueAudio = async (script: DialogueScript) => {
    try {
      stopDialoguePreview();
      const voiceoverScript = cleanDialogueScriptForVoiceover(script);
      setIsGeneratingDialogueAudio(true);
      const res = await fetch('/api/generate-dialogue-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: voiceoverScript }),
      });

      if (!res.ok) {
        const rawText = await res.text();
        let parsed: { error?: string } | null = null;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          parsed = null;
        }
        const parsedError = parsed?.error;
        const parsedMessage = typeof parsedError === 'string'
          ? parsedError
          : parsedError && typeof parsedError === 'object'
            ? JSON.stringify(parsedError)
            : rawText;
        throw new Error(parsedMessage || 'Audio generation failed');
      }

      const data = await res.json();
      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audioDuration = await getObjectAudioDuration(url);
      const captions = captionsFromDialogueScript(voiceoverScript, audioDuration);
      setGeneratedDialogueAudioUrl(url);
      await onGeneratedVoiceAudio({
        url,
        filename: data.filename || `${voiceoverScript.title || 'conversation-ad'}.wav`,
        blob,
        captions,
      });
      setConversationWizardOpen(false);
    } catch (error: any) {
      console.error('Dialogue audio generation failed:', error);
      alert(`Audio generation failed: ${error.message || 'Unknown error'}`.slice(0, 180));
    } finally {
      setIsGeneratingDialogueAudio(false);
    }
  };

  return {
    dialogueScripts,
    conversationWizardOpen,
    conversationWizardStep,
    selectedDialogueScriptIndex,
    draftDialogueScript,
    previewingDialogueKey,
    isGeneratingDialogueScripts,
    isGeneratingDialogueAudio,
    generatedDialogueAudioUrl,
    clearGeneratedDialogueAudio,
    openConversationWizard,
    closeConversationWizard,
    setConversationWizardStep,
    setDraftDialogueScript,
    updateDraftDialogueLine,
    addDraftDialogueLine,
    removeDraftDialogueLine,
    playDialoguePreview,
    generateDialogueScripts,
    generateDialogueAudio,
    selectDialogueScript,
  };
};
