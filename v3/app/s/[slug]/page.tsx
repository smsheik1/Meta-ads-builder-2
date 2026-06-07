export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f2e8] px-8 py-10 text-slate-950">
      <section className="max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_28px_90px_rgba(15,23,42,0.10)]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Share page scaffold
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight">
          {slug}
        </h1>
        <p className="mt-4 text-base font-bold leading-7 text-slate-500">
          Phase 5 will render the frozen AdScene for this slug. v3 is not wired to production yet.
        </p>
      </section>
    </main>
  );
}
