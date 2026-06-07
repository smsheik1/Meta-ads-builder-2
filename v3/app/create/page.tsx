export default function CreatePage() {
  return (
    <main className="min-h-screen bg-[#f6f2e8] px-8 py-10 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl grid-cols-[0.9fr_1.1fr] items-center gap-12">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 shadow-sm">
            Phase 0 scaffold
          </p>
          <h1 className="mt-7 text-7xl font-black leading-[0.92] tracking-normal">
            URL to 50 ads, rebuilt clean.
          </h1>
          <p className="mt-6 max-w-xl text-lg font-bold leading-8 text-slate-500">
            This page is a placeholder until Phase 1. The live v1 create page is untouched.
          </p>
        </div>
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.10)]">
          <div className="aspect-[9/16] rounded-[28px] border-[14px] border-slate-950 bg-[#fbfaf5] p-8">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
                Future visualizer format
              </p>
              <h2 className="mt-6 text-4xl font-black leading-[0.95] tracking-normal">
                One scene. One renderer. Many formats.
              </h2>
              <div className="mt-10 flex h-20 items-center gap-2">
                {Array.from({ length: 22 }).map((_, index) => (
                  <span
                    key={index}
                    className="w-3 rounded-full bg-[#7dd3fc]"
                    style={{ height: `${24 + Math.sin(index / 2) * 18 + (index % 5) * 4}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
