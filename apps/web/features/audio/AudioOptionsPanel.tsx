'use client';

import { AudioLines, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DialogueScript } from './dialogueScripts';

export type AudioPanelStatus = 'idle' | 'writing' | 'ready' | 'making' | 'error';

type AudioOptionsPanelProps = {
  audioError: string;
  audioStatus: AudioPanelStatus;
  scriptOptions: DialogueScript[];
  selectedScriptId: string;
  onMakeAudio: () => void;
  onNewOptions: () => void;
  onSelectScript: (scriptId: string) => void;
};

export function AudioOptionsPanel({
  audioError,
  audioStatus,
  scriptOptions,
  selectedScriptId,
  onMakeAudio,
  onNewOptions,
  onSelectScript,
}: AudioOptionsPanelProps) {
  const selectedScript = scriptOptions.find((script) => script.id === selectedScriptId) || scriptOptions[0] || null;

  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Voice audio
          </p>
          <h3 className="mt-2 text-2xl font-black leading-tight text-slate-950">
            Choose the words, then make the audio.
          </h3>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={audioStatus === 'writing' || audioStatus === 'making'}
          onClick={onNewOptions}
        >
          {audioStatus === 'writing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          New options
        </Button>
      </div>

      {audioError && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {audioError}
        </p>
      )}

      <div className="mt-5 space-y-3">
        {audioStatus === 'writing' && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-600">
            Writing voice options...
          </div>
        )}
        {scriptOptions.map((script) => (
          <button
            key={script.id}
            type="button"
            className={`w-full rounded-2xl border p-4 text-left transition ${
              selectedScriptId === script.id
                ? 'border-slate-950 bg-slate-950 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-300'
            }`}
            onClick={() => onSelectScript(script.id)}
          >
            <span className="block text-sm font-black">{script.title}</span>
            <span className={`mt-1 block text-xs font-bold ${selectedScriptId === script.id ? 'text-white/70' : 'text-slate-500'}`}>
              {script.angle}
            </span>
            <span className={`mt-3 block text-sm font-semibold leading-6 ${selectedScriptId === script.id ? 'text-white/90' : 'text-slate-600'}`}>
              {script.lines.map((line) => line.text).join(' ')}
            </span>
          </button>
        ))}
      </div>

      {selectedScript && (
        <Button
          type="button"
          className="mt-5 w-full"
          disabled={audioStatus === 'making'}
          onClick={onMakeAudio}
        >
          {audioStatus === 'making' ? <Loader2 className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4" />}
          {audioStatus === 'making' ? 'Making audio' : 'Make audio'}
        </Button>
      )}
    </section>
  );
}
