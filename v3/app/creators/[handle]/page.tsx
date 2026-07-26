import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  discoveryCreators,
  getDiscoveryCreatorByHandle,
  getDiscoveryEntriesByCreator,
} from "@/features/discovery/creators";
import { DiscoveryProofMedia } from "@/features/discovery/DiscoveryProofMedia";

export function generateStaticParams() {
  return discoveryCreators.map((creator) => ({ handle: creator.handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const creator = getDiscoveryCreatorByHandle(handle);
  if (!creator) return {};

  return {
    title: `${creator.name} | Wiggly Creator`,
    description: `${creator.bio} See finished ads and reusable Formats by ${creator.name}.`,
  };
}

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const creator = getDiscoveryCreatorByHandle(handle);
  if (!creator) notFound();

  const entries = getDiscoveryEntriesByCreator(creator.name);
  const formats = [...new Map(entries.map((entry) => [entry.format.slug, entry.format])).values()];

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

      <section className="border-b-2 border-[#080817]">
        <div className="mx-auto grid w-[min(100%-32px,1200px)] gap-8 py-10 sm:grid-cols-[180px_1fr] sm:items-center sm:py-16">
          <div className="grid aspect-square w-[160px] place-items-center overflow-hidden rounded-lg border-2 border-[#080817] bg-white shadow-[7px_7px_0_#080817]">
            {creator.avatar.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.avatar.value} alt="" className="w-[82%]" />
            ) : (
              <span className="text-5xl font-black">{creator.avatar.value}</span>
            )}
          </div>
          <div>
            <span className="inline-flex items-center gap-2 rounded-md border-2 border-[#080817] bg-[#52d6ff] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]">
              <BadgeCheck className="size-4" aria-hidden="true" />
              Curated creator
            </span>
            <h1 className="mt-5 text-6xl font-black leading-[0.88] sm:text-8xl">{creator.name}</h1>
            <p className="mt-5 max-w-2xl text-xl font-bold leading-8 text-[#596176]">{creator.bio}</p>
            <p className="mt-4 text-sm font-black">
              {entries.length} finished ads · {formats.length} reusable {formats.length === 1 ? "Format" : "Formats"}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-[min(100%-32px,1200px)] py-10 sm:py-14">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">Formats</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {formats.map((format) => (
            <Link
              key={format.slug}
              href={`/formats/${format.slug}`}
              className="inline-flex min-h-12 items-center gap-2 rounded-md border-2 border-[#080817] bg-white px-5 text-sm font-black shadow-[3px_3px_0_#080817]"
            >
              {format.name} · v{format.version}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ))}
        </div>

        <div className="mt-12 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">Finished work</p>
            <h2 className="mt-2 text-4xl font-black leading-none sm:text-6xl">Proof before promises.</h2>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <article key={entry.id} className="overflow-hidden rounded-lg border-2 border-[#080817] bg-white shadow-[5px_5px_0_#080817]">
              <DiscoveryProofMedia entry={entry} autoPlay={false} className="block aspect-[9/16] w-full bg-[#080817] object-cover" />
              <div className="p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#667087]">{entry.brand}</p>
                <h3 className="mt-2 text-2xl font-black leading-none">{entry.title}</h3>
                <Link href={`/s/${entry.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-black">
                  Open finished ad
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
