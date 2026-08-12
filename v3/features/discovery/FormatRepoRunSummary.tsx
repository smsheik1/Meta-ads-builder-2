import type { ReactNode } from "react";
import { DiscoveryFormatHandoff } from "./DiscoveryFormatHandoff";
import type { DiscoveryFormatProfile } from "./types";

type Props = {
  description: string;
  format: DiscoveryFormatProfile;
  idPrefix: string;
  provided: string;
  ready: string;
  title: string;
};

export function FormatRepoRunSummary({
  description,
  format,
  idPrefix,
  provided,
  ready,
  title,
}: Props) {
  if (!format.handoff) return null;

  return (
    <section
      id={`${idPrefix}-run-summary`}
      aria-labelledby={`${idPrefix}-run-summary-title`}
      className="border-y-2 border-[#080817] bg-[#fffdf8] px-4 py-[58px] sm:px-7"
    >
      <div className="mx-auto max-w-[980px]">
        <div className="grid gap-5 min-[701px]:grid-cols-[1fr_auto] min-[701px]:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">
              Run this Format
            </p>
            <h2
              id={`${idPrefix}-run-summary-title`}
              className="mt-3 text-[clamp(32px,4.5vw,52px)] font-black leading-[0.98] tracking-[-0.04em]"
            >
              {title}
            </h2>
            <p className="mt-4 max-w-2xl text-lg font-bold leading-7 text-[#596176]">
              {description}
            </p>
          </div>
          <DiscoveryFormatHandoff format={format} />
        </div>

        <div className="mt-6 grid border-2 border-[#080817] bg-white min-[701px]:grid-cols-3">
          <SummaryFact label="You provide">{provided}</SummaryFact>
          <SummaryFact label="You get">{format.handoff.output}</SummaryFact>
          <SummaryFact label="Usually ready">{ready}</SummaryFact>
        </div>
      </div>
    </section>
  );
}

function SummaryFact({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <section className="border-t border-[#b9b5ad] p-5 first:border-t-0 min-[701px]:border-r min-[701px]:border-t-0 min-[701px]:last:border-r-0">
      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">
        {label}
      </h3>
      <p className="mt-2 text-lg font-black leading-tight text-[#080817]">
        {children}
      </p>
    </section>
  );
}
