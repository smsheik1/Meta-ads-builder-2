import { Loader2, Wand2 } from "lucide-react";

type LoadStatus = "idle" | "loading" | "ready" | "error";

const pillClass = "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-500 shadow-sm";

export function CreateLeftColumn({
  adScenesCount,
  adStatus,
  error,
  onSubmit,
  onUrlChange,
  status,
  url,
}: {
  adScenesCount: number;
  adStatus: LoadStatus;
  error: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onUrlChange: (url: string) => void;
  status: LoadStatus;
  url: string;
}) {
  const submitIsBusy = status === "loading" || adStatus === "loading";
  const submitLabel = status === "loading"
    ? "Reading website"
    : adStatus === "loading"
      ? "Writing ideas"
      : "Generate ads";

  return (
    <div className="max-w-xl">
      <p className={pillClass}>
        <Wand2 className="size-4 text-[#4F46E5]" />
        {adScenesCount ? "Ads ready to review" : "Add a voice clip first"}
      </p>
      <h1 className="mt-4 text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-7xl">
        Make video ads without learning video editing.
      </h1>
      <p className="mt-4 max-w-full text-base font-semibold leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8 md:max-w-lg">
        Wiggly reads the site, finds the selling angle, and fills the canvas with polished ads you can preview, save, download, or edit.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/8"
      >
        <label className="block" htmlFor="website-url">
          <span className="mb-2 block text-sm font-black text-slate-800">Website</span>
          <input
            id="website-url"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            placeholder="https://yourbrand.com"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-slate-800">Ad writing model</span>
          <select
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            aria-label="Ad writing model"
            value="auto"
            onChange={() => {}}
          >
            <option value="auto">Auto best available (Auto)</option>
          </select>
          <span className="mt-1.5 block min-h-4 text-xs font-semibold text-slate-400">
            Auto is best for users. Pick a model when testing headline quality.
          </span>
        </label>

        <button
          type="submit"
          disabled={submitIsBusy}
          className={`flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-base font-black text-white shadow-xl shadow-slate-950/15 transition hover:bg-slate-800 ${submitIsBusy ? "cursor-progress" : ""} disabled:cursor-not-allowed disabled:opacity-45`}
        >
          {submitIsBusy ? <Loader2 className="size-5 animate-spin" /> : <Wand2 className="size-5" />}
          {submitLabel}
        </button>
      </form>

      {status === "error" || adStatus === "error" ? (
        <div className="mt-5 rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm font-black leading-6 text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
