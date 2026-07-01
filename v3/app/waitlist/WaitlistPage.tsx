import { existsSync } from "node:fs";
import { join } from "node:path";
import { Suspense } from "react";
import { WaitlistSignupForm } from "./WaitlistSignupForm";

const demoVideoSrc = "/waitlist/creative-pack-demo.mp4";

function ProductDemo({ available }: { available: boolean }) {
  if (!available) {
    return (
      <div
        className="relative aspect-[9/16] w-full max-w-[380px] overflow-hidden rounded-[2.25rem] border border-white/70 bg-[#09091a] p-4 shadow-[0_34px_90px_rgba(38,25,91,0.22)]"
        data-waitlist-video-missing="true"
      >
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="flex h-full flex-col justify-between rounded-[1.7rem] border border-white/10 bg-[linear-gradient(160deg,#141129_0%,#09091a_58%,#1f1452_100%)] p-6">
          <div>
            <p className="inline-flex rounded-full border border-white/[0.12] bg-white/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#c9c4ff]">
              Launch blocker
            </p>
            <p className="mt-6 text-4xl font-black leading-[0.92] tracking-normal text-white">
              Add the real Creative Pack loop.
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.08] p-4">
            <p className="text-sm font-bold leading-6 text-[#e8e5ff]">
              Expected at <span className="font-black text-white">v3/public/waitlist/creative-pack-demo.mp4</span>.
            </p>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-[#8be5ff]">
              Real product footage only
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <video
      className="aspect-[9/16] w-full max-w-[380px] rounded-[2.25rem] border border-white/70 bg-slate-950 object-cover shadow-[0_34px_90px_rgba(38,25,91,0.22)]"
      src={demoVideoSrc}
      autoPlay
      muted
      loop
      playsInline
      aria-label="Creative Pack demo"
      data-waitlist-demo-video="true"
    />
  );
}

export function WaitlistPage() {
  const demoVideoAvailable = existsSync(join(process.cwd(), "public", "waitlist", "creative-pack-demo.mp4"));

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f3e9] px-5 py-6 text-[#07071a] sm:px-8 lg:px-12">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#8c2bff,#42b6ff,#bd3cff)]" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:min-h-[calc(100vh-3rem)] lg:flex-row lg:items-center lg:justify-between">
        <section className="max-w-[690px]">
          <div>
            <img
              src="/wiggly-wordmark-3d-crop.png"
              alt="Wiggly"
              className="h-[4.25rem] w-auto object-contain sm:h-20"
            />
            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.32em] text-[#96a0ba]">
              Ads without the hard part
            </p>
          </div>

          <p className="mt-12 inline-flex rounded-full border border-[#dacdff] bg-white/82 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#6845df] shadow-[0_10px_28px_rgba(91,70,170,0.1)] backdrop-blur">
            Early access
          </p>
          <h1 className="mt-5 text-[3.35rem] font-black leading-[0.92] tracking-normal text-[#07071a] sm:text-7xl lg:text-[5.75rem]">
            One URL. Eight ad formats. Sixty seconds.
          </h1>
          <p className="mt-6 max-w-xl text-xl font-bold leading-8 text-[#546078]">
            AI turns your store into a weekly Meta ad creative pack.
          </p>

          <Suspense fallback={<div className="mt-8 h-20 max-w-xl rounded-[1.5rem] bg-white/70" />}>
            <WaitlistSignupForm />
          </Suspense>

          <p className="mt-4 text-sm font-black uppercase tracking-[0.12em] text-[#8d98b3]">
            Built for ecommerce brands making fresh Meta ads every week.
          </p>
        </section>

        <section className="relative flex justify-center lg:w-[42%]" aria-label="Wiggly product preview">
          <div className="absolute -inset-6 rounded-[3rem] bg-[linear-gradient(145deg,rgba(140,43,255,0.12),rgba(66,182,255,0.1),rgba(255,255,255,0))] blur-2xl" />
          <div className="relative">
            <ProductDemo available={demoVideoAvailable} />
          </div>
        </section>
      </div>
    </main>
  );
}
