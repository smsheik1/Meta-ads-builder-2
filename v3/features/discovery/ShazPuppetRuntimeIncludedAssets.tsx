import Image from "next/image";
import type { ShazPuppetRuntimeTrustData } from "./shazPuppetRuntimeTrust.server";

const kindLabels: Record<string, string> = {
  "authored-neutral-anchor": "Neutral anchor",
  "authored-replay": "Artist-calibrated",
  "authored-body-replay": "Body replay",
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
          Format {data.version}. {data.includedAssets.poses.length} actions.
          Local lip-sync included.
        </h2>
        <p className="mt-5 max-w-[760px] text-base font-bold leading-7 text-[#596176]">
          The download bundles Cherry Lip Sync as a checksum-locked WASI cue
          engine. It runs locally, then the existing Shaz rig renderer maps
          those cues to five authored mouth drawings.
        </p>
        <div className="mt-7 grid gap-3 min-[701px]:grid-cols-2">
          {data.includedAssets.bundledEngines.map((engine) => (
            <article
              key={engine.name}
              className="border-2 border-[#080817] bg-[#dff8ff] p-4 shadow-[3px_3px_0_#080817]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#31566e]">
                Bundled cue engine
              </p>
              <h3 className="mt-2 text-xl font-black">
                Cherry Lip Sync {engine.version} · {engine.artifact}
              </h3>
              <p className="mt-2 text-sm font-bold leading-6 text-[#596176]">
                {engine.purpose}. Hosted by {engine.host}; no native executable,
                network call, or second renderer.
              </p>
            </article>
          ))}
          {data.includedAssets.backgrounds.map((background) => (
            <article
              key={background.id}
              className="border-2 border-[#080817] bg-[#c9ff55] p-4 shadow-[3px_3px_0_#080817]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#31566e]">
                Checksum-registered background
              </p>
              <h3 className="mt-2 text-xl font-black">
                {background.id.replaceAll("-", " ")}
              </h3>
              <p className="mt-2 text-sm font-bold leading-6 text-[#596176]">
                {background.usage}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.15em] text-[#667087]">
          Historical Format 0.1.2 body-rig proof · not a 0.2.0 lip-sync
          certification
        </p>
        <div className="mt-8 overflow-hidden border-2 border-[#080817] bg-white shadow-[5px_5px_0_#080817]">
          <Image
            src={data.includedAssets.contactSheetSrc}
            alt="Contact sheet from the historical Format 0.1.2 Shaz anatomy-v8 body-rig proof"
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
                {String(index + 1).padStart(2, "0")} ·{" "}
                {kindLabels[pose.kind] ?? pose.kind}
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
            {data.includedAssets.props
              .map((prop) => `${prop.id}: ${prop.usage}`)
              .join(" · ")}
          </p>
        </div>
      </div>
    </section>
  );
}
