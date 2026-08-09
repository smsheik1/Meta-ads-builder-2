import type { DiscoveryFormatProfile } from "./types";

export type DiscoveryCliAgent =
  | "antigravity-cli"
  | "claude-code"
  | "cursor"
  | "github-copilot";

function absoluteUrl(origin: string, path: string): string {
  return new URL(path, origin).toString();
}

export function buildDiscoveryHandoffPrompt(
  format: DiscoveryFormatProfile,
  origin: string,
): string {
  if (!format.handoff) {
    throw new Error(`Agent handoff is not available for ${format.name}.`);
  }

  const proof = format.proofEntries
    .slice(0, 3)
    .map((entry) => `- ${entry.brand}: ${absoluteUrl(origin, `/s/${entry.id}`)}`)
    .join("\n");
  const requiredInputs = format.handoff.requiredInputs.map((item) => `- ${item}`).join("\n");
  const instructions = format.handoff.instructions.map((item) => `- ${item}`).join("\n");

  return `Use this exact Wiggly Format with me.

Format: ${format.name}
Exact public version: ${format.version}
Stable Format URL: ${absoluteUrl(origin, `/formats/${format.slug}`)}
Creator: ${format.creator}
${format.technicalHref ? `Technical instructions: ${absoluteUrl(origin, format.technicalHref)}\n` : ""}
${format.repositoryHref ? `Runnable Repo: ${absoluteUrl(origin, format.repositoryHref)}\n` : ""}
Required inputs:
${requiredInputs}

Format instructions:
${instructions}

Finished proof:
${proof}

Working rules:
- Ask me one short question at a time.
- Start every progress update with the current step name.
- Show a simple cost and time estimate before any paid media call.
- Never make a paid media call without my approval.
- Use the packaged Format and renderer. Do not rebuild them.

Your first reply must ask only:
"${format.handoff.firstQuestion}"`;
}

function quoteForPosixShell(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export function buildCodexHandoffUrl(prompt: string): string {
  return `codex://new?prompt=${encodeURIComponent(prompt)}`;
}

export function buildAntigravityAppUrl(): string {
  return "antigravity://";
}

export function buildDiscoveryCliCommand(agent: DiscoveryCliAgent, prompt: string): string {
  const quotedPrompt = quoteForPosixShell(prompt);

  switch (agent) {
    case "antigravity-cli":
      return `agy -p ${quotedPrompt}`;
    case "claude-code":
      return `claude ${quotedPrompt}`;
    case "cursor":
      return `cursor-agent ${quotedPrompt}`;
    case "github-copilot":
      return `copilot -p ${quotedPrompt}`;
  }
}
