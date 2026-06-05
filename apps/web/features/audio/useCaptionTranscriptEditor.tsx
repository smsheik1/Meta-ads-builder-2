'use client';

import { useState, type Dispatch } from 'react';
import type { AdScene } from '@/features/create/scene';
import type { AdSceneAction } from '@/features/create/sceneReducer';
import { isStoredSceneAudio } from '@/features/render/adSceneRender';
import {
  CaptionTranscriptEditor,
  type CaptionTranscriptDraft,
} from './CaptionTranscriptEditor';

type UseCaptionTranscriptEditorOptions = {
  dispatch: Dispatch<AdSceneAction>;
  onChange: () => void;
  scene: AdScene;
};

export function useCaptionTranscriptEditor({
  dispatch,
  onChange,
  scene,
}: UseCaptionTranscriptEditorOptions) {
  const [open, setOpen] = useState(false);
  const hasEditableWords = isStoredSceneAudio(scene) && (
    Boolean(scene.audio.transcript.trim()) || scene.audio.captions.length > 0
  );

  const saveCaptionTranscript = (draft: CaptionTranscriptDraft) => {
    dispatch({
      type: 'updateAudio',
      audio: {
        transcript: draft.transcript,
        captions: draft.captions,
      },
    });
    onChange();
    setOpen(false);
  };

  return {
    captionTranscriptEditor: (
      <CaptionTranscriptEditor
        audio={scene.audio}
        open={open && hasEditableWords}
        onClose={() => setOpen(false)}
        onSave={saveCaptionTranscript}
      />
    ),
    openCaptionTranscriptEditor: () => {
      if (hasEditableWords) setOpen(true);
    },
  };
}
