import type { DiscoveryFormatProfile } from "./types";

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
  const packageInstructions = format.handoff.packagePath
    ? `\nRunnable Format Kit:\n- Download: ${absoluteUrl(origin, format.handoff.packagePath)}\n- This is a downloadable local package, not a Wiggly connector, MCP server, plugin, or registry tool. Do not search a connector registry for Wiggly.\n- Run it in a coding agent with a terminal and writable files, such as Codex, Claude Code, or Cursor. A normal claude.ai chat cannot execute the renderer.\n- Download and unzip the package into the current workspace, then read START-HERE.md at the package root and follow it exactly.\n- If this session cannot download files, write files, and run shell commands, reply exactly: \"This Format needs a coding agent with terminal access. Open this task in Codex, Claude Code, or Cursor, then paste it again.\" Then stop. Do not ask how to proceed.\n`
    : "";

  return `Use this exact Wiggly Format with me.

Format: ${format.name}
Exact public version: ${format.version}
Stable Format URL: ${absoluteUrl(origin, `/formats/${format.slug}`)}
Creator: ${format.creator}
${format.technicalHref ? `Technical instructions: ${absoluteUrl(origin, format.technicalHref)}\n` : ""}
${packageInstructions}
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

${format.handoff.packagePath ? "If this session meets the runtime requirements, your" : "Your"} first reply must ask only:
"${format.handoff.firstQuestion}"`;
}
