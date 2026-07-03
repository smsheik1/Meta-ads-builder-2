import { Suspense } from "react";
import { HomepagePreviewCarousel } from "./HomepagePreviewCarousel";
import { WaitlistSignupForm } from "./WaitlistSignupForm";

export function WaitlistPage() {
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
            <HomepagePreviewCarousel />
          </div>
        </section>
      </div>
    </main>
  );
}
