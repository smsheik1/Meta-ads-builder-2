export function CreatePageHeader() {
  return (
    <header className="mx-auto flex w-full items-center justify-between">
      <div className="flex items-center gap-3">
        <img
          src="/wiggly-logo.svg"
          alt="Wiggly"
          className="h-10 w-10 rounded-2xl object-cover shadow-sm shadow-slate-950/10"
        />
        <span>
          <span className="block text-xl font-black leading-none">Wiggly</span>
          <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            audio that looks expensive
          </span>
        </span>
      </div>
      <a
        href="/builder"
        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        Open builder
      </a>
    </header>
  );
}
