---
name: wiggly-linkedin-showcase-wrapper
description: Package one approved video as a landscape LinkedIn process card showing the brand, product or hero offering, and Wiggly as the ingredients.
---

# LinkedIn Showcase Wrapper

Use this skill only after the source video is finished and approved.

## Start

The only required user inputs are the approved video and the brand website; the agent must source the visual ingredients itself unless the user explicitly supplies them.

Ask one question at a time:

1. `Which approved finished video should I package?`
2. `What is the brand website?`

Do not ask the user to find a logo or product image that the agent can source from the official website.

Inspect the approved video first. If a specific product appears, identify it and source a clean official image from that product's official page. If no product appears, use the business's real hero product or primary offering from its official website; never invent one.

If the source video is not approved, stop and ask the user to approve that video first.

## Progress

`Approve -> Source -> Prepare -> Validate -> Render -> Inspect -> Finalize`

Keep updates short and always state the immediate next step.

## Run

Run all commands from the downloaded kit's `v3` directory.

1. Run `npm install`.
2. Run `npm run format:linkedin-showcase -- check`.
3. Read `prompts/asset-sourcing.md`.
4. Inspect the approved video to decide whether ingredient two is a featured product or the brand's hero offering.
5. Use your web tools to research the supplied official website, download the cleanest official logo and product/offering image, and save each exact source URL.
6. Create one input JSON using the contract in `inputs.json`; do not depend on another Wiggly Repo being present.
7. Run `npm run format:linkedin-showcase -- init --run=<id> --input=<path>`.
8. Run `npm run format:linkedin-showcase -- validate --run=<id>`.
9. Confirm the validation selected `featured-product`, or `hero-product` only when no featured product exists.
10. Run `npm run format:linkedin-showcase -- render --run=<id>`.
11. Run `npm run format:linkedin-showcase -- inspect --run=<id>`.
12. Open the contact sheet and watch the complete MP4 with sound.
13. If both pass, run `npm run format:linkedin-showcase -- finalize --run=<id> --approve-final --review-note="<what you checked>"`.

Use `resume --run=<id>` after an interruption.

## Fixed meaning

- Right: the approved finished output.
- Left item 1: the brand logo.
- Left item 2: the featured product, or the business hero product/primary offering if no product appears.
- Left item 3: the Wiggly wordmark because the output was made with Wiggly.
- Arrow: those ingredients became the finished output.

## Boundaries

- This is a standalone post-production Repo, not a required stage in another Format.
- It must work from the approved video and official brand website with no parent Format present.
- A parent Format may optionally provide already-sourced assets, but the standalone path is the acceptance test and can never depend on that handoff.
- It never mutates or imports another Format's renderer.
- Use official website assets or explicit user uploads; never generate substitute logos or products.
- Do not add layout controls to V1.
- Do not add provider fallbacks.
- Do not add API keys.

## Good result

- The final is a 1920x1080 MP4.
- Its duration follows the source within one frame.
- Source audio is preserved when present.
- All three ingredients are readable and unclipped.
- The approved source video is not distorted.
- Automatic inspection passes and a human watches the full output before finalizing.
