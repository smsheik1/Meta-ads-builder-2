import {
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  Volume2,
} from "lucide-react";
import type { BikiniBottomDanceOffTrustData } from "./bikiniBottomDanceOffTrust.server";

const fishAudioKeyUrl = "https://fish.audio/app/api-keys/";

export function BikiniBottomDanceOffConnections({
  data,
}: {
  data: BikiniBottomDanceOffTrustData;
}) {
  const provider = data.requirements.providers[0];
  if (!provider) return null;

  const [apiKeyName = "FISH_STUDIO_APIKEY", voiceIdName = "SQUILLIAM_VOICE_ID"] =
    data.requirements.environmentVariables;
  const costSummary = provider.estimatedCost.split(" under ")[0];

  return (
    <section
      id="accounts-youll-connect"
      aria-labelledby="accounts-youll-connect-title"
      className="border-y-2 border-[#080817] bg-[#dff8ff] px-4 py-12 text-[#080817] sm:px-8 sm:py-16"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#31566e]">
              Before you run it
            </p>
            <h2
              id="accounts-youll-connect-title"
              className="mt-3 max-w-3xl text-5xl font-black leading-[0.9] sm:text-7xl"
            >
              Accounts you’ll connect.
            </h2>
            <p className="mt-5 max-w-2xl text-lg font-bold leading-7 text-[#31566e]">
              This Format uses one outside service when it needs fresh character
              dialogue. Everything else runs locally from the Repo.
            </p>
          </div>

          <aside className="rounded-lg border-2 border-[#080817] bg-[#ffd84c] p-5 shadow-[5px_5px_0_#080817]">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-md border-2 border-[#080817] bg-white">
                <KeyRound className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-xl font-black">What’s an API key?</h3>
                <p className="mt-2 text-sm font-bold leading-6">
                  A private password that lets your agent use another service
                  for you. You create it once and keep it on your computer.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <article className="mt-8 overflow-hidden rounded-xl border-2 border-[#080817] bg-[#fffdf8] shadow-[7px_7px_0_#080817]">
          <div className="grid gap-5 border-b-2 border-[#080817] p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-lg border-2 border-[#080817] bg-[#52d6ff]">
                <Volume2 className="size-7" aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-3xl font-black">{provider.name}</h3>
                  <span className="rounded-full border-2 border-[#080817] bg-[#ff78bd] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                    Required for new dialogue
                  </span>
                </div>
                <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[#596176]">
                  Creates the opening, taunts, and closing line in four
                  character voices. If valid dialogue is already cached, the
                  Format reuses it without another provider call.
                </p>
              </div>
            </div>

            <a
              href={fishAudioKeyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-2 border-[#080817] bg-[#080817] px-5 text-sm font-black text-white shadow-[4px_4px_0_#52d6ff]"
            >
              Get Fish Audio key
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </div>

          <dl className="grid divide-y-2 divide-[#080817] sm:grid-cols-3 sm:divide-x-2 sm:divide-y-0">
            <div className="p-5">
              <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[#667087]">
                Used for
              </dt>
              <dd className="mt-2 text-lg font-black">Character dialogue</dd>
            </div>
            <div className="p-5">
              <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[#667087]">
                Current estimate
              </dt>
              <dd className="mt-2 text-lg font-black">{costSummary}</dd>
              <a
                href={provider.pricingSource}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-black underline decoration-2 underline-offset-2"
              >
                Check current pricing
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </div>
            <div className="p-5">
              <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[#667087]">
                Setup time
              </dt>
              <dd className="mt-2 flex items-center gap-2 text-lg font-black">
                <Clock3 className="size-5" aria-hidden="true" /> About 2 minutes
              </dd>
            </div>
          </dl>

          <details className="group border-t-2 border-[#080817] bg-white">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-sm font-black [&::-webkit-details-marker]:hidden">
              Show me how to connect it
              <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="grid gap-5 border-t-2 border-[#080817] bg-[#f5f1e8] p-5 lg:grid-cols-[1fr_0.9fr]">
              <ol className="grid gap-3 text-sm font-bold leading-6">
                <li className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#080817] text-xs text-white">1</span>
                  <span>Sign in to Fish Audio, open its API Keys page, and create a key.</span>
                </li>
                <li className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#080817] text-xs text-white">2</span>
                  <span>
                    Ask your agent to save it privately as{" "}
                    <code className="inline-block max-w-full break-all rounded bg-white px-1.5">{apiKeyName}</code>.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#080817] text-xs text-white">3</span>
                  <span>
                    If you use Squilliam, add the private voice-clone ID as{" "}
                    <code className="inline-block max-w-full break-all rounded bg-white px-1.5">{voiceIdName}</code>.
                  </span>
                </li>
              </ol>
              <div className="rounded-lg border-2 border-[#080817] bg-[#c9ff55] p-4">
                <p className="flex items-center gap-2 text-sm font-black">
                  <LockKeyhole className="size-5" aria-hidden="true" /> Keep it private
                </p>
                <p className="mt-2 text-sm font-bold leading-6">
                  Never paste the key into Wiggly or commit it to Git. It stays
                  in your local environment file, where your agent can use it
                  without printing it.
                </p>
              </div>
            </div>
          </details>
        </article>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border-2 border-[#080817] bg-white px-5 py-4 text-sm font-black">
          <span className="inline-flex items-center gap-2">
            <Check className="size-5 text-[#0088ad]" aria-hidden="true" /> No API key needed for
          </span>
          <span className="rounded-full bg-[#f5f1e8] px-3 py-1">{data.stats.motions} included dances</span>
          <span className="rounded-full bg-[#f5f1e8] px-3 py-1">{data.stats.backgrounds} backgrounds</span>
          <span className="rounded-full bg-[#f5f1e8] px-3 py-1">3D animation</span>
          <span className="rounded-full bg-[#f5f1e8] px-3 py-1">MP4 rendering</span>
        </div>
      </div>
    </section>
  );
}
