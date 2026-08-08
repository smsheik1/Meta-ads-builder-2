# Agent handoff links

Reviewed August 8, 2026. Wiggly must not imply that a prompt was delivered when a target only supports copying a command.

| Target | Officially documented mechanism | Wiggly behavior |
| --- | --- | --- |
| Codex desktop | [`codex://new?prompt=<encoded-text>`](https://learn.chatgpt.com/docs/reference/commands#deep-links) opens a new local chat with unsent composer text. | Open the documented deep link with the complete encoded Format prompt. |
| Claude Code | [`claude "query"`](https://docs.anthropic.com/en/docs/claude-code/cli-usage) starts an interactive session with an initial prompt. | Copy a POSIX-safe `claude` command. |
| Cursor | [`cursor-agent "prompt"`](https://docs.cursor.com/en/cli/overview) starts an interactive agent session with an initial prompt. | Copy a POSIX-safe `cursor-agent` command. |
| GitHub Copilot CLI | [`copilot -p "prompt"`](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-copilot-cli) runs a supplied prompt. | Copy a POSIX-safe `copilot -p` command without automatic tool-approval flags. |
| Gemini CLI | [`gemini -i "prompt"`](https://geminicli.com/docs/reference/configuration/) starts an interactive session with an initial prompt. | Copy a POSIX-safe `gemini -i` command. |
| Any other agent | No target-specific mechanism is assumed. | Copy the raw, agent-neutral Format prompt. |

The official Claude Code, Cursor, Copilot CLI, and Gemini CLI references reviewed above do not document a browser-to-app prompt-prefill link comparable to Codex. If that changes, add the verified link here and cover it with a handoff test before changing the menu behavior.
