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

  const formatUrl = absoluteUrl(origin, `/formats/${format.slug}`);
  const repositoryLine = format.repositoryHref
    ? `Runnable Repo: ${absoluteUrl(origin, format.repositoryHref)}\n`
    : "";
  const sourceOfTruth = format.repositoryHref
    ? "Download and extract the Repo into a new workspace. Read its root agent instructions, then follow the packaged SKILL.md and contracts as the source of truth. Report the exact Format version recorded in KIT-MANIFEST.json before beginning its intake flow."
    : "Open the Format page and follow its published files and technical instructions as the source of truth. Report the exact published Format version before beginning its intake flow.";

  return `Let's create this with the latest published Wiggly Format: ${format.name}.

Format page: ${formatUrl}
${repositoryLine}
${sourceOfTruth}

Use the packaged runtime; do not rebuild it. Never use a paid provider without my explicit approval. Continue until the Format's validation and quality checks pass, then return its defined deliverables.`;
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
