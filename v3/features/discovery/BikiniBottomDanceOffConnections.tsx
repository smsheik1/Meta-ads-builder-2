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

  return (
    <section
      id="accounts-youll-connect"
      aria-labelledby="accounts-youll-connect-title"
      className="border-y-2 border-[#080817] bg-[#dff8ff] px-4 py-[58px] text-[#080817] sm:px-7"
    >
      <div className="mx-auto max-w-[980px]">
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

        <div className="mt-6 overflow-hidden border-2 border-[#080817] bg-white">
          <ul className="divide-y-2 divide-[#080817]">
            <li className="grid grid-cols-2 gap-x-4 gap-y-3 px-[18px] py-[18px] min-[701px]:grid-cols-[1.15fr_1fr_0.72fr_0.9fr_auto] min-[701px]:items-center min-[701px]:gap-[18px]">
              <ServiceValue label="Service">
                <strong className="text-xl font-black">{provider.name}</strong>
                <small className="mt-1 block text-xs font-bold text-[#667087]">
                  API key
                </small>
              </ServiceValue>
              <ServiceValue label="Used for">Character voices</ServiceValue>
              <ServiceValue label="Need">
                <span className="inline-flex items-center gap-2 text-sm font-black">
                  <span
                    className="size-3 rounded-full border-2 border-[#080817] bg-[#ff78bd]"
                    aria-hidden="true"
                  />
                  Required
                </span>
              </ServiceValue>
              <ServiceValue label="Cost">
                <strong>Free tier available</strong>
                <a
                  href={provider.pricingSource}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-xs font-black underline decoration-2 underline-offset-2"
                >
                  Check pricing
                </a>
              </ServiceValue>
              <a
                href={fishAudioKeyUrl}
                target="_blank"
                rel="noreferrer"
                className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-2 border-[#080817] bg-[#c9ff55] px-4 text-sm font-black text-[#080817] shadow-[3px_3px_0_#080817] min-[701px]:col-span-1"
              >
                Get key
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </li>

            <li className="grid grid-cols-2 gap-x-4 gap-y-3 px-[18px] py-[18px] min-[701px]:grid-cols-[1.15fr_1fr_0.72fr_0.9fr_auto] min-[701px]:items-center min-[701px]:gap-[18px]">
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
                <span className="inline-flex items-center gap-2 text-sm font-black">
                  <span
                    className="size-3 rounded-full border-2 border-[#080817] bg-[#ffd84c]"
                    aria-hidden="true"
                  />
                  Optional
                </span>
              </ServiceValue>
              <ServiceValue label="Cost">
                <strong>Free</strong>
                <a
                  href={mixamoPricingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-xs font-black underline decoration-2 underline-offset-2"
                >
                  Pricing details
                </a>
              </ServiceValue>
              <a
                href={mixamoUrl}
                target="_blank"
                rel="noreferrer"
                className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-2 border-[#080817] bg-white px-4 text-sm font-black shadow-[3px_3px_0_#080817] min-[701px]:col-span-1"
              >
                Open
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>

        <p className="mt-4 flex items-start gap-2 text-sm font-bold leading-6">
          <KeyRound className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>
            <strong>What’s an API key?</strong> A private code that lets your
            agent use Fish Audio. Wiggly never sees it.
          </span>
        </p>
        <details className="group mt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black [&::-webkit-details-marker]:hidden">
            How do I connect Fish Audio?
            <ChevronDown
              className="size-5 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
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
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-[#667087] min-[701px]:hidden">
        {label}
      </span>
      {children}
    </div>
  );
}
