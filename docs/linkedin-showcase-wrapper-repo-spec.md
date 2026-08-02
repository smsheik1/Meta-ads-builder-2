# LinkedIn Showcase Wrapper Repo

## Decision

The LinkedIn process-card composition is a standalone Post-Production Wiggly Repo, not a required stage inside 3D Breakdown or any other Format.

## Meaning

- Right: the approved finished output video.
- Left item 1: the brand logo.
- Left item 2: the product featured in the video; when no product appears, the business's real hero product or primary offering.
- Left item 3: the Wiggly wordmark, because the output was made with Wiggly.
- Arrow: those ingredients became the output.

## V1 Contract

- One approved local MP4, MOV, or WebM.
- One brand logo.
- One featured-product image or hero-offering fallback.
- One fixed packaged Wiggly wordmark.
- One local 1920x1080 MP4 timed to the source video and preserving its audio when present.
- One contact sheet, inspection report, and provenance receipt.
- No API key or provider call.

## Integration Boundary

A parent Format may optionally hand off a complete manifest only after its output is approved; the wrapper imports no parent renderer, mutates no parent scene, and remains independently downloadable and runnable.

## Discover

The Repo appears under the `Post-Production` shelf so future wrappers for other publishing surfaces can live beside it without becoming mandatory stages in content-generation Formats.
