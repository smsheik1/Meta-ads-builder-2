import { DiscoveryFormatHandoff } from "./DiscoveryFormatHandoff";
import type { DiscoveryFormatProfile } from "./types";

const plainInputs = [
  "One song you are allowed to use",
  "Your preferred excerpt—or let the agent choose",
  "Any dance preferences",
  "Approved dialogue or Fish Audio access",
];

const plainDeliverables = [
  "A checked episode plan",
  "A preview contact sheet",
  "One finished 1080 × 1920 MP4",
  "A scored quality report with explanations",
];

const plainTimingLabels = [
  "Song and dance planning",
  "Voice lines",
  "Render and quality check",
  "Final human review",
];

export function BikiniBottomDanceOffRunSummary({
  format,
}: {
  format: DiscoveryFormatProfile;
}) {
  if (!format.handoff) return null;

  return (
    <section
      id="dance-off-run-summary"
      aria-labelledby="dance-off-run-summary-title"
      className="border-y-2 border-[#080817] bg-[#fffdf8] px-4 py-[58px] sm:px-7"
    >
      <div className="mx-auto max-w-[980px]">
        <div className="grid gap-5 min-[701px]:grid-cols-[1fr_auto] min-[701px]:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">
              Run this Format
            </p>
            <h2
              id="dance-off-run-summary-title"
              className="mt-3 text-[clamp(32px,4.5vw,52px)] font-black leading-[0.98] tracking-[-0.04em]"
            >
              What you need.
              <br />
              What you get.
            </h2>
            <p className="mt-4 max-w-2xl text-lg font-bold leading-7 text-[#596176]">
              Pick an agent. Wiggly sends it this exact Format version.
            </p>
          </div>
          <DiscoveryFormatHandoff format={format} />
        </div>

        <div className="mt-6 grid border-2 border-[#080817] bg-white min-[701px]:grid-cols-3">
          <SummaryList title="You provide" items={plainInputs} />
          <SummaryList title="The agent makes" items={plainDeliverables} />

          <section className="border-t border-[#b9b5ad] p-5 min-[701px]:border-l min-[701px]:border-t-0">
            <h3 className="text-[19px] font-black leading-[1.15]">
              Usually 12–30 minutes
            </h3>
            <ul className="mt-3 space-y-2">
              {format.handoff.estimates.map((estimate, index) => (
                <li
                  key={estimate.label}
                  className="grid grid-cols-[1fr_auto] gap-3 text-sm font-bold text-[#30374b]"
                >
                  <span>{plainTimingLabels[index] ?? estimate.label}</span>
                  <span className="text-right text-[#596176]">
                    {estimate.time.replace("about ", "")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-[#080817]/20 pt-4 text-sm font-bold leading-6 text-[#596176]">
              Fish Audio is used only when needed, and nothing paid runs without
              approval.
            </p>
          </section>
        </div>

        <div className="mt-[14px] flex flex-col gap-5 border-2 border-[#080817] bg-[#c9ff55] px-[18px] py-4 min-[701px]:flex-row min-[701px]:items-center min-[701px]:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em]">
              Final output
            </p>
            <p className="mt-2 text-lg font-black leading-tight">
              {format.handoff.output}
            </p>
          </div>
          <DiscoveryFormatHandoff format={format} tone="dark" />
        </div>
      </div>
    </section>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="border-t border-[#b9b5ad] p-5 first:border-t-0 min-[701px]:border-r min-[701px]:border-t-0">
      <h3 className="text-[19px] font-black leading-[1.15]">{title}</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        {items.map((item) => (
          <li key={item} className="text-sm font-bold leading-5 text-[#424254]">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
