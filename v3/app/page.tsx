import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f6f2e8] px-8 py-10 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-center rounded-[32px] border border-slate-200 bg-white px-10 py-12 shadow-[0_28px_90px_rgba(15,23,42,0.10)]">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-slate-400">
          Wiggly v3
        </p>
        <h1 className="mt-6 max-w-3xl text-6xl font-black leading-[0.95] tracking-normal">
          Clean rebuild. Same taste. Less mess.
        </h1>
        <p className="mt-6 max-w-2xl text-xl font-bold leading-8 text-slate-500">
          v3 is isolated from the live app while we rebuild the core loop around one scene contract,
          one renderer, and format modules that can grow without breaking each other.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            href="/create"
            className="rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5"
          >
            Open create
          </Link>
        </div>
      </section>
    </main>
  );
}
