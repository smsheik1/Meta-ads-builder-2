"use client";

import { ArrowRight, Check, Clipboard, ExternalLink } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { buildDiscoveryHandoffPrompt } from "./handoff";
import type { DiscoveryFormatProfile } from "./types";

export function DiscoveryFormatHandoff({
  format,
  compact = false,
}: {
  format: DiscoveryFormatProfile;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (!format.handoff) return null;

  const startWithCodex = async () => {
    const prompt = buildDiscoveryHandoffPrompt(format, window.location.origin);
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.location.href = "codex://";
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-2 border-[#080817] bg-[#c9ff55] px-5 text-sm font-black text-[#080817] shadow-[4px_4px_0_#080817] ${
            compact ? "w-full" : ""
          }`}
        >
          Use this Format
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-l-2 border-[#080817] bg-[#fffdf8] p-0 sm:max-w-[560px]"
      >
        <SheetHeader className="border-b-2 border-[#080817] p-6 pr-14 text-left sm:p-8 sm:pr-14">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">Use with Codex</p>
          <SheetTitle className="text-4xl font-black leading-none text-[#080817]">
            {format.name} <span className="text-[#667087]">v{format.version}</span>
          </SheetTitle>
          <SheetDescription className="text-base font-bold leading-6 text-[#596176]">
            Wiggly will copy the exact task. Codex will guide the run one short question at a time.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-7 p-6 sm:p-8">
          <section>
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">You provide</h3>
            <ul className="mt-3 grid gap-2">
              {format.handoff.requiredInputs.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm font-bold text-[#30374b]">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#00a7d6]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">The agent makes</h3>
            <ul className="mt-3 grid gap-2">
              {format.handoff.deliverables.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm font-bold text-[#30374b]">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#00a7d6]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border-2 border-[#080817] bg-white">
            <div className="border-b-2 border-[#080817] px-4 py-3">
              <h3 className="text-xs font-black uppercase tracking-[0.16em]">Run estimate</h3>
            </div>
            <div className="divide-y-2 divide-[#dbe2ee]">
              {format.handoff.estimates.map((estimate) => (
                <div key={estimate.label} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 text-sm">
                  <strong>{estimate.label}</strong>
                  <span className="text-right font-bold text-[#596176]">
                    {estimate.cost} · {estimate.time}
                  </span>
                </div>
              ))}
            </div>
            <p className="border-t-2 border-[#080817] bg-[#f5f1e8] px-4 py-3 text-sm font-black">
              {format.handoff.totalEstimate}
            </p>
          </section>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">Final output</p>
            <p className="mt-2 text-lg font-black leading-tight">{format.handoff.output}</p>
          </div>

          <button
            type="button"
            onClick={() => void startWithCodex()}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md border-2 border-[#080817] bg-[#080817] px-5 text-base font-black text-white shadow-[5px_5px_0_#52d6ff]"
          >
            {copied ? <Check className="size-5" aria-hidden="true" /> : <Clipboard className="size-5" aria-hidden="true" />}
            {copied ? "Task copied. Paste it in Codex." : "Start with Codex"}
            <ExternalLink className="size-4" aria-hidden="true" />
          </button>
          <p className="text-center text-xs font-bold leading-5 text-[#667087]">
            Estimates are guides, not billing promises. Wiggly does not run a provider call from this sheet.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
