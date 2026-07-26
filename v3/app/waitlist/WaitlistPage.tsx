import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { WaitlistFormatCarousel } from "./WaitlistFormatCarousel";
import { WaitlistSignupForm } from "./WaitlistSignupForm";

export function WaitlistPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f1e8] text-[#080817]">
      <header className="border-b-2 border-[#080817] bg-[#f5f1e8] px-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/wiggly-wordmark-3d-crop.png" alt="Wiggly" className="h-12 w-auto object-contain sm:h-14" />
            <p className="hidden border-l-2 border-[#080817] pl-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#596176] sm:block">
              Ads without<br />the hard part
            </p>
          </div>
          <Link
            href="/discover"
            className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-[#080817] bg-white px-4 text-sm font-black text-[#080817] transition hover:-translate-y-0.5 hover:bg-[#C9FF55]"
          >
            Open Wiggly <ArrowUpRight className="size-4" strokeWidth={3} />
          </Link>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100svh-5rem)] w-full max-w-[1440px] gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(350px,0.72fr)] lg:items-center lg:px-12 lg:py-5">
        <section className="max-w-[780px]">
          <p className="inline-flex border-2 border-[#080817] bg-[#52D6FF] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] shadow-[4px_4px_0_#080817]">
            Creative engine for ecommerce
          </p>
          <h1 className="mt-7 max-w-[760px] text-[3.25rem] font-black leading-[0.91] tracking-normal sm:text-[4.5rem] lg:text-[4.35rem] xl:text-[4.7rem]">
            Your product page, turned into ads worth watching.
          </h1>
          <p className="mt-7 max-w-2xl text-lg font-bold leading-7 text-[#596176] sm:text-xl sm:leading-8">
            Wiggly finds the angles worth testing on your site, then builds a week of on-brand Meta creative, from fast meme tests to narrated 3D video.
          </p>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-black text-[#30374b]">
            {["Start with one URL", "Choose the direction", "Approve every paid step"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-[#C9FF55] text-[#080817]">
                  <Check className="size-3.5" strokeWidth={4} />
                </span>
                {item}
              </span>
            ))}
          </div>

          <Suspense fallback={<div className="mt-9 h-24 max-w-xl rounded-lg bg-white" />}>
            <WaitlistSignupForm />
          </Suspense>
        </section>

        <div className="flex justify-center lg:justify-end">
          <WaitlistFormatCarousel />
        </div>
      </div>

      <section className="border-y-2 border-[#080817] bg-[#080817] px-5 py-12 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#52D6FF]">No blank canvas</p>
            <h2 className="mt-3 max-w-lg text-4xl font-black leading-[0.96] sm:text-5xl">
              Change the format. Keep the product truth.
            </h2>
          </div>
          <div className="grid gap-7 sm:grid-cols-3">
            {[
              ["01", "Read", "Products, proof, positioning, and buyer friction."],
              ["02", "Direct", "Hooks and angles worth putting in front of customers."],
              ["03", "Build", "Static, motion, audio, and video ready for the feed."],
            ].map(([number, title, description]) => (
              <div key={number} className="border-t border-white/25 pt-4">
                <p className="font-mono text-xs font-bold text-[#C9FF55]">{number}</p>
                <h3 className="mt-4 text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/62">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
