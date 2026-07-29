import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, BadgeCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscoveryProofMedia } from "@/features/discovery/DiscoveryProofMedia";
import { DiscoveryFormatHandoff } from "@/features/discovery/DiscoveryFormatHandoff";
import { getDiscoveryCreatorByName } from "@/features/discovery/creators";
import {
  discoveryFormatSlugs,
  getDiscoveryFormatProfile,
} from "@/features/discovery/formatProof.server";

export function generateStaticParams() {
  return discoveryFormatSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const format = getDiscoveryFormatProfile(slug);
  if (!format) return {};

  return {
    title: `${format.name} Format | Wiggly`,
    description: `${format.promise} See real finished ads made with version ${format.version}.`,
  };
}

export default async function FormatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const format = getDiscoveryFormatProfile(slug);
  if (!format) notFound();

  const heroProof = format.proofEntries[0];
  if (!heroProof) notFound();
  const creator = getDiscoveryCreatorByName(format.creator);

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

      <section className="mx-auto grid w-[min(100%-32px,1380px)] gap-9 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:py-16">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border-2 border-[#080817] bg-[#52d6ff] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]">
              <BadgeCheck className="size-4" aria-hidden="true" />
              Curated Format
            </span>
            <span className="rounded-md border-2 border-[#080817] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]">
              v{format.version}
            </span>
          </div>

          <h1 className="mt-7 text-6xl font-black leading-[0.85] tracking-normal sm:text-8xl lg:text-[108px]">
            {format.name}
          </h1>
          <p className="mt-7 max-w-2xl text-2xl font-black leading-tight text-[#30374b] sm:text-3xl">
            {format.promise}
          </p>
          <p className="mt-6 text-sm font-bold text-[#596176]">
            By{" "}
            {creator ? (
              <Link href={`/creators/${creator.handle}`} className="font-black text-[#080817] underline decoration-2 underline-offset-4">
                {format.creator}
              </Link>
            ) : (
              <strong className="text-[#080817]">{format.creator}</strong>
            )}{" "}
            · Updated {format.lastUpdated}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#proof"
              className="inline-flex min-h-12 items-center gap-2 rounded-md border-2 border-[#080817] bg-[#080817] px-5 text-sm font-black text-white shadow-[4px_4px_0_#52d6ff]"
            >
              See the proof
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            {format.handoff ? <DiscoveryFormatHandoff format={format} /> : null}
            {format.technicalHref ? (
              <Link
                href={format.technicalHref}
                className="inline-flex min-h-12 items-center gap-2 rounded-md border-2 border-[#080817] bg-white px-5 text-sm font-black"
              >
                Technical proof
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[440px] overflow-hidden rounded-lg border-2 border-[#080817] bg-[#080817] shadow-[8px_8px_0_#080817]">
          <DiscoveryProofMedia
            entry={heroProof}
            autoPlay={heroProof.media.kind === "video"}
            className="block aspect-[9/16] w-full object-cover"
          />
        </div>
      </section>

      <section id="proof" className="scroll-mt-6 border-y-2 border-[#080817] bg-[#fffdf8] px-4 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">Repeatability proof</p>
              <h2 className="mt-3 text-5xl font-black leading-[0.9] sm:text-7xl">Same recipe. New story.</h2>
            </div>
            <p className="max-w-2xl text-lg font-bold leading-8 text-[#596176]">
              {format.proofEntries.length} finished {format.proofEntries.length === 1 ? "example shows" : "examples show"} what
              the Format can hold onto while the brand and idea change.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {format.proofEntries.map((entry, index) => (
              <article
                key={entry.id}
                className="overflow-hidden rounded-lg border-2 border-[#080817] bg-white shadow-[5px_5px_0_#080817]"
              >
                <DiscoveryProofMedia
                  entry={entry}
                  autoPlay={false}
                  className="block aspect-[9/16] w-full bg-[#080817] object-cover"
                />
                <div className="p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#667087]">
                    Proof {String(index + 1).padStart(2, "0")} · {entry.brand}
                  </p>
                  <h3 className="mt-2 text-2xl font-black leading-none">{entry.title}</h3>
                  <Link href={`/s/${entry.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-black">
                    Open finished ad
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-[min(100%-32px,1100px)] gap-5 py-12 sm:py-16 lg:grid-cols-2">
        <div className="rounded-lg border-2 border-[#080817] bg-[#c9ff55] p-6 shadow-[6px_6px_0_#080817] sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em]">What stays the same</p>
          <ul className="mt-6 grid gap-4">
            {format.whatStays.map((item) => (
              <li key={item} className="border-t-2 border-[#080817] pt-4 text-2xl font-black leading-tight">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border-2 border-[#080817] bg-white p-6 shadow-[6px_6px_0_#080817] sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">What changes</p>
          <ul className="mt-6 grid gap-4">
            {format.whatChanges.map((item) => (
              <li key={item} className="border-t-2 border-[#080817] pt-4 text-2xl font-black leading-tight">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t-2 border-[#080817] bg-[#fffdf8] px-4 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-[1100px]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">Run it with an agent</p>
          <div className="mt-3 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="text-4xl font-black leading-none sm:text-6xl">
                {format.handoff ? "Know the run before you start." : "Handoff is not live yet."}
              </h2>
              <p className="mt-5 max-w-xl text-lg font-bold leading-7 text-[#596176]">
                {format.handoff
                  ? "The task is pinned to this exact public version. Codex asks one short question at a time and names the current step."
                  : "This Format has public proof, but Wiggly is not offering a broken agent option before the runbook is ready."}
              </p>
              {format.handoff ? <div className="mt-7"><DiscoveryFormatHandoff format={format} /></div> : null}
            </div>

            {format.handoff ? (
              <div className="rounded-lg border-2 border-[#080817] bg-white shadow-[6px_6px_0_#080817]">
                <div className="border-b-2 border-[#080817] px-5 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em]">Typical run</p>
                </div>
                <div className="divide-y-2 divide-[#dbe2ee]">
                  {format.handoff.estimates.map((estimate) => (
                    <div key={estimate.label} className="grid grid-cols-[1fr_auto] gap-5 px-5 py-4 text-sm">
                      <strong>{estimate.label}</strong>
                      <span className="text-right font-bold text-[#596176]">{estimate.cost} · {estimate.time}</span>
                    </div>
                  ))}
                </div>
                <p className="border-t-2 border-[#080817] bg-[#f5f1e8] px-5 py-4 text-sm font-black">{format.handoff.totalEstimate}</p>
                <div className="grid gap-4 px-5 py-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#667087]">You provide</p>
                    <p className="mt-1 text-sm font-bold text-[#30374b]">{format.handoff.requiredInputs.join(" · ")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#667087]">Output</p>
                    <p className="mt-1 text-sm font-bold text-[#30374b]">{format.handoff.output}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
