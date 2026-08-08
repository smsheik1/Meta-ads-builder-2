import { Check } from "lucide-react";
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
      className="border-y-2 border-[#080817] bg-[#fffdf8] px-4 py-10 sm:px-8 sm:py-14"
    >
      <div className="mx-auto max-w-[1180px]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">
            Run this Format
          </p>
          <h2
            id="dance-off-run-summary-title"
            className="mt-3 text-4xl font-black leading-none sm:text-6xl"
          >
            What you need. What you get.
          </h2>
          <p className="mt-4 max-w-2xl text-lg font-bold leading-7 text-[#596176]">
            Pick an agent. Wiggly sends it this exact Format version.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <SummaryList title="You provide" items={plainInputs} />
          <SummaryList title="The agent makes" items={plainDeliverables} />

          <section className="rounded-lg border-2 border-[#080817] bg-white p-5 shadow-[5px_5px_0_#080817] sm:p-6">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">
              Usually 12–30 minutes
            </h3>
            <ul className="mt-4 grid gap-3">
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

        <div className="mt-5 flex flex-col gap-5 rounded-lg border-2 border-[#080817] bg-[#c9ff55] p-5 shadow-[5px_5px_0_#080817] sm:flex-row sm:items-center sm:justify-between sm:p-6">
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

        <p className="mt-4 text-center text-xs font-bold leading-5 text-[#667087]">
          Times are estimates. Wiggly never runs Fish Audio from this page.
        </p>
      </div>
    </section>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border-2 border-[#080817] bg-white p-5 shadow-[5px_5px_0_#080817] sm:p-6">
      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">
        {title}
      </h3>
      <ul className="mt-4 grid gap-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 text-sm font-bold text-[#30374b]"
          >
            <Check
              className="mt-0.5 size-4 shrink-0 text-[#00a7d6]"
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
