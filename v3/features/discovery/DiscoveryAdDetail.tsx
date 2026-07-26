import { ArrowLeft, ArrowRight, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { getRelatedDiscoveryEntries } from "./catalog";
import { DiscoveryDetailActions } from "./DiscoveryDetailActions";
import { DiscoveryProofMedia } from "./DiscoveryProofMedia";
import { getDiscoveryFormatProfile } from "./formatProof.server";
import type { DiscoveryEntry } from "./types";

export function DiscoveryAdDetail({ entry }: { entry: DiscoveryEntry }) {
  const format = getDiscoveryFormatProfile(entry.format.slug);
  const related = getRelatedDiscoveryEntries(entry);

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

      <section className="mx-auto grid w-[min(100%-32px,1240px)] gap-8 py-8 lg:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-14 lg:py-12">
        <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-lg border-2 border-[#080817] bg-[#080817] shadow-[8px_8px_0_#080817]">
          <DiscoveryProofMedia
            entry={entry}
            autoPlay={entry.media.kind === "video"}
            className="block aspect-[9/16] w-full object-cover"
          />
        </div>

        <aside className="rounded-lg border-2 border-[#080817] bg-white p-6 shadow-[8px_8px_0_#080817] sm:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border-2 border-[#080817] bg-[#52d6ff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
              Finished ad
            </span>
            <span className="rounded-md border-2 border-[#080817] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
              {entry.media.durationLabel}
            </span>
          </div>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-[#667087]">{entry.brand}</p>
          <h1 className="mt-3 text-5xl font-black leading-[0.9] tracking-normal sm:text-7xl">{entry.title}</h1>

          {format ? (
            <Link
              href={`/formats/${format.slug}`}
              className="mt-8 block rounded-lg border-2 border-[#080817] bg-[#f5f1e8] p-5 transition hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-[#667087]">
                <BadgeCheck className="size-4 text-[#00a7d6]" aria-hidden="true" />
                Made with {format.name} · v{format.version}
              </span>
              <strong className="mt-3 block text-xl leading-tight">{format.promise}</strong>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-black">
                See why it repeats
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          ) : null}

          <div className="mt-8 border-t-2 border-[#080817] pt-6">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#667087]">Why it works</p>
            <p className="mt-3 text-lg font-bold leading-7 text-[#30374b]">{entry.curatorNote}</p>
          </div>

          <p className="mt-6 text-sm font-bold text-[#596176]">
            Format by <strong className="text-[#080817]">{entry.format.owner}</strong>
          </p>
          <div className="mt-7">
            <DiscoveryDetailActions entryId={entry.id} title={entry.title} />
          </div>
        </aside>
      </section>

      {related.length > 0 ? (
        <section className="border-t-2 border-[#080817] bg-[#fffdf8] px-4 py-12 sm:px-8">
          <div className="mx-auto max-w-[1240px]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">Same exact Format</p>
            <h2 className="mt-3 text-4xl font-black leading-none sm:text-6xl">More proof, different brands.</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((candidate) => (
                <Link
                  key={candidate.id}
                  href={`/s/${candidate.id}`}
                  className="overflow-hidden rounded-lg border-2 border-[#080817] bg-white shadow-[5px_5px_0_#080817] transition hover:-translate-y-1"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="aspect-[9/11] w-full object-cover object-top"
                    src={candidate.media.poster || candidate.media.src}
                    alt=""
                  />
                  <div className="p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#667087]">{candidate.brand}</p>
                    <h3 className="mt-2 text-2xl font-black leading-none">{candidate.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
