# Wiggly

<p align="center">
  <img src="docs/assets/github/hero.png" alt="Wiggly — the open format layer for creative agents, shown with six real outputs from two reusable Formats." width="100%">
</p>

<p align="center">
  <strong>Discover a Format. Give it to your agent. Get the finished creative.</strong>
</p>

<p align="center">
  <a href="https://wiggly.agentenamel.com">Open Wiggly</a>
  ·
  <a href="https://wiggly.agentenamel.com/format-lab/otaku-explainer">Try the Otaku Explainer Repo</a>
  ·
  <a href="https://wiggly.agentenamel.com/format-lab/three-d-breakdown">Try the 3D Breakdown Repo</a>
</p>

Wiggly is the format layer between a creative idea and the agent that makes it.
Instead of explaining a workflow to Claude or Codex from scratch, you give it a
self-contained **Wiggly Repo**: the instructions, inputs, assets, prompts,
renderer, audio, dependencies, examples, and quality checks for one repeatable
creative Format.

The agent still does the creative work. Wiggly removes the repeated explaining,
setup, and guesswork.

## This is a system, not three hand-made demos

<p align="center">
  <img src="docs/assets/github/proof-reel.gif" alt="The Otaku Explainer Format running across Naruto, Danny Phantom, and SpongeBob, followed by the 3D Breakdown Format running across Kiala, Grüns, and Theragun." width="720">
</p>

The same **Otaku Explainer** renderer worked across Naruto, Danny Phantom, and
SpongeBob. The same **3D Breakdown** renderer worked across Kiala, Grüns, and
Theragun. The subjects, worlds, voices, assets, and products changed. The
underlying Format stayed reusable.

| Working Format | What changed | What stayed reusable |
| --- | --- | --- |
| [Otaku Explainer](https://wiggly.agentenamel.com/format-lab/otaku-explainer) | Story world, characters, voices, backgrounds, and lesson | Scene contract, layouts, renderer, pacing rules, and quality checks |
| [3D Breakdown](https://wiggly.agentenamel.com/format-lab/three-d-breakdown) | Brand, product, story angle, generated media, and narration | Production stages, blue-world visual grammar, renderer, and creative quality bar |

## One link. One instruction.

Give a compatible agent the Format page and a result you want:

```text
Open https://wiggly.agentenamel.com/format-lab/otaku-explainer
and make SpongeBob explain how electric vehicles work.
Use the packaged runner. Inspect your work before returning the final video.
```

<p align="center">
  <img src="docs/assets/github/agent-challenge.jpg" alt="A copyable agent instruction beside real SpongeBob, Naruto, and Danny Phantom outputs made from the Otaku Explainer Wiggly Repo." width="100%">
</p>

The Format tells the agent what it needs, which inputs are missing, how to make
the creative, what it must never improvise, and how to decide whether the result
is good enough to return.

## What is inside a Wiggly Repo?

<p align="center">
  <img src="docs/assets/github/format-anatomy.svg" alt="A Wiggly Repo teaches the agent, defines the creative, packages production assets, and proves the result with quality checks." width="100%">
</p>

Every Format can work differently. A cartoon explainer, a product breakdown,
and a static ad do not need the same renderer or inputs. They do need the same
kind of complete handoff:

- **Instructions:** what the Format is, how the agent should work, and when it must stop.
- **Inputs:** what the user supplies and what the agent can discover.
- **Creative recipe:** prompts, roles, scene rules, timing, and approved variation.
- **Production kit:** fixed assets, audio, dependencies, and the official renderer.
- **Proof:** examples, output history, and checks that block broken work.

## Formats get better together

<p align="center">
  <img src="docs/assets/github/format-flywheel.svg" alt="Build, publish, run, remix, improve, and contribute form the Wiggly Format flywheel." width="100%">
</p>

The long-term product is not a folder of private templates. People should be
able to create Formats, publish them, remix someone else's work, improve a
prompt or renderer, and contribute those improvements back. A great creative
idea becomes reusable infrastructure for people and their agents.

## What exists today

Wiggly currently has:

- A live ecommerce creative engine that turns product-page research into ad concepts.
- Two downloadable, agent-readable Wiggly Repos with official runners.
- Real outputs across multiple brands, story worlds, voices, and topics.
- Format-level requirements, validation, inspection, and quality checks.

The discovery marketplace, public contribution workflow, and first-class Format
versioning are the direction, not finished features. The working Repos above are
the proof that the underlying package can travel.

## Run Wiggly locally

```bash
npm install
npm run dev
```

The v3 app starts at [`http://localhost:3020/create`](http://localhost:3020/create).
See [Development](docs/development.md) for environment setup, runtime checks,
architecture references, and deployment notes.
