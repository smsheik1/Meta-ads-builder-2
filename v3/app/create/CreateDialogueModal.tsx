import { Loader2, Mic, Upload, Wand2, X } from "lucide-react";
import type { DialogueScript } from "@/features/dialogue/dialogueScripts";

type DialogueStatus = "idle" | "loading" | "ready" | "error";
type AudioStatus = "idle" | "loading" | "ready" | "error";

export function CreateDialogueModal({
  audioError,
  audioStatus,
  canGenerateAudio,
  dialogueError,
  dialogueScripts,
  dialogueStatus,
  hasSelectedScene,
  onClose,
  onGenerateAudio,
  onGenerateDialogueScripts,
  onSelectDialogueScript,
  onUpdateDialogueLineText,
  onUploadAudio,
  selectedDialogueIndex,
}: {
  audioError: string;
  audioStatus: AudioStatus;
  canGenerateAudio: boolean;
  dialogueError: string;
  dialogueScripts: DialogueScript[];
  dialogueStatus: DialogueStatus;
  hasSelectedScene: boolean;
  onClose: () => void;
  onGenerateAudio: () => void;
  onGenerateDialogueScripts: () => void;
  onSelectDialogueScript: (index: number) => void;
  onUpdateDialogueLineText: (lineIndex: number, text: string) => void;
  onUploadAudio: (file: File | null) => void;
  selectedDialogueIndex: number;
}) {
  const hasDialogueScripts = dialogueScripts.length > 0;
  const selectedDialogueScript = dialogueScripts[selectedDialogueIndex] || null;
  const audioIsLoading = audioStatus === "loading";

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 px-8 py-8 backdrop-blur-sm"
      data-dialogue-editor="modal"
    >
      <section className={`relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.35)] ${hasDialogueScripts ? "max-w-[900px]" : "max-w-[680px]"}`}>
        <h2 className="sr-only">Add audio</h2>
        <button
          type="button"
          aria-label="Close voice script editor"
          onClick={onClose}
          className="absolute right-5 top-5 z-10 grid size-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950"
        >
          <X className="size-5" />
        </button>

        <div className="overflow-y-auto px-7 py-7">
          <div className="grid grid-cols-2 gap-3 pr-14">
            <label
              className={`inline-flex cursor-pointer items-center justify-center gap-3 rounded-[20px] border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 ${
                !hasSelectedScene || audioIsLoading ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {audioIsLoading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
              Upload your audio
              <input
                type="file"
                accept="audio/*"
                className="sr-only"
                disabled={!hasSelectedScene || audioIsLoading}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] || null;
                  event.currentTarget.value = "";
                  onUploadAudio(file);
                }}
              />
            </label>
            <button
              type="button"
              onClick={onGenerateDialogueScripts}
              disabled={dialogueStatus === "loading" || !hasSelectedScene}
              className="inline-flex items-center justify-center gap-3 rounded-[20px] bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {dialogueStatus === "loading" ? <Loader2 className="size-5 animate-spin" /> : <Wand2 className="size-5" />}
              {dialogueStatus === "loading" ? "Writing script options" : hasDialogueScripts ? "Rewrite script options" : "Write script options"}
            </button>
          </div>

          {audioError ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black leading-6 text-red-700">
              {audioError}
            </p>
          ) : null}

          {dialogueError ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black leading-6 text-red-700">
              {dialogueError}
            </p>
          ) : null}

          {hasDialogueScripts ? (
            <>
              <div className="mt-5 grid grid-cols-5 gap-3" data-dialogue-option-grid="true">
                {dialogueScripts.map((script, index) => (
                  <button
                    key={`${script.title}-${index}`}
                    type="button"
                    onClick={() => onSelectDialogueScript(index)}
                    className={`min-w-0 rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 ${
                      selectedDialogueIndex === index
                        ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_46px_rgba(15,23,42,0.20)]"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <span className="block text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                      Option {index + 1}
                    </span>
                    <span className="mt-2 block truncate text-sm font-black">
                      {script.title}
                    </span>
                  </button>
                ))}
              </div>

              {selectedDialogueScript ? (
                <div className="mt-6 rounded-[24px] bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <h3 className="text-2xl font-black leading-tight text-slate-950">
                        {selectedDialogueScript.title}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                        {selectedDialogueScript.angle}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onGenerateAudio}
                      disabled={!canGenerateAudio || audioIsLoading}
                      className="inline-flex shrink-0 items-center justify-center gap-3 rounded-[18px] bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {audioIsLoading ? <Loader2 className="size-5 animate-spin" /> : <Mic className="size-5" />}
                      Generate this audio
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4">
                    {selectedDialogueScript.lines.map((line, index) => (
                      <label key={`${line.speaker}-${index}`} className="grid grid-cols-[150px_1fr] gap-4 rounded-[20px] border border-slate-200 bg-white p-4">
                        <span>
                          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            {line.speaker}
                          </span>
                          <span className="mt-2 block rounded-full bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            {line.tone}
                          </span>
                        </span>
                        <textarea
                          value={line.text}
                          onChange={(event) => onUpdateDialogueLineText(index, event.target.value)}
                          rows={3}
                          className="min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold leading-7 text-slate-800 outline-none transition focus:border-slate-950 focus:bg-white"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
