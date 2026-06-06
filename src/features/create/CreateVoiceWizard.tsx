import { ArrowRight, Loader2, Play, Square, Wand2, X } from 'lucide-react';
import type {
  ConversationWizardStep,
  CreativeBrief,
  CreativeBriefTextKey,
  DialogueLine,
  DialogueScript,
} from './createVoiceScripts';
import {
  formatDialogueScriptCost,
  GEMINI_3_1_FLASH_TTS_COST,
} from './createVoiceScripts';

type CreativeBriefField = {
  key: CreativeBriefTextKey;
  question: string;
  placeholder: string;
  optional?: boolean;
};

type CreateVoiceWizardProps = {
  open: boolean;
  step: ConversationWizardStep;
  creativeBrief: CreativeBrief;
  creativeBriefFields: CreativeBriefField[];
  briefCompletion: number;
  requiredBriefFields: number;
  personaLabel: string;
  dialogueScripts: DialogueScript[];
  selectedDialogueScriptIndex: number;
  draftDialogueScript: DialogueScript | null;
  previewingDialogueKey: string | null;
  isGeneratingDialogueScripts: boolean;
  isGeneratingDialogueAudio: boolean;
  onClose: () => void;
  onStepChange: (step: ConversationWizardStep) => void;
  onUpdateCreativeBrief: (key: CreativeBriefTextKey, value: string) => void;
  onGenerateDialogueScripts: () => void;
  onSelectDialogueScript: (script: DialogueScript, index: number, openEdit?: boolean) => void;
  onSetDraftDialogueScript: (updater: (current: DialogueScript | null) => DialogueScript | null) => void;
  onUpdateDraftDialogueLine: (index: number, patch: Partial<DialogueLine>) => void;
  onAddDraftDialogueLine: () => void;
  onRemoveDraftDialogueLine: (index: number) => void;
  onPlayDialoguePreview: (script: DialogueScript, key: string) => void;
  onGenerateDialogueAudio: (script: DialogueScript) => void;
};

const wizardSteps: Array<{ id: ConversationWizardStep; label: string; detail: string }> = [
  { id: 'brief', label: '1. Business', detail: 'What the ad is about' },
  { id: 'scripts', label: '2. Choose Words', detail: 'options' },
  { id: 'edit', label: '3. Make Audio', detail: 'Hear it first' },
];

export const CreateVoiceWizard = ({
  open,
  step,
  creativeBrief,
  creativeBriefFields,
  briefCompletion,
  requiredBriefFields,
  personaLabel,
  dialogueScripts,
  selectedDialogueScriptIndex,
  draftDialogueScript,
  previewingDialogueKey,
  isGeneratingDialogueScripts,
  isGeneratingDialogueAudio,
  onClose,
  onStepChange,
  onUpdateCreativeBrief,
  onGenerateDialogueScripts,
  onSelectDialogueScript,
  onSetDraftDialogueScript,
  onUpdateDraftDialogueLine,
  onAddDraftDialogueLine,
  onRemoveDraftDialogueLine,
  onPlayDialoguePreview,
  onGenerateDialogueAudio,
}: CreateVoiceWizardProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Make Voice Audio</h2>
            <p className="mt-1 text-sm text-slate-500">Check the business info, choose the words, edit anything, then make the audio.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {wizardSteps.map((wizardStep) => {
              const active = step === wizardStep.id;
              const detail = wizardStep.id === 'scripts' ? `${dialogueScripts.length || 0} options` : wizardStep.detail;
              return (
                <button
                  key={wizardStep.id}
                  type="button"
                  onClick={() => {
                    if (wizardStep.id === 'edit' && !draftDialogueScript) return;
                    onStepChange(wizardStep.id);
                  }}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? 'border-slate-900 bg-slate-950 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                  }`}
                >
                  <span className="block text-xs font-black">{wizardStep.label}</span>
                  <span className={`mt-0.5 block text-[11px] font-semibold ${active ? 'text-white/70' : 'text-slate-400'}`}>{detail}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {step === 'brief' && (
            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Check what this ad is selling</h3>
                    <p className="mt-1 text-sm text-slate-500">This is the context that decides what the conversation is about.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {briefCompletion}/{requiredBriefFields}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {creativeBriefFields.map((field) => (
                    <label key={field.key} className={field.key === 'reference' ? 'block space-y-1.5 md:col-span-2' : 'block space-y-1.5'}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700">{field.question}</span>
                        {field.optional && <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Optional</span>}
                      </span>
                      <textarea
                        value={creativeBrief[field.key]}
                        onChange={(event) => onUpdateCreativeBrief(field.key, event.target.value)}
                        rows={field.key === 'reference' ? 3 : 2}
                        placeholder={field.placeholder}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Who this is for</p>
                <p className="mt-2 text-lg font-black leading-tight text-slate-900">{creativeBrief.buyer || personaLabel || 'Your customer'}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">The script should sound like one person has the problem and another person casually points to the solution.</p>
                <button
                  type="button"
                  onClick={onGenerateDialogueScripts}
                  disabled={isGeneratingDialogueScripts || isGeneratingDialogueAudio}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingDialogueScripts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {isGeneratingDialogueScripts ? 'Writing options' : dialogueScripts.length ? 'Write new options' : 'Write options'}
                </button>
                {dialogueScripts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onStepChange('scripts')}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
                  >
                    Choose words
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </aside>
            </div>
          )}

          {step === 'scripts' && (
            <div className="grid gap-5 lg:grid-cols-[310px_1fr]">
              <div className={dialogueScripts.length === 0 ? 'space-y-2 lg:col-span-2' : 'space-y-2'}>
                {dialogueScripts.length > 0 && (
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Choose an angle</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Click one, edit it on the right, then use it.</p>
                    </div>
                    <button
                      type="button"
                      onClick={onGenerateDialogueScripts}
                      disabled={isGeneratingDialogueScripts || isGeneratingDialogueAudio}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      {isGeneratingDialogueScripts ? 'Writing' : 'More options'}
                    </button>
                  </div>
                )}
                {dialogueScripts.length === 0 ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center lg:col-span-2">
                    <p className="text-2xl font-black leading-tight text-slate-950">Write voice options for this ad</p>
                    <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-slate-500">
                      Wiggly will use the business info from the website to write short script options. Pick one, edit it, then make the audio.
                    </p>
                    <button
                      type="button"
                      onClick={onGenerateDialogueScripts}
                      disabled={isGeneratingDialogueScripts || isGeneratingDialogueAudio}
                      className="mt-6 flex min-w-56 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-base font-black text-white shadow-xl shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isGeneratingDialogueScripts ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                      {isGeneratingDialogueScripts ? 'Writing options' : 'Write options'}
                    </button>
                  </div>
                ) : (
                  dialogueScripts.map((script, index) => {
                    const selected = index === selectedDialogueScriptIndex;
                    const previewKey = `script-${index}`;
                    const previewing = previewingDialogueKey === previewKey;
                    return (
                      <div
                        key={`${script.title}-${index}`}
                        className={`flex w-full items-start gap-2 rounded-xl border p-3 text-left transition ${
                          selected
                            ? 'border-slate-900 bg-white shadow-sm'
                            : 'border-slate-200 bg-slate-50 hover:bg-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectDialogueScript(script, index)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-black text-slate-900">{script.title || `Option ${index + 1}`}</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400">{script.lines.length} lines</span>
                          </span>
                          <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{script.angle}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onPlayDialoguePreview(script, previewKey)}
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-slate-700 transition ${
                            previewing
                              ? 'border-slate-900 bg-slate-950 text-white'
                              : 'border-slate-200 bg-white hover:border-indigo-200 hover:text-indigo-600'
                          }`}
                          title={previewing ? 'Stop' : 'Hear this script'}
                        >
                          {previewing ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {dialogueScripts.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  {draftDialogueScript ? (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-black leading-tight text-slate-950">Edit the exact words</h3>
                          <p className="mt-1 text-sm font-semibold text-slate-500">These words become the audio and the on-screen captions.</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => onPlayDialoguePreview(draftDialogueScript, `script-${selectedDialogueScriptIndex}`)}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 transition hover:bg-slate-50"
                          >
                            {previewingDialogueKey === `script-${selectedDialogueScriptIndex}` ? 'Stop' : 'Play'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onStepChange('edit')}
                            disabled={!draftDialogueScript.lines.some((line) => line.text.trim())}
                            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
                          >
                            Use these words
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr]">
                        <label className="block space-y-1.5">
                          <span className="text-xs font-bold text-slate-700">Title</span>
                          <input
                            value={draftDialogueScript.title}
                            onChange={(event) => onSetDraftDialogueScript((current) => current ? { ...current, title: event.target.value } : current)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                          />
                        </label>
                        <label className="block space-y-1.5">
                          <span className="text-xs font-bold text-slate-700">Angle</span>
                          <input
                            value={draftDialogueScript.angle}
                            onChange={(event) => onSetDraftDialogueScript((current) => current ? { ...current, angle: event.target.value } : current)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                          />
                        </label>
                      </div>
                      <div className="mt-5 space-y-3">
                        {draftDialogueScript.lines.map((line, index) => (
                          <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-2 grid gap-2 sm:grid-cols-[110px_1fr_auto]">
                              <input
                                value={line.speaker}
                                onChange={(event) => onUpdateDraftDialogueLine(index, { speaker: event.target.value })}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-black text-slate-800 outline-none focus:border-indigo-400"
                                aria-label={`Speaker for line ${index + 1}`}
                              />
                              <input
                                value={line.tone}
                                onChange={(event) => onUpdateDraftDialogueLine(index, { tone: event.target.value })}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 outline-none focus:border-indigo-400"
                                aria-label={`Tone for line ${index + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => onRemoveDraftDialogueLine(index)}
                                disabled={draftDialogueScript.lines.length <= 2}
                                className="rounded-lg px-2.5 py-2 text-xs font-black text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                Remove
                              </button>
                            </div>
                            <textarea
                              value={line.text}
                              onChange={(event) => onUpdateDraftDialogueLine(index, { text: event.target.value })}
                              rows={2}
                              placeholder="Write what this person says..."
                              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={onAddDraftDialogueLine}
                        className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                      >
                        Add another line
                      </button>
                    </>
                  ) : (
                    <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                      <p className="text-sm font-bold text-slate-500">Choose a script to edit.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 'edit' && (
            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div>
                  <h3 className="text-xl font-black leading-tight text-slate-950">{draftDialogueScript?.title || 'Chosen words'}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{draftDialogueScript?.angle || 'Ready to make audio.'}</p>
                </div>
                <div className="mt-5 space-y-3">
                  {draftDialogueScript?.lines.map((line, index) => (
                    <div key={`${line.speaker}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${index % 2 === 0 ? 'bg-[#00D6B8]' : 'bg-[#6554FF]'}`} />
                        <span className="text-xs font-black uppercase tracking-wide text-slate-500">{line.speaker}</span>
                        <span className="text-xs font-semibold text-slate-400">{line.tone}</span>
                      </div>
                      <p className="text-sm font-semibold leading-6 text-slate-800">{line.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Final check</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">These exact words will become the audio and captions.</p>
                <p className="mt-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500">
                  Est. run cost: {formatDialogueScriptCost(draftDialogueScript)} · {GEMINI_3_1_FLASH_TTS_COST.model}
                </p>
                <div className="mt-4 rounded-xl bg-white p-3">
                  <p className="text-xs font-black text-slate-400">Lines</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{draftDialogueScript?.lines.length || 0}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onStepChange('scripts')}
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Back to options
                </button>
                <button
                  type="button"
                  onClick={() => draftDialogueScript && onPlayDialoguePreview(draftDialogueScript, 'draft')}
                  disabled={!draftDialogueScript || !draftDialogueScript.lines.some((line) => line.text.trim())}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {previewingDialogueKey === 'draft' ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                  {previewingDialogueKey === 'draft' ? 'Stop' : 'Hear it first'}
                </button>
                <button
                  type="button"
                  onClick={() => draftDialogueScript && onGenerateDialogueAudio(draftDialogueScript)}
                  disabled={
                    !draftDialogueScript ||
                    isGeneratingDialogueAudio ||
                    isGeneratingDialogueScripts ||
                    !draftDialogueScript.lines.some((line) => line.text.trim())
                  }
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingDialogueAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
                  {isGeneratingDialogueAudio ? 'Making audio' : 'Make audio'}
                </button>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
