import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto flex max-w-4xl flex-col gap-6 rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
          Wiggly rebuild foundation
        </p>
        <div className="space-y-3">
          <h1 className="max-w-2xl text-4xl font-black leading-[1.02] tracking-normal text-slate-950 md:text-6xl">
            New create app, clean spine first.
          </h1>
          <p className="max-w-2xl text-base font-semibold leading-7 text-slate-600">
            This workspace route exists only to prove the new Next app can run beside
            the legacy app. The real foundation preview lives at /create-v2.
          </p>
        </div>
        <div>
          <Link
            href="/create-v2"
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-[0_14px_34px_rgba(15,23,42,0.22)] transition hover:bg-slate-800"
          >
            Open create v2
          </Link>
        </div>
      </section>
    </main>
  );
}
