# Wiggly Video Meme Format Kit

This kit turns one buyer truth into one reaction-clip meme.

It includes:

- Three bundled reaction clips
- Wiggly's exact caption rules
- Local validation
- The same `AdScene` renderer used by Wiggly
- Local Remotion MP4 export
- Saved progress and resume
- Three fixtures and golden examples

No API key is required.
No image, video, voice, or Replicate call is used.

## Quick Start

```bash
npm install
npm run check:kit
npm run format:video-meme -- check
npm run format:video-meme -- init --run=my-meme --url=https://example.com
```

Then:

1. Fill `public/format-repositories/video-meme-v1/agent-runs/my-meme/research.json`.
2. Pick a template in `meme-plan.json`.
3. Run `prompt`.
4. Write three options from `caption-prompt.txt`.
5. Save the selected option in `meme-plan.json`.
6. Run `validate`, `estimate`, `render`, and `inspect`.
7. Watch the complete MP4.
8. Run `finalize --approve-final`.

Use `resume --run=my-meme` at any time.

## Output

The final file is:

```text
public/format-repositories/video-meme-v1/agent-runs/<id>/final.mp4
```

It is 1080 × 1350.
Its length matches the selected bundled clip.

## Agent Handoff

Give an agent this ZIP and say:

`Make me a Video Meme. Do it for me.`

The agent should read `SKILL.md` and ask only for the website or brand.
