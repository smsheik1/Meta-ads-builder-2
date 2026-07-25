# Wiggly

<p align="center">
  <img src="docs/assets/github/hero.png" alt="Wiggly — the open format layer for creative agents, shown with six real outputs from two reusable Formats." width="100%">
</p>

<p align="center">
  <strong>Find a Format. Hand it to your agent. Get the finished ad or video back.</strong>
</p>

<p align="center">
  <a href="https://wiggly.agentenamel.com">Open Wiggly</a>
  ·
  <a href="https://wiggly.agentenamel.com/format-lab/cartoon-explainer">Try the Cartoon Explainer Repo</a>
  ·
  <a href="https://wiggly.agentenamel.com/format-lab/three-d-breakdown">Try the 3D Breakdown Repo</a>
</p>

Most good AI videos are not made with one prompt. They take prompts, reference
images, voices, music, model settings, timing rules, a renderer, and a pile of
small decisions. Today, the person who made the video usually keeps all of that
in their head.

Wiggly puts the whole recipe in a **Wiggly Repo**.

Give the Repo to Claude, Codex, or another coding agent. It can see how the
Format works, ask you for anything missing, use the included renderer, check
its own work, and hand you back the finished file.

## We changed the idea, not the renderer

<p align="center">
  <img src="docs/assets/github/proof-reel.gif" alt="The Cartoon Explainer Format running across Naruto, Danny Phantom, and SpongeBob, followed by the 3D Breakdown Format running across Kiala, Grüns, and Theragun." width="720">
</p>

These are not six videos we built one by one. **Cartoon Explainer** used the same
renderer for Naruto, Danny Phantom, and SpongeBob. **3D Breakdown** used the same
renderer for Kiala, Grüns, and Theragun.

| Format | What we swapped | What we did not rebuild |
| --- | --- | --- |
| [Cartoon Explainer](https://wiggly.agentenamel.com/format-lab/cartoon-explainer) | Characters, voices, backgrounds, and lesson | Layouts, speech bubbles, pacing, renderer, and checks |
| [3D Breakdown](https://wiggly.agentenamel.com/format-lab/three-d-breakdown) | Brand, product, story, images, and narration | Production steps, blue 3D look, renderer, and checks |

## Try it with your agent

Copy this into Claude or Codex:

```text
Open https://wiggly.agentenamel.com/format-lab/cartoon-explainer
and make SpongeBob explain how electric vehicles work.
Use the included runner. Check the video before you send it back.
```

<p align="center">
  <img src="docs/assets/github/agent-challenge.jpg" alt="A copyable agent instruction beside real SpongeBob, Naruto, and Danny Phantom outputs made from the Cartoon Explainer Wiggly Repo." width="100%">
</p>

That short instruction made the SpongeBob video above. The Repo told the agent
which files to use, what it was allowed to change, and what to check before it
called the video done.

## What does a Wiggly Repo include?

<p align="center">
  <img src="docs/assets/github/format-anatomy.svg" alt="A Wiggly Repo teaches the agent, defines the creative, packages production assets, and proves the result with quality checks." width="100%">
</p>

Every Format is different. A cartoon explainer should not be forced into the
same box as a product breakdown or a static ad. But the agent always needs five
answers:

- **What am I making?** The instructions and examples.
- **What do I need from the user?** The inputs and API keys.
- **What am I allowed to change?** The prompts, roles, scenes, and timing rules.
- **Which files and tools must I use?** The assets, audio, dependencies, and renderer.
- **How do I know it is good?** The finished examples and checks.

## Make a good Format once. Let other people build on it.

<p align="center">
  <img src="docs/assets/github/format-flywheel.svg" alt="Build, publish, run, remix, improve, and contribute form the Wiggly Format flywheel." width="100%">
</p>

People should be able to publish a Format, make their own version, fix a bad
prompt, improve the renderer, and share that work back. The next person should
start with the better version instead of repeating the same mistakes.

That is the part of GitHub we want to bring to creative work.

## What works today

- The live Wiggly app can read a store and turn what it finds into ad ideas.
- Cartoon Explainer and 3D Breakdown are downloadable and come with their real runners.
- Both have finished videos across different brands, characters, voices, and topics.
- Both tell the agent what it needs and stop broken work from being called finished.

It is still early. There is no full Format marketplace or pull-request flow in
Wiggly yet. These first two Repos prove the important part: an agent can pick up
someone else's Format and run it without being walked through every step.

## Run Wiggly locally

```bash
npm install
npm run dev
```

The v3 app starts at [`http://localhost:3020/create`](http://localhost:3020/create).
See [Development](docs/development.md) for environment setup, runtime checks,
architecture references, and deployment notes.
