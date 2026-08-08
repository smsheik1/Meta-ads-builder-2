import { ChevronDown, ExternalLink, KeyRound } from "lucide-react";
import type { ReactNode } from "react";
import type { BikiniBottomDanceOffTrustData } from "./bikiniBottomDanceOffTrust.server";

const fishAudioKeyUrl = "https://fish.audio/app/api-keys/";
const mixamoUrl = "https://www.mixamo.com/";
const mixamoPricingUrl =
  "https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html";

export function BikiniBottomDanceOffConnections({
  data,
}: {
  data: BikiniBottomDanceOffTrustData;
}) {
  const provider = data.requirements.providers[0];
  if (!provider) return null;

  const apiKeyName =
    data.requirements.environmentVariables[0] ?? "FISH_STUDIO_APIKEY";
  const fishAudioCost = provider.estimatedCost.startsWith("$0")
    ? "Free*"
    : provider.estimatedCost;

  return (
    <section
      id="accounts-youll-connect"
      aria-labelledby="accounts-youll-connect-title"
      className="border-y-2 border-[#080817] bg-[#dff8ff] px-4 py-10 text-[#080817] sm:px-8 sm:py-12"
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#31566e]">
              Before you start
            </p>
            <h2
              id="accounts-youll-connect-title"
              className="mt-2 text-4xl font-black leading-none sm:text-5xl"
            >
              Services &amp; costs
            </h2>
          </div>
          <p className="text-sm font-black text-[#31566e]">
            1 required · 1 optional
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border-2 border-[#080817] bg-white">
          <div
            aria-hidden="true"
            className="hidden grid-cols-[1.1fr_1.35fr_0.9fr_0.65fr_auto] gap-4 border-b-2 border-[#080817] bg-[#f5f1e8] px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#667087] md:grid"
          >
            <span>Service</span>
            <span>Used for</span>
            <span>Need</span>
            <span>Cost</span>
            <span className="sr-only">Action</span>
          </div>

          <ul className="divide-y-2 divide-[#080817]">
            <li className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-5 md:grid-cols-[1.1fr_1.35fr_0.9fr_0.65fr_auto] md:items-center md:gap-4">
              <ServiceValue label="Service">
                <strong className="text-xl font-black">{provider.name}</strong>
                <small className="mt-1 block text-xs font-bold text-[#667087]">
                  API key
                </small>
              </ServiceValue>
              <ServiceValue label="Used for">Character voices</ServiceValue>
              <ServiceValue label="Need">
                <span className="inline-flex rounded-full border-2 border-[#080817] bg-[#ff78bd] px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em]">
                  Required
                </span>
              </ServiceValue>
              <ServiceValue label="Cost">
                <strong>{fishAudioCost}</strong>
              </ServiceValue>
              <a
                href={fishAudioKeyUrl}
                target="_blank"
                rel="noreferrer"
                className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-2 border-[#080817] bg-[#080817] px-4 text-sm font-black text-white md:col-span-1"
              >
                Get key
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </li>

            <li className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-5 md:grid-cols-[1.1fr_1.35fr_0.9fr_0.65fr_auto] md:items-center md:gap-4">
              <ServiceValue label="Service">
                <strong className="text-xl font-black">Mixamo</strong>
                <small className="mt-1 block text-xs font-bold text-[#667087]">
                  Adobe account
                </small>
              </ServiceValue>
              <ServiceValue label="Used for">
                Extra dances
                <small className="mt-1 block text-xs font-bold text-[#667087]">
                  {data.stats.motions} are already included
                </small>
              </ServiceValue>
              <ServiceValue label="Need">
                <span className="inline-flex rounded-full border-2 border-[#080817] bg-[#ffd84c] px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em]">
                  Optional
                </span>
              </ServiceValue>
              <ServiceValue label="Cost">
                <strong>Free</strong>
              </ServiceValue>
              <a
                href={mixamoUrl}
                target="_blank"
                rel="noreferrer"
                className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-2 border-[#080817] bg-white px-4 text-sm font-black md:col-span-1"
              >
                Open
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </li>
          </ul>

          <div className="border-t-2 border-[#080817] bg-[#fffdf8] px-5 py-4">
            <p className="flex items-start gap-2 text-sm font-bold leading-6">
              <KeyRound className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span>
                <strong>What’s an API key?</strong> A private code that lets
                your agent use Fish Audio. Wiggly never sees it.
              </span>
            </p>
            <details className="group mt-3 border-t border-[#080817]/20 pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black [&::-webkit-details-marker]:hidden">
                How do I connect Fish Audio?
                <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-[#596176]">
                Create a key, then give it to your coding agent when asked. The
                agent saves it privately as{" "}
                <code className="inline-block max-w-full break-all rounded bg-[#f5f1e8] px-1.5 text-[#080817]">
                  {apiKeyName}
                </code>
                . Never paste it into Wiggly or commit it to Git.
              </p>
            </details>
          </div>
        </div>

        <p className="mt-3 text-xs font-bold leading-5 text-[#31566e]">
          * {provider.estimatedCost}.{" "}
          <a
            href={provider.pricingSource}
            target="_blank"
            rel="noreferrer"
            className="font-black underline decoration-2 underline-offset-2"
          >
            Check Fish Audio pricing
          </a>
          .{" "}
          <a
            href={mixamoPricingUrl}
            target="_blank"
            rel="noreferrer"
            className="font-black underline decoration-2 underline-offset-2"
          >
            Adobe says Mixamo is free with an Adobe ID
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function ServiceValue({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="text-sm font-bold">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-[#667087] md:hidden">
        {label}
      </span>
      {children}
    </div>
  );
}
