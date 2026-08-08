import {
  Check,
  ChevronDown,
  ExternalLink,
  KeyRound,
  LockKeyhole,
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

  const apiKeyName =
    data.requirements.environmentVariables[0] ?? "FISH_STUDIO_APIKEY";

  return (
    <section
      id="accounts-youll-connect"
      aria-labelledby="accounts-youll-connect-title"
      className="border-y-2 border-[#080817] bg-[#dff8ff] px-4 py-12 text-[#080817] sm:px-8 sm:py-16"
    >
      <div className="mx-auto max-w-[960px]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#31566e]">
          Before you start
        </p>
        <h2
          id="accounts-youll-connect-title"
          className="mt-3 text-5xl font-black leading-[0.9] sm:text-7xl"
        >
          One account needed.
        </h2>

        <article className="mt-7 overflow-hidden rounded-xl border-2 border-[#080817] bg-[#fffdf8] shadow-[7px_7px_0_#080817]">
          <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-3xl font-black">{provider.name}</h3>
                <span className="rounded-full border-2 border-[#080817] bg-[#ff78bd] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                  Required
                </span>
              </div>
              <p className="mt-2 text-lg font-bold text-[#596176]">
                Creates the character voices.
              </p>
            </div>

            <a
              href={fishAudioKeyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-2 border-[#080817] bg-[#080817] px-5 text-sm font-black text-white shadow-[4px_4px_0_#52d6ff]"
            >
              Get a Fish Audio key
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </div>

          <div className="flex gap-3 border-t-2 border-[#080817] bg-[#ffd84c] p-5 sm:p-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-md border-2 border-[#080817] bg-white">
              <KeyRound className="size-5" aria-hidden="true" />
            </span>
            <p className="max-w-2xl text-sm font-bold leading-6">
              <strong>What’s an API key?</strong> A private code that lets your
              agent use Fish Audio. Creating one takes about two minutes, and
              Wiggly never sees it.
            </p>
          </div>

          <details className="group border-t-2 border-[#080817] bg-white">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-sm font-black [&::-webkit-details-marker]:hidden">
              How do I connect it?
              <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t-2 border-[#080817] bg-[#f5f1e8] p-5 sm:p-6">
              <ol className="grid gap-3 text-sm font-bold leading-6">
                <li className="flex gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-[#0088ad]" aria-hidden="true" />
                  Create a key on Fish Audio’s API Keys page.
                </li>
                <li className="flex gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-[#0088ad]" aria-hidden="true" />
                  <span>
                    Give it to your coding agent when asked. The agent saves it
                    privately as{" "}
                    <code className="inline-block max-w-full break-all rounded bg-white px-1.5">{apiKeyName}</code>.
                  </span>
                </li>
              </ol>
              <p className="mt-5 flex items-start gap-2 rounded-lg border-2 border-[#080817] bg-[#c9ff55] p-4 text-sm font-bold leading-6">
                <LockKeyhole className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                Never paste the key into Wiggly or commit it to Git. It stays on
                your computer.
              </p>
            </div>
          </details>
        </article>
      </div>
    </section>
  );
}
