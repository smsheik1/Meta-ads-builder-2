import { FileAudio, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { AnimalConversationsTrustData } from "./animalConversationsTrust.server";

export function AnimalConversationsConnections({
  data,
}: {
  data: AnimalConversationsTrustData;
}) {
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
            0 media APIs · $0 provider cost
          </p>
        </div>

        <div className="mt-6 overflow-hidden border-2 border-[#080817] bg-white">
          <ul className="divide-y-2 divide-[#080817]">
            <li className="grid grid-cols-2 gap-x-4 gap-y-3 px-[18px] py-[18px] min-[701px]:grid-cols-[1.15fr_1fr_0.72fr_0.9fr] min-[701px]:items-center min-[701px]:gap-[18px]">
              <ServiceValue label="Input">
                <strong className="text-xl font-black">
                  Conversation clip
                </strong>
                <small className="mt-1 block text-xs font-bold text-[#667087]">
                  Supported link or local file
                </small>
              </ServiceValue>
              <ServiceValue label="Used for">
                The complete performance and final soundtrack
              </ServiceValue>
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
                <strong>Your supplied clip</strong>
              </ServiceValue>
            </li>

            <li className="grid grid-cols-2 gap-x-4 gap-y-3 px-[18px] py-[18px] min-[701px]:grid-cols-[1.15fr_1fr_0.72fr_0.9fr] min-[701px]:items-center min-[701px]:gap-[18px]">
              <ServiceValue label="Tools">
                <strong className="text-xl font-black">Local runtime</strong>
                <small className="mt-1 block text-xs font-bold text-[#667087]">
                  {data.requirements.localTools.join(" · ")}
                </small>
              </ServiceValue>
              <ServiceValue label="Used for">
                Validation, rendering, audio muxing, and inspection
              </ServiceValue>
              <ServiceValue label="Need">
                <span className="inline-flex items-center gap-2 text-sm font-black">
                  <span
                    className="size-3 rounded-full border-2 border-[#080817] bg-[#c9ff55]"
                    aria-hidden="true"
                  />
                  Included workflow
                </span>
              </ServiceValue>
              <ServiceValue label="Cost">
                <strong>Free</strong>
              </ServiceValue>
            </li>
          </ul>
        </div>

        <p className="mt-4 flex items-start gap-2 text-sm font-bold leading-6">
          <FileAudio className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>
            <strong>You provide the clip.</strong> The agent extracts the audio
            and writes the dialogue timing. If a link can’t be downloaded, send
            the local file instead. Source media stays local and private.
          </span>
        </p>
        <p className="mt-3 flex items-start gap-2 text-sm font-bold leading-6 text-[#31566e]">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          No AI image or video credits needed, and no dedicated GPU. Local
          transcription uses Python 3.12 and a one-time download of about 486 MB.
          Your coding agent may have its own fees or usage limits.
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
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-[#667087] min-[701px]:hidden">
        {label}
      </span>
      {children}
    </div>
  );
}
