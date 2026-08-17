import Image from "next/image";
import type { ShazPuppetRuntimeTrustData } from "./shazPuppetRuntimeTrust.server";

const kindLabels: Record<string, string> = {
  "authored-replay": "Artist-calibrated",
  "heldout-authored-replay": "Held-out proof",
  generated: "New rig action",
};

export function ShazPuppetRuntimeIncludedAssets({
  data,
}: {
  data: ShazPuppetRuntimeTrustData;
}) {
  return (
    <section
      id="included-assets"
      aria-labelledby="included-assets-title"
      className="border-y-2 border-[#080817] bg-[#fffdf8] px-4 py-[58px] text-[#080817] sm:px-7"
      data-testid="shaz-puppet-runtime-included-assets"
    >
      <div className="mx-auto max-w-[980px]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">
          Included assets
        </p>
        <h2
          id="included-assets-title"
          className="mt-3 max-w-[720px] text-[clamp(34px,5vw,54px)] font-black leading-[0.96] tracking-[-0.04em]"
        >
          One puppet. Eleven reusable actions.
        </h2>
        <div className="mt-8 overflow-hidden border-2 border-[#080817] bg-white shadow-[5px_5px_0_#080817]">
          <Image
            src={data.includedAssets.contactSheetSrc}
            alt="Contact sheet of ten Shaz puppet actions rendered by the recovered runtime"
            width={1300}
            height={556}
            className="block h-auto w-full"
          />
        </div>
        <div className="mt-7 grid gap-3 min-[520px]:grid-cols-2 min-[821px]:grid-cols-3">
          {data.includedAssets.poses.map((pose, index) => (
            <article
              key={pose.id}
              className="border-2 border-[#080817] bg-white p-4 shadow-[3px_3px_0_#080817]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#667087]">
                {String(index + 1).padStart(2, "0")} · {kindLabels[pose.kind] ?? pose.kind}
              </p>
              <h3 className="mt-2 text-lg font-black leading-tight">
                {pose.id.replaceAll("-", " ")}
              </h3>
            </article>
          ))}
        </div>
        <div className="mt-6 border-2 border-[#080817] bg-[#c9ff55] p-4">
          <h3 className="text-lg font-black">Minimal extra drawings</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-[#334155]">
            {data.includedAssets.props.map((prop) => `${prop.id}: ${prop.usage}`).join(" · ")}
          </p>
        </div>
      </div>
    </section>
  );
}
