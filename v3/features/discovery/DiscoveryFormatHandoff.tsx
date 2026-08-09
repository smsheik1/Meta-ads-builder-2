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
  buildAntigravityAppUrl,
  buildCodexHandoffUrl,
  buildDiscoveryCliCommand,
  buildDiscoveryHandoffPrompt,
  type DiscoveryCliAgent,
} from "./handoff";
import type { DiscoveryFormatProfile } from "./types";

const cliAgents: Array<{ id: DiscoveryCliAgent; label: string }> = [
  { id: "antigravity-cli", label: "Antigravity CLI" },
  { id: "claude-code", label: "Claude Code" },
  { id: "cursor", label: "Cursor" },
  { id: "github-copilot", label: "GitHub Copilot CLI" },
];

export function DiscoveryFormatHandoff({
  format,
  compact = false,
  tone = "lime",
}: {
  format: DiscoveryFormatProfile;
  compact?: boolean;
  tone?: "lime" | "dark";
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

  const openAntigravity = async () => {
    try {
      await navigator.clipboard.writeText(prompt());
      showFeedback("Prompt copied · opening Antigravity");
    } catch {
      showFeedback("Opening Antigravity");
    }
    window.location.href = buildAntigravityAppUrl();
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
          <DropdownMenuItem onSelect={() => void openAntigravity()}>
            <ExternalLink className="size-4" aria-hidden="true" />
            Open Antigravity app
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

  return actionMenu(tone);
}
