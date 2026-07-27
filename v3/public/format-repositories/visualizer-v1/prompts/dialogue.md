# Dialogue

The runtime writes the exact expanded Wiggly dialogue prompt to each run's `dialogue-prompt.txt`.

Use that prompt yourself. Do not call a second LLM provider just to execute it.

The prompt carries:

- The selected headline, pain, proof, and CTA
- Saved claims and buyer moments
- Cached ad angles
- The exact six-line Ava and Sam structure
- Three proven examples
- Banned infomercial phrases
- JSON output shape

Return exactly five scripts and save them in `dialogue-options.json`.
