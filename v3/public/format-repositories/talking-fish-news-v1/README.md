# Wiggly Talking Fish News

Turn one real news story into a short, deadpan vertical fish report.

## Start

```bash
npm install
npm run format:talking-fish-news -- check
npm run format:talking-fish-news -- init --run=my-report
```

The agent researches one trustworthy source, finds official visuals, creates five concepts, writes one approved four-beat report, shows the script and estimate, and asks before making the voice. If you already have a source, add `--source-url=https://example.com/story` to `init`.

## Assembly line

`Research -> Concepts -> Script -> Voice -> Render -> Deliver`

1. **Research** saves sourced facts plus official local visuals and credits.
2. **Concepts** creates exactly five evidence-backed ways to tell the story.
3. **Script** turns the selected concept into four spoken beats.
4. **Voice** uses the fixed Fish voice and times exact captions after approval.
5. **Render** creates one local 1080x1920 MP4 through Wiggly's shared renderer.
6. **Deliver** checks media, captions, evidence, and hashes, then waits for the user to approve the finished video.

## Cost

- Research and official images: host-agent web tools
- Five concepts and script: host-agent reasoning
- Fish S2.1 Pro Free voice: $0 provider cost
- Deepgram caption timing: BYOK usage, usually pennies or less
- Local Remotion render: $0 provider cost

No image generation, video generation, music generation, or Replicate call is used.

## Resume

Every run is saved under `public/format-repositories/talking-fish-news-v1/agent-runs/<run-id>`.

```bash
npm run format:talking-fish-news -- resume --run=my-report
```

Provider failures stop loudly. The runner never retries or changes providers. `smoke --run=<id>` renders only the bundled fixture locally and never calls a provider.
