"use client";

import { Bot, Check, ChevronUp, Clipboard, ExternalLink, Terminal } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildCodexHandoffUrl,
  buildDiscoveryCliCommand,
  buildDiscoveryHandoffPrompt,
  type DiscoveryCliAgent,
} from "./handoff";
import type { DiscoveryFormatProfile } from "./types";

const cliAgents: Array<{ id: DiscoveryCliAgent; label: string }> = [
  { id: "claude-code", label: "Claude Code" },
  { id: "cursor", label: "Cursor" },
  { id: "github-copilot", label: "GitHub Copilot CLI" },
  { id: "gemini-cli", label: "Gemini CLI" },
];

export function DiscoveryFormatHandoff({
  format,
  compact = false,
  variant = "menu",
}: {
  format: DiscoveryFormatProfile;
  compact?: boolean;
  variant?: "menu" | "inline";
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  if (!format.handoff) return null;

  const prompt = () => buildDiscoveryHandoffPrompt(format, window.location.origin);

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2400);
  };

  const openCodex = () => {
    window.location.href = buildCodexHandoffUrl(prompt());
  };

  const copyText = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showFeedback(message);
    } catch {
      showFeedback("Copy failed");
    }
  };

  const copyCliCommand = async (agent: DiscoveryCliAgent, label: string) => {
    await copyText(buildDiscoveryCliCommand(agent, prompt()), `${label} command copied`);
  };

  const actionMenu = (tone: "lime" | "dark" = "lime") => (
    <div className={compact ? "w-full" : "shrink-0"}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-2 border-[#080817] px-5 text-sm font-black shadow-[4px_4px_0_#080817] ${
              compact ? "w-full" : ""
            } ${tone === "dark" ? "bg-[#080817] text-white shadow-[5px_5px_0_#52d6ff]" : "bg-[#c9ff55] text-[#080817]"}`}
          >
            {feedback ? <Check className="size-4" aria-hidden="true" /> : <Bot className="size-4" aria-hidden="true" />}
            <span>{feedback ?? "Send to Agent"}</span>
            <ChevronUp className="size-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start">
          <DropdownMenuItem onSelect={openCodex}>
            <ExternalLink className="size-4" aria-hidden="true" />
            Send to Codex
          </DropdownMenuItem>
          {cliAgents.map((agent) => (
            <DropdownMenuItem key={agent.id} onSelect={() => void copyCliCommand(agent.id, agent.label)}>
              <Terminal className="size-4" aria-hidden="true" />
              Copy for {agent.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void copyText(prompt(), "Agent prompt copied")}>
            <Clipboard className="size-4" aria-hidden="true" />
            Copy prompt for any agent
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="sr-only" aria-live="polite">{feedback}</span>
    </div>
  );

  if (variant === "inline") {
    return (
      <section
        aria-labelledby="inline-agent-handoff-title"
        className="border-y-2 border-[#080817] bg-[#fffdf8] px-4 py-10 sm:px-8 sm:py-14"
      >
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">Run with an agent</p>
              <h2 id="inline-agent-handoff-title" className="mt-3 text-4xl font-black leading-none sm:text-6xl">
                {format.name} <span className="text-[#667087]">v{format.version}</span>
              </h2>
            </div>
            <p className="max-w-2xl text-lg font-bold leading-7 text-[#596176]">
              Wiggly prepares the exact task. Choose your coding agent and start from this published Format version.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <section className="rounded-lg border-2 border-[#080817] bg-white p-5 shadow-[5px_5px_0_#080817] sm:p-6">
              <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">You provide</h3>
              <ul className="mt-4 grid gap-3">
                {format.handoff.requiredInputs.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm font-bold text-[#30374b]">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#00a7d6]" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border-2 border-[#080817] bg-white p-5 shadow-[5px_5px_0_#080817] sm:p-6">
              <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">The agent makes</h3>
              <ul className="mt-4 grid gap-3">
                {format.handoff.deliverables.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm font-bold text-[#30374b]">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#00a7d6]" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-5 overflow-hidden rounded-lg border-2 border-[#080817] bg-white shadow-[5px_5px_0_#080817]">
            <div className="border-b-2 border-[#080817] px-5 py-4">
              <h3 className="text-xs font-black uppercase tracking-[0.16em]">Run estimate</h3>
            </div>
            <div className="divide-y-2 divide-[#dbe2ee]">
              {format.handoff.estimates.map((estimate) => (
                <div key={estimate.label} className="grid gap-1 px-5 py-4 text-sm sm:grid-cols-[1fr_auto] sm:gap-5">
                  <strong>{estimate.label}</strong>
                  <span className="font-bold text-[#596176] sm:text-right">
                    {estimate.cost} · {estimate.time}
                  </span>
                </div>
              ))}
            </div>
            <p className="border-t-2 border-[#080817] bg-[#f5f1e8] px-5 py-4 text-sm font-black">
              {format.handoff.totalEstimate}
            </p>
          </section>

          <div className="mt-5 flex flex-col gap-5 rounded-lg border-2 border-[#080817] bg-[#c9ff55] p-5 shadow-[5px_5px_0_#080817] sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em]">Final output</p>
              <p className="mt-2 text-lg font-black leading-tight">{format.handoff.output}</p>
            </div>
            {actionMenu("dark")}
          </div>
          <p className="mt-4 text-center text-xs font-bold leading-5 text-[#667087]">
            Estimates are guides, not billing promises. Wiggly does not run a provider call from this page.
          </p>
        </div>
      </section>
    );
  }

  return actionMenu();
}
