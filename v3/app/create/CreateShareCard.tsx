import { Check, ExternalLink, Link2, Loader2 } from "lucide-react";

type ShareStatus = "idle" | "loading" | "ready" | "error";

export function CreateShareCard({
  hasSelectedScene,
  onCreateShareLink,
  shareError,
  shareStatus,
  shareUrl,
}: {
  hasSelectedScene: boolean;
  onCreateShareLink: () => void;
  shareError: string;
  shareStatus: ShareStatus;
  shareUrl: string;
}) {
  return (
    <section
      className="mt-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/8"
      data-create-share-card="v3"
    >
      <button
        type="button"
        onClick={onCreateShareLink}
        disabled={!hasSelectedScene || shareStatus === "loading"}
        className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {shareStatus === "loading" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : shareStatus === "ready" ? (
          <Check className="size-4" />
        ) : (
          <Link2 className="size-4" />
        )}
        {shareStatus === "loading" ? "Creating share link" : shareStatus === "ready" ? "Share link copied" : "Create share link"}
      </button>

      {shareUrl ? (
        <a
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open share page
          <ExternalLink className="size-4" />
        </a>
      ) : null}

      {shareError ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-black leading-5 text-red-700">
          {shareError}
        </p>
      ) : null}
    </section>
  );
}
