import type { Metadata } from "next";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { DiscoverySubmissionForm } from "./DiscoverySubmissionForm";

export const metadata: Metadata = {
  title: "Submit a Format | Wiggly",
  description: "Send Wiggly a proven ad Format for private review.",
};

const reviewSteps = [
  "Add the Format recipe",
  "Show three finished ads",
  "Name the source",
  "Wiggly reviews it",
];

export default function SubmitFormatPage() {
  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#080817]">
      <header className="border-b-2 border-[#080817]">
        <div className="mx-auto flex min-h-[76px] w-[min(100%-32px,1380px)] items-center justify-between gap-4">
          <Link href="/discover" className="inline-flex items-center gap-2 text-sm font-black">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Discovery
          </Link>
          <Link href="/" aria-label="Wiggly home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="w-28 sm:w-36" src="/wiggly-wordmark-3d-crop.png" alt="Wiggly" />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-[min(100%-32px,1180px)] gap-10 py-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:py-16">
        <div className="lg:sticky lg:top-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">Curated submissions</p>
          <h1 className="mt-4 text-6xl font-black leading-[0.86] sm:text-8xl">Show us what repeats.</h1>
          <p className="mt-6 max-w-lg text-xl font-bold leading-8 text-[#596176]">
            Send the recipe and three real ads. We review every one.
          </p>

          <ol className="mt-9 grid gap-4">
            {reviewSteps.map((step, index) => (
              <li key={step} className="flex items-center gap-3 text-sm font-black">
                <span className="grid size-8 shrink-0 place-items-center rounded-md border-2 border-[#080817] bg-[#52d6ff]">
                  {index + 1}
                </span>
                {step}
                {index === reviewSteps.length - 1 ? <Check className="ml-auto size-5" aria-hidden="true" /> : null}
              </li>
            ))}
          </ol>
        </div>

        <DiscoverySubmissionForm />
      </section>
    </main>
  );
}
