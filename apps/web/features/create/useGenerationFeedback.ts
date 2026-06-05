'use client';

import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { AdScene } from './scene';
import {
  createGenerationFeedbackKey,
  createGenerationFeedbackPayload,
  type GenerationFeedbackRating,
  type GenerationFeedbackStatus,
} from './generationFeedbackPayload';

type UseGenerationFeedbackOptions = {
  adModel: string;
  scene: AdScene;
  sessionId: string;
};

export function useGenerationFeedback({
  adModel,
  scene,
  sessionId,
}: UseGenerationFeedbackOptions) {
  const submitGenerationFeedbackMutation = useMutation(api.generationFeedback.submit);
  const [feedbackRating, setFeedbackRating] = useState<GenerationFeedbackRating | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<GenerationFeedbackStatus>('idle');
  const [feedbackError, setFeedbackError] = useState('');
  const feedbackKey = createGenerationFeedbackKey(scene);

  useEffect(() => {
    setFeedbackRating(null);
    setFeedbackStatus('idle');
    setFeedbackError('');
  }, [feedbackKey]);

  const submitGenerationFeedback = (rating: GenerationFeedbackRating) => {
    if (!sessionId) {
      setFeedbackRating(null);
      setFeedbackStatus('error');
      setFeedbackError('Feedback is still connecting. Try again in a second.');
      return;
    }

    setFeedbackRating(rating);
    setFeedbackStatus('saving');
    setFeedbackError('');

    void submitGenerationFeedbackMutation({
      feedback: createGenerationFeedbackPayload({
        adModel,
        rating,
        scene,
        sessionId,
      }),
    }).then(() => {
      setFeedbackStatus('saved');
      setFeedbackError('');
    }).catch((caught) => {
      console.error('[create-v2 generation-feedback]', caught);
      setFeedbackStatus('error');
      setFeedbackError('This browser could not save feedback.');
    });
  };

  return {
    feedbackError,
    feedbackRating,
    feedbackStatus,
    submitGenerationFeedback,
  };
}
