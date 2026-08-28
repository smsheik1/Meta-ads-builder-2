import Image from "next/image";
import type { ShazPuppetRuntimeTrustData } from "./shazPuppetRuntimeTrust.server";

const kindLabels: Record<string, string> = {
  "authored-neutral-anchor": "Neutral anchor",
  "authored-replay": "Artist-calibrated",
  "authored-body-replay": "Body replay",
  "heldout-authored-replay": "Held-out proof",
  generated: "New rig action",
};

const mouthShapes = [
  {
    asset: "mouth-01.png",
    cues: "A · X",
    height: 165,
    label: "Rest / closed",
    sounds: "silence + closed-lip consonants",
    width: 283,
  },
  {
    asset: "mouth-04.png",
    cues: "B · G · I · J",
    height: 217,
    label: "Teeth / EE",
    sounds: "teeth, EE, F/V + CH/J/SH",
    width: 354,
  },
  {
    asset: "mouth-05.png",
    cues: "C · H",
    height: 230,
    label: "Small open",
    sounds: "EH + tongue-forward L",
    width: 296,
  },
  {
    asset: "mouth-02.png",
    cues: "D",
    height: 258,
    label: "Wide open",
    sounds: "wide AH",
    width: 390,
  },
  {
    asset: "mouth-03.png",
    cues: "E · F · K",
    height: 166,
    label: "Rounded O",
    sounds: "OH, OO/W + R",
    width: 134,
  },
] as const;

const rigAssetRoot =
  "/format-repositories/shaz-puppet-runtime-v1/rig-v2/assets";

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
          Format {data.version}. {data.includedAssets.showcasePoses.length}{" "}
          trusted actions shown. Local lip-sync included.
        </h2>
        <p className="mt-5 max-w-[760px] text-base font-bold leading-7 text-[#596176]">
          The download bundles Cherry Lip Sync as a checksum-locked WASI cue
          engine. It runs locally, then the existing Shaz rig renderer maps
          those cues to five authored mouth drawings. The download currently
          contains {data.includedAssets.poses.length} registered recipes; this
          public showcase is intentionally limited to the five actions with
          approval-grade evidence.
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
        <div
          className="mt-8 border-2 border-[#080817] bg-[#fff0f7] p-4 shadow-[5px_5px_0_#080817] sm:p-5"
          data-testid="shaz-mouth-shape-kit"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9a315f]">
            The talking kit
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.025em]">
            Five authored mouths. Every sound has somewhere to go.
          </h3>
          <p className="mt-2 max-w-[760px] text-sm font-bold leading-6 text-[#596176]">
            Cherry chooses a cue from the audio; the existing Shaz renderer
            swaps only the Mouth drawing. The body pose, hands, timing, and
            background stay untouched.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 min-[760px]:grid-cols-5">
            {mouthShapes.map((mouth, index) => (
              <article
                key={mouth.asset}
                className="border-2 border-[#080817] bg-white p-3"
              >
                <div className="flex aspect-[4/3] items-center justify-center rounded-sm bg-[#ffd9e9] p-3">
                  <Image
                    src={`${rigAssetRoot}/${mouth.asset}`}
                    alt={`${mouth.label} authored Shaz mouth drawing`}
                    width={mouth.width}
                    height={mouth.height}
                    className="block max-h-full w-full object-contain"
                  />
                </div>
                <p className="mt-3 text-[9px] font-black uppercase tracking-[0.13em] text-[#9a315f]">
                  {String(index + 1).padStart(2, "0")} · Cherry {mouth.cues}
                </p>
                <h4 className="mt-1 text-base font-black leading-tight">
                  {mouth.label}
                </h4>
                <p className="mt-1 text-xs font-bold leading-5 text-[#667087]">
                  {mouth.sounds}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.11em] text-[#9a315f]">
            Mouth-only override · one recovered rig renderer · zero body drift
          </p>
        </div>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.15em] text-[#667087]">
          Secondary trusted pose gallery · five artist-authored actions ·
          generated experimental poses excluded
        </p>
        <div className="mt-8 overflow-hidden border-2 border-[#080817] bg-white shadow-[5px_5px_0_#080817]">
          <Image
            src={data.includedAssets.showcasePosterSrc}
            alt="Present, Think, Ah-ha, Point, and Confident recreated through the Shaz rig runtime"
            width={1300}
            height={556}
            className="block h-auto w-full"
          />
        </div>
        <div className="mt-7 grid gap-3 min-[520px]:grid-cols-2 min-[821px]:grid-cols-3">
          {data.includedAssets.showcasePoses.map((pose, index) => (
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
