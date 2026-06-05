'use client';

import { ChangeEvent, useRef } from 'react';
import { AudioLines, Loader2, Mic2, RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DialogueScript } from './dialogueScripts';

export type AudioPanelStatus = 'idle' | 'writing' | 'ready' | 'making' | 'uploading' | 'error';
export type AudioPanelIntent = 'make' | 'upload';

type AudioOptionsPanelProps = {
  audioError: string;
  audioIntent: AudioPanelIntent;
  audioStatus: AudioPanelStatus;
  scriptOptions: DialogueScript[];
  selectedScriptId: string;
  onMakeAudio: () => void;
  onNewOptions: () => void;
  onSelectScript: (scriptId: string) => void;
  onUploadAudio: (file: File) => void;
};

export function AudioOptionsPanel({
  audioError,
  audioIntent,
  audioStatus,
  scriptOptions,
  selectedScriptId,
  onMakeAudio,
  onNewOptions,
  onSelectScript,
  onUploadAudio,
}: AudioOptionsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedScript = scriptOptions.find((script) => script.id === selectedScriptId) || scriptOptions[0] || null;
  const busy = audioStatus === 'writing' || audioStatus === 'making' || audioStatus === 'uploading';
  const hasScriptOptions = scriptOptions.length > 0;
  const uploadFirst = audioIntent === 'upload';

  const handleAudioFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onUploadAudio(file);
  };

  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Voice audio
          </p>
          <h3 className="mt-2 text-2xl font-black leading-tight text-slate-950">
            {audioIntent === 'upload' ? 'Upload audio for this ad.' : 'Make voice audio for this ad.'}
          </h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
            {audioIntent === 'upload'
              ? 'Choose a clip you already have, or switch to generated options below.'
              : 'Write a few voice options, pick one, then generate the final audio.'}
          </p>
        </div>
        {hasScriptOptions && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onNewOptions}
          >
            {audioStatus === 'writing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            New options
          </Button>
        )}
      </div>

      {audioError && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {audioError}
        </p>
      )}

      <div className={`mt-5 rounded-2xl border border-dashed p-4 ${
        uploadFirst
          ? 'border-slate-300 bg-slate-950 text-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]'
          : 'border-slate-200 bg-slate-50'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`text-sm font-black ${uploadFirst ? 'text-white' : 'text-slate-950'}`}>Already have a voice clip?</p>
            <p className={`mt-1 text-xs font-bold ${uploadFirst ? 'text-white/65' : 'text-slate-500'}`}>
              Upload it here and Wiggly will save it with this ad.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {audioStatus === 'uploading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {audioStatus === 'uploading' ? 'Uploading' : 'Upload audio'}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleAudioFileChange}
        />
      </div>

      {!hasScriptOptions && audioStatus !== 'writing' && (
        <div className={`mt-4 rounded-2xl border p-4 ${
          audioIntent === 'make'
            ? 'border-slate-300 bg-slate-950 text-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]'
            : 'border-slate-200 bg-white'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-sm font-black ${audioIntent === 'make' ? 'text-white' : 'text-slate-950'}`}>Want Wiggly to make one?</p>
              <p className={`mt-1 text-xs font-bold ${audioIntent === 'make' ? 'text-white/65' : 'text-slate-500'}`}>
                Write voice options first, then choose one to generate audio.
              </p>
            </div>
            <Button
              type="button"
              variant={audioIntent === 'make' ? 'secondary' : 'primary'}
              disabled={busy}
              onClick={onNewOptions}
            >
              <Mic2 className="h-4 w-4" />
              Make voice audio
            </Button>
          </div>
        </div>
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
          disabled={busy}
          onClick={onMakeAudio}
        >
          {audioStatus === 'making' ? <Loader2 className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4" />}
          {audioStatus === 'making' ? 'Making audio' : 'Make audio'}
        </Button>
      )}
    </section>
  );
}
