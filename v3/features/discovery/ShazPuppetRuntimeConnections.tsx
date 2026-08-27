import { CircleDollarSign, Laptop, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { ShazPuppetRuntimeTrustData } from "./shazPuppetRuntimeTrust.server";

export function ShazPuppetRuntimeConnections({
  data,
}: {
  data: ShazPuppetRuntimeTrustData;
}) {
  const cherry = data.includedAssets.bundledEngines.find(
    (engine) => engine.name === "cherry-lip-sync",
  );

  return (
    <section
      id="accounts-youll-connect"
      aria-labelledby="accounts-youll-connect-title"
      className="border-y-2 border-[#080817] bg-[#dff8ff] px-4 py-[58px] text-[#080817] sm:px-7"
    >
      <div className="mx-auto max-w-[980px]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#31566e]">
          Before you start
        </p>
        <h2
          id="accounts-youll-connect-title"
          className="mt-2 text-4xl font-black leading-none sm:text-5xl"
        >
          No services. No keys. No Harmony.
        </h2>
        <div className="mt-6 grid border-2 border-[#080817] bg-white min-[701px]:grid-cols-3">
          <Fact icon={<Laptop aria-hidden="true" />} title="Runs locally">
            Node, Sharp, FFmpeg, the packaged rig runtime, and Cherry WASI do
            the work.
          </Fact>
          <Fact
            icon={<CircleDollarSign aria-hidden="true" />}
            title="$0 provider cost"
          >
            No network or paid generation call is part of the workflow.
          </Fact>
          <Fact
            icon={<ShieldCheck aria-hidden="true" />}
            title="Bundled local lip-sync"
          >
            Cherry {cherry?.version ?? "0.1.0"} generates speech cues inside
            Node WASI. The same Shaz renderer paints every mouth shape.
          </Fact>
        </div>
      </div>
    </section>
  );
}

function Fact({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="border-t-2 border-[#080817] p-5 first:border-t-0 min-[701px]:border-r-2 min-[701px]:border-t-0 min-[701px]:last:border-r-0">
      <div className="flex items-center gap-2 [&>svg]:size-5">
        {icon}
        <h3 className="text-lg font-black">{title}</h3>
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-[#596176]">
        {children}
      </p>
    </article>
  );
}
