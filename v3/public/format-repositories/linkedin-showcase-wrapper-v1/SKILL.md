---
name: wiggly-linkedin-showcase-wrapper
description: Package one approved video as a landscape LinkedIn process card showing the brand, product or hero offering, and Wiggly as the ingredients.
---

# LinkedIn Showcase Wrapper

Use this skill only after the source video is finished and approved.

## Start

If the user supplied an approved video, brand logo, and featured product image, start the run.

If no product appears in the video, use the business's real hero product or primary offering as ingredient two; never invent one.

If the source video is not approved, stop and ask the user to approve that video first.

## Progress

`Approve -> Prepare -> Validate -> Render -> Inspect -> Finalize`

Keep updates short and always state the immediate next step.

## Run

Run all commands from the downloaded kit's `v3` directory.

1. Run `npm run format:linkedin-showcase -- check`.
2. Create one input JSON using the contract in `inputs.json`.
3. Run `npm run format:linkedin-showcase -- init --run=<id> --input=<path>`.
4. Run `npm run format:linkedin-showcase -- validate --run=<id>`.
5. Confirm the validation selected `featured-product`, or `hero-product` only when no featured product exists.
6. Run `npm run format:linkedin-showcase -- render --run=<id>`.
7. Run `npm run format:linkedin-showcase -- inspect --run=<id>`.
8. Open the contact sheet and watch the complete MP4 with sound.
9. If both pass, run `npm run format:linkedin-showcase -- finalize --run=<id> --approve-final --review-note="<what you checked>"`.

Use `resume --run=<id>` after an interruption.

## Fixed meaning

- Right: the approved finished output.
- Left item 1: the brand logo.
- Left item 2: the featured product, or the business hero product/primary offering if no product appears.
- Left item 3: the Wiggly wordmark because the output was made with Wiggly.
- Arrow: those ingredients became the finished output.

## Boundaries

- This is a standalone post-production Repo, not a required stage in another Format.
- It never mutates or imports the parent Format's renderer.
- A parent Format may hand off a complete approved-video manifest, but this Repo remains independently runnable.
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
