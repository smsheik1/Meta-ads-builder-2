import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useEditorStore } from '../store';
import { getSeededHooks, type Headline } from '../lib/headline-pool';
import { AutoFitText } from './AutoFitText';
import { sanitizeRichText, stripRichText } from '../lib/rich-text';

export function HeadlineSlot({ niche, elementId }: { niche: string; elementId: string }) {
  const seededHooks = useMemo(() => getSeededHooks(niche), [niche]);
  const [headlines, setHeadlines] = useState<Headline[]>(seededHooks);
  const [index, setIndex] = useState(0);
  const [isRefilling, setIsRefilling] = useState(false);
  const { updateElement } = useEditorStore();
  const currentContent = useEditorStore((state) => state.elements.find(element => element.id === elementId)?.content || '');

  useEffect(() => {
    const isPlaceholder = !currentContent || currentContent === 'YOUR HEADLINE HERE';
    const seededIndex = seededHooks.findIndex(headline => headline.text === currentContent);
    const currentIsSeeded = seededIndex >= 0;
    const nextHeadlines = !isPlaceholder && !currentIsSeeded
      ? [{ text: currentContent, framework: 'Custom' }, ...seededHooks]
      : seededHooks;

    setHeadlines(nextHeadlines);
    setIndex(currentIsSeeded ? seededIndex : 0);
    if (isPlaceholder) {
      updateElement(elementId, { content: seededHooks[0]?.text || '' });
    }
  }, [currentContent, elementId, seededHooks, updateElement]);

  const refillWithAi = async () => {
    setIsRefilling(true);
    try {
      const response = await fetch('/api/generate-headlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, count: 50 }),
      });

      if (!response.ok) return;

      const batch = await response.json();
      if (Array.isArray(batch) && batch.length > 0) {
        setHeadlines(batch);
        setIndex(0);
        updateElement(elementId, { content: batch[0].text });
      }
    } catch (error) {
      console.error('Headline refill failed:', error);
    } finally {
      setIsRefilling(false);
    }
  };

  const refresh = () => {
    const nextIndex = (index + 1) % headlines.length;
    setIndex(nextIndex);
    updateElement(elementId, { content: headlines[nextIndex].text });

    if (nextIndex === headlines.length - 3 && !isRefilling) {
      refillWithAi();
    }
  };

  const activeHeadline = headlines[index] || seededHooks[0];

  return (
    <div className="headline-slot relative flex h-full w-full items-center justify-center overflow-hidden">
      <AutoFitText
        className="ad-headline w-full px-1"
        minFontSize={12}
        lineHeight={1.04}
        plainText={stripRichText(activeHeadline?.text || '')}
        style={{ textAlign: 'inherit' }}
      >
        <span dangerouslySetInnerHTML={{ __html: sanitizeRichText(activeHeadline?.text || '') }} />
      </AutoFitText>

      <button
        type="button"
        aria-label="Try another headline"
        title={activeHeadline?.framework ? `Try another hook (${activeHeadline.framework})` : 'Try another hook'}
        onClick={(event) => {
          event.stopPropagation();
          refresh();
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        className="absolute right-2 top-1/2 z-50 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-lg transition hover:bg-white hover:text-slate-950"
      >
        <RefreshCw className={`h-4 w-4 ${isRefilling ? 'animate-spin text-indigo-500' : ''}`} />
      </button>
    </div>
  );
}
