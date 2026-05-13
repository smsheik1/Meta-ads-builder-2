import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../store';

type Headline = { text: string; framework: string };

export function HeadlineSlot({ niche, elementId }: { niche: string; elementId: string }) {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const { updateElement } = useEditorStore();

  const generateBatch = async () => {
    setLoading(true);
    try {
      const batch = await fetch('/api/generate-headlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, count: 20 }),
      }).then(r => r.json());
      
      setHeadlines(batch);
      setIndex(0);
      if (batch && batch.length > 0) {
        updateElement(elementId, { content: batch[0].text });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    generateBatch(); 
  }, [niche]);

  const refresh = () => {
    if (index + 1 >= headlines.length) {
       generateBatch();
    } else {
       const newIndex = index + 1;
       setIndex(newIndex);
       updateElement(elementId, { content: headlines[newIndex].text });
    }
  };

  const displayText = loading ? 'Generating fresh batch...' : headlines[index]?.text || 'Loading...';

  return (
    <div className="headline-slot w-full h-full flex items-center justify-center relative group">
      <div className="ad-headline w-full" style={{ textAlign: "inherit" }}>
        {displayText}
      </div>
      <div 
        className="controls flex gap-2 absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
        onMouseDown={e => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
      >
        <button 
          className="bg-white text-black px-2 py-1 rounded text-xs shadow-md border hover:bg-gray-100 whitespace-nowrap" 
          onClick={refresh} 
          disabled={loading}
        >
          🎲 {headlines.length > 0 ? `${index + 1}/${headlines.length}` : ''}
        </button>
        <button 
          className="bg-white text-black px-2 py-1 rounded text-xs shadow-md border hover:bg-gray-100 whitespace-nowrap" 
          onClick={generateBatch} 
          disabled={loading}
        >
          🔄 New Batch
        </button>
      </div>
    </div>
  );
}
