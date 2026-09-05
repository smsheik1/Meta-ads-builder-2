import { DiscoveryFormatHandoff } from "./DiscoveryFormatHandoff";
import type { DiscoveryFormatProfile } from "./types";

type Props = {
  description?: string;
  format: DiscoveryFormatProfile;
};

export function FormatRepoRunSummary({ description, format }: Props) {
  const handoff = format.handoff;

  return (
    <section
      id="run-with-agent"
      aria-labelledby="run-with-agent-title"
      className="scroll-mt-6 border-t-2 border-[#080817] bg-[#fffdf8] px-4 py-12 sm:px-8 sm:py-16"
    >
      <div className="mx-auto max-w-[1100px]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">
          Run it with a coding agent
        </p>
        <div
          className={`mt-3 grid gap-8 ${
            handoff ? "lg:grid-cols-[1fr_1.1fr]" : ""
          }`}
        >
          <div>
            <h2
              id="run-with-agent-title"
              className="text-4xl font-black leading-none sm:text-6xl"
            >
              {handoff
                ? "Know the run before you start."
                : "Handoff is not live yet."}
            </h2>
            <p className="mt-5 max-w-xl text-lg font-bold leading-7 text-[#596176]">
              {handoff
                ? (description ??
                  "The task is pinned to this exact public version. Codex asks one short question at a time and names the current step.")
                : "This Format has public proof, but Wiggly is not offering a broken agent option before the runbook is ready."}
            </p>
            {handoff ? (
              <div className="mt-7">
                <DiscoveryFormatHandoff format={format} />
              </div>
            ) : null}
          </div>

          {handoff ? (
            <div className="rounded-lg border-2 border-[#080817] bg-white shadow-[6px_6px_0_#080817]">
              <div className="border-b-2 border-[#080817] px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.16em]">
                  Typical run
                </p>
              </div>
              <div className="divide-y-2 divide-[#dbe2ee]">
                {handoff.estimates.map((estimate) => (
                  <div
                    key={estimate.label}
                    className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[1fr_auto] sm:gap-5"
                  >
                    <strong>{estimate.label}</strong>
                    <span className="font-bold text-[#596176] sm:text-right">
                      {estimate.cost} · {estimate.time}
                    </span>
                  </div>
                ))}
              </div>
              <p className="border-t-2 border-[#080817] bg-[#f5f1e8] px-5 py-4 text-sm font-black">
                {handoff.totalEstimate}
              </p>
              <div className="grid gap-4 px-5 py-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#667087]">
                    You provide
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#30374b]">
                    {handoff.requiredInputs.join(" · ")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#667087]">
                    Output
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#30374b]">
                    {handoff.output}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
