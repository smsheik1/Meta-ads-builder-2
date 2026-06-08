import { Loader2, Wand2 } from "lucide-react";

type LoadStatus = "idle" | "loading" | "ready" | "error";

const pillClass = "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400 shadow-sm";

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
    <div className="pt-16">
      <p className={pillClass}>{adScenesCount ? "Ads ready to review" : "Add a voice clip first"}</p>
      <h1 className="mt-7 max-w-[560px] text-[78px] font-black leading-[0.93] tracking-normal text-slate-950">
        Make video ads without learning video editing.
      </h1>

      <form
        onSubmit={onSubmit}
        className="mt-9 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)]"
      >
        <label className="text-sm font-black text-slate-900" htmlFor="website-url">
          Website
        </label>
        <input
          id="website-url"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          className="mt-3 w-full rounded-full border border-slate-200 bg-slate-50 px-6 py-4 text-lg font-bold text-slate-900 outline-none transition focus:border-slate-950 focus:bg-white"
          placeholder="https://yourbrand.com"
        />
        <button
          type="submit"
          disabled={submitIsBusy}
          className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-400"
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
