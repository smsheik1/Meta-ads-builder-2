# Agent handoff links

Reviewed August 8, 2026. Wiggly must not imply that a prompt was delivered when a target only supports copying a command.

| Target | Officially documented mechanism | Wiggly behavior |
| --- | --- | --- |
| Codex desktop | [`codex://new?prompt=<encoded-text>`](https://learn.chatgpt.com/docs/reference/commands#deep-links) opens a new local chat with unsent composer text. | Open the documented deep link with the concise Format launcher. |
| Antigravity app | The installed Mac app registers `antigravity://`, but no prompt-prefill contract is documented. | Copy the concise launcher, then open the app. Never claim the text was injected. |
| Antigravity CLI | [`agy -p "prompt"`](https://antigravity.google/docs/cli/gcli-migration) starts the agent with a prompt. | Copy a POSIX-safe `agy -p` command. |
| Claude Code | [`claude "query"`](https://code.claude.com/docs/en/cli-reference) starts an interactive session with an initial prompt. | Copy a POSIX-safe `claude` command. |
| Cursor | [`cursor-agent "prompt"`](https://docs.cursor.com/en/cli/overview) starts an interactive agent session with an initial prompt. | Copy a POSIX-safe `cursor-agent` command. |
| GitHub Copilot CLI | [`copilot -p "prompt"`](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-copilot-cli) runs a supplied prompt. | Copy a POSIX-safe `copilot -p` command without automatic tool-approval flags. |
| Any other agent | No target-specific mechanism is assumed. | Copy the raw, agent-neutral Format prompt. |

The official Antigravity, Claude Code, Cursor, and Copilot CLI references reviewed above do not document a browser-to-app prompt-prefill link comparable to Codex. If that changes, add the verified link here and cover it with a handoff test before changing the menu behavior.

These transports carry only the concise launcher defined in [Send to Agent standard](./send-to-agent-standard.md). Operational instructions belong in the downloaded Repo, not in transport-specific prompt copies.
