import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Download,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscoveryProofMedia } from "@/features/discovery/DiscoveryProofMedia";
import { DiscoveryFormatHandoff } from "@/features/discovery/DiscoveryFormatHandoff";
import { DiscoveryCharacterOptions } from "@/features/discovery/DiscoveryCharacterOptions";
import {
  FormatRepoConnections,
  FormatRepoIncludedAssets,
} from "@/features/discovery/FormatRepoPageSections";
import { FormatRepoRunSummary } from "@/features/discovery/FormatRepoRunSummary";
import { FormatRepoTrust } from "@/features/discovery/FormatRepoTrust";
import { getDiscoveryCreatorByName } from "@/features/discovery/creators";
import {
  getFormatRepoFamily,
  getFormatRepoPagePresentation,
} from "@/features/discovery/formatRepoPage.server";
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
    description: format.repositoryHref
      ? `${format.promise} Download version ${format.version} and inspect its saved proof.`
      : `${format.promise} See real saved proof for version ${format.version}.`,
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
  const heroIsLandscapeVideo =
    heroProof.media.kind === "video" && heroProof.media.aspectRatio === "16:9";
  const repoPage = await getFormatRepoPagePresentation(slug);
  const repoFamily = getFormatRepoFamily(slug);
  const repoTrust = repoPage?.trust;
  const repoPageCopy = repoPage?.copy;
  const detailedProof = repoPage?.detailedProofId
    ? format.proofEntries.find(
        (entry) => entry.id === repoPage.detailedProofId,
      ) || heroProof
    : heroProof;

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#080817]">
      <header className="border-b-2 border-[#080817]">
        <div className="mx-auto flex min-h-[66px] w-[min(100%-32px,980px)] items-center justify-between gap-4">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 text-sm font-black"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Discovery
          </Link>
          <Link href="/" aria-label="Wiggly home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="w-28 sm:w-36"
              src="/wiggly-wordmark-3d-crop.png"
              alt="Wiggly"
            />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-[min(100%-32px,980px)] gap-[38px] py-9 md:grid-cols-[1.15fr_0.85fr] md:items-center md:py-14">
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

          <h1 className="mt-6 text-[clamp(42px,6vw,72px)] font-black leading-[0.92] tracking-[-0.055em]">
            {format.name}
          </h1>
          <p className="mt-[18px] max-w-2xl text-lg font-bold leading-[1.42] text-[#424254]">
            {format.promise}
          </p>
          <p className="mt-[18px] text-[13px] font-bold text-[#596176]">
            By{" "}
            {creator ? (
              <Link
                href={`/creators/${creator.handle}`}
                className="font-black text-[#080817] underline decoration-2 underline-offset-4"
              >
                {format.creator}
              </Link>
            ) : (
              <strong className="text-[#080817]">{format.creator}</strong>
            )}{" "}
            · Updated {format.lastUpdated}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#examples"
              className="inline-flex min-h-12 items-center gap-2 rounded-md border-2 border-[#080817] bg-[#080817] px-5 text-sm font-black text-white shadow-[4px_4px_0_#52d6ff]"
            >
              See examples
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
            {format.repositoryHref ? (
              <a
                href={format.repositoryHref}
                download
                className="inline-flex min-h-12 items-center gap-2 rounded-md border-2 border-[#080817] bg-[#c9ff55] px-5 text-sm font-black"
              >
                Download runnable Repo
                <Download className="size-4" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>

        <div
          className={`mx-auto w-full overflow-hidden rounded-[12px] border-2 border-[#080817] bg-[#080817] shadow-[8px_8px_0_#080817] ${
            heroIsLandscapeVideo ? "max-w-[760px]" : "max-w-[310px]"
          }`}
        >
          <DiscoveryProofMedia
            entry={heroProof}
            autoPlay={heroProof.media.kind === "video"}
            className={
              heroProof.media.kind === "image"
                ? "block aspect-[3/4] w-full object-cover"
                : heroIsLandscapeVideo
                  ? "block aspect-video w-full bg-[#080817] object-contain"
                  : "block aspect-[9/16] w-full object-cover"
            }
          />
        </div>
      </section>

      {format.characterOptions?.length ? (
        <section
          id="anchors"
          className="border-y-2 border-[#080817] bg-[#52d6ff] px-4 py-12 sm:px-8 sm:py-16"
        >
          <div className="mx-auto max-w-[1180px]">
            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em]">
                  Character options
                </p>
                <h2 className="mt-3 text-5xl font-black leading-[0.88] sm:text-7xl">
                  Choose your anchor.
                </h2>
              </div>
              <div>
                <p className="max-w-2xl text-lg font-black leading-7 text-[#1e3850]">
                  Squilliam and three more verified 3D presenters are ready to
                  make your story sound completely different.
                </p>
                <p className="mt-3 text-sm font-bold text-[#31566e]">
                  Drag a model to inspect it, or tap play to audition its voice.
                  Models return to attention after three seconds.
                </p>
              </div>
            </div>
            <DiscoveryCharacterOptions options={format.characterOptions} />
          </div>
        </section>
      ) : null}

      {repoFamily ? (
        <section
          aria-labelledby="repo-family-title"
          className="border-y-2 border-[#080817] bg-[#dff8ff] px-4 py-10 sm:px-8 sm:py-12"
          data-testid="shared-repo-family"
        >
          <div className="mx-auto grid max-w-[980px] gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#31566e]">
                Shared Wiggly Repo
              </p>
              <h2
                id="repo-family-title"
                className="mt-3 text-4xl font-black leading-[0.92] sm:text-6xl"
              >
                One Repo. {repoFamily.formatCount} format recipes.
              </h2>
            </div>
            <div>
              <p className="max-w-2xl text-lg font-bold leading-8 text-[#30374b]">
                <strong>{format.name}</strong> is one recipe inside the shared{" "}
                {repoFamily.name} Repo—not a separate Repo to install or
                explain.
              </p>
              <Link
                href={repoFamily.discoveryHref}
                className="mt-5 inline-flex items-center gap-2 text-sm font-black"
              >
                See the full recipe family
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {repoPage ? <FormatRepoConnections presentation={repoPage} /> : null}

      {repoPage ? (
        <FormatRepoIncludedAssets presentation={repoPage} />
      ) : (
        <section className="border-y-2 border-[#080817] bg-[#fffdf8] px-4 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto grid max-w-[980px] gap-5 lg:grid-cols-2">
            <div className="rounded-lg border-2 border-[#080817] bg-[#c9ff55] p-6 shadow-[6px_6px_0_#080817] sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.18em]">
                What the Repo keeps
              </p>
              <ul className="mt-6 grid gap-4">
                {format.whatStays.map((item) => (
                  <li
                    key={item}
                    className="border-t-2 border-[#080817] pt-4 text-xl font-black leading-tight"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border-2 border-[#080817] bg-white p-6 shadow-[6px_6px_0_#080817] sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">
                What you change
              </p>
              <ul className="mt-6 grid gap-4">
                {format.whatChanges.map((item) => (
                  <li
                    key={item}
                    className="border-t-2 border-[#080817] pt-4 text-xl font-black leading-tight"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section
        id="examples"
        className="scroll-mt-6 border-y-2 border-[#080817] bg-[#fffdf8] px-4 py-12 sm:px-8 sm:py-16"
      >
        <div className="mx-auto max-w-[980px]">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              {repoPageCopy?.examplesTitle === "Examples" ? null : (
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">
                  Examples
                </p>
              )}
              <h2 className="mt-3 text-5xl font-black leading-[0.9] sm:text-7xl">
                {repoPageCopy?.examplesTitle ?? "Finished examples."}
              </h2>
            </div>
            <p className="max-w-2xl text-lg font-bold leading-8 text-[#596176]">
              {repoPageCopy?.examplesDescription ??
                `${format.proofEntries.length} finished ${
                  format.proofEntries.length === 1
                    ? "example shows"
                    : "examples show"
                } how the same Repo handles a different input.`}
            </p>
          </div>

          <div
            className={`mt-10 grid gap-6 sm:grid-cols-2 ${
              format.proofEntries.length > 4 ? "lg:grid-cols-3" : ""
            }`}
          >
            {format.proofEntries.map((entry, index) => (
              <article
                key={entry.id}
                className="overflow-hidden rounded-lg border-2 border-[#080817] bg-white shadow-[5px_5px_0_#080817]"
              >
                <DiscoveryProofMedia
                  entry={entry}
                  autoPlay={false}
                  className={
                    entry.media.kind === "image"
                      ? "block aspect-[3/4] w-full bg-[#080817] object-cover"
                      : entry.media.aspectRatio === "16:9"
                        ? "block aspect-video w-full bg-[#080817] object-contain"
                        : "block aspect-[9/16] w-full bg-[#080817] object-cover"
                  }
                />
                <div className="p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#667087]">
                    Example {String(index + 1).padStart(2, "0")} · {entry.brand}
                  </p>
                  <h3 className="mt-2 text-2xl font-black leading-none">
                    {entry.title}
                  </h3>
                  <Link
                    href={`/s/${entry.id}`}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-black"
                  >
                    Open finished ad
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {repoTrust &&
      detailedProof.media.kind === "video" &&
      format.repositoryHref ? (
        <FormatRepoTrust
          data={repoTrust}
          openProofHref={`/s/${detailedProof.id}`}
          poster={detailedProof.media.poster}
          repositoryHref={format.repositoryHref}
          videoSrc={detailedProof.media.src}
        />
      ) : null}

      <FormatRepoRunSummary
        format={format}
        description={repoPageCopy?.runDescription}
      />
    </main>
  );
}
