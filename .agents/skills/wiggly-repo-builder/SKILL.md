---
name: wiggly-repo-builder
description: "Build, test, package, and refine a Wiggly Repo: an agent-operated image or video Format kit with an official runtime, contracts, assets, BYOK requirements, validation, inspection, and final outputs. Use when creating a Wiggly Repo from a reference or format idea, turning a prototype into a reusable agent package, testing whether a fresh agent can operate a Format, or updating the shared Wiggly Repo standard after a real run."
---

# Wiggly Repo Builder

Build an instruction manual plus a runnable machine. A page of prompts or screenshots is not a Wiggly Repo.

Before building, read [references/standard.md](references/standard.md) completely. Keep that file as the single source of shared Wiggly Repo knowledge.

## 1. Scope one proof

- Choose one Format and one clear finished output.
- Define what must remain fixed and what a user or agent may replace.
- Choose at least two meaningfully different proof inputs. One polished example can hide hard-coded work.
- State what would make the output worth sending, posting, or using.
- Start on a fresh branch. Do not modify `/create`, `/builder`, or another Format unless the proof requires an approved integration.

## 2. Separate the Format from its content

Describe these parts before coding:

1. Instructions: how the Format works and what “good” means.
2. User inputs: what the user must provide.
3. Fixed assets: reusable files that ship with the Format.
4. Generated content: text, image, audio, or video prompts and outputs.
5. Composition contract: scenes, slots, timing, layouts, or other structure.
6. Official runtime: the renderer and runner that create the output.
7. Audio: voices, music, mixing, and timing when applicable.
8. Requirements: local tools, providers, key names, and approval rules.
9. Quality checks: automatic gates plus human creative review.
10. Final output: media, evidence, provenance, and the exact Format version.

Mark parts that do not apply. Do not force Otaku concepts such as story worlds, character roles, or 12–18 scenes into another Format.

## 3. Build the smallest runnable kit

Include:

- a Format-specific `SKILL.md`;
- requirements that name tools and environment variables without secret values;
- explicit input, output, and composition contracts;
- assets with sources and usage notes;
- one official renderer and runner;
- a free local smoke test;
- validation before provider calls;
- inspection of the finished media;
- a finalization gate that rejects failed checks;
- one small fixture and one real proof output.

Prefer the semantic command loop `smoke`, `check`, `init`, `validate`, `render`, `inspect`, and `finalize`. Adapt it only when a step truly does not exist for the Format.

Do not add a database, marketplace system, workflow builder, MCP server, or generic framework to prove a local Repo.

## 4. Run the blind-agent proof

Give a fresh agent only the Repo page or package and the desired outcome.

The agent must:

1. Read the packaged instructions and contracts.
2. Run the free smoke test before real work.
3. Report missing tools or key names without exposing secrets.
4. Validate the plan before any paid call.
5. Ask once before paid media generation.
6. Use the packaged runtime instead of rebuilding it.
7. Inspect the actual output, fix only observed problems, and respect the attempt limit.
8. Finalize only after automatic and human checks pass.
9. Return the finished media to the user.

Fail the proof if the user must explain how the Format works, the agent rebuilds the renderer, or a content change needs proof-specific runtime code.

## 5. Record what the run taught

After every real run, record:

- the friction or failure;
- its root cause;
- the smallest general fix;
- the evidence that the fix worked;
- whether the lesson is proven, still testing, or Format-specific.

Update `references/standard.md` only from real evidence. Do not promote an Otaku design choice into a universal rule.

## 6. Finish cleanly

- Run focused contract and runtime tests.
- Run the free smoke test from the packaged artifact, not only the source tree.
- Register every newly published Format with the shared rich Repo-page presentation: compact hero, honest services and costs, run summary, included assets, finished examples, proof and quality evidence, readable Repo files, and the agent CTA. Never add a new Format to the frozen legacy-page allowlist.
- Test the real public page with Playwright when one exists.
- Run `ponytail-review`; remove speculative abstractions and duplicated instructions.
- Commit and push only a working checkpoint.
- Report the proof inputs, outputs, failures, fixes, remaining uncertainty, and the next Repo that would challenge the standard.

## Failure rules

- Never ship instructions without the official runnable implementation.
- Never create a second renderer for preview, export, or an agent workaround.
- Never guess media duration when the file can provide it.
- Never treat “the API returned” or “the render completed” as creative success.
- Never hide provider changes, retries, spending, or missing assets.
- Stop after the declared attempt limit and explain the blocker.
