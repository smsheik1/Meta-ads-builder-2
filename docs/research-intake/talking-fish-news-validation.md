# Talking Fish News: Rule Validation

## Fresh Holdouts

These two public episodes were downloaded only after the Editorial Desk and Episode Director
rules were written. They were not used to derive those rules.

| Holdout | Runtime | What it tested | Result |
| --- | ---: | --- | --- |
| [Mass fish death report](https://www.youtube.com/shorts/RbUta_Ow20A) | 14.8s | Whether a single, extremely clear field image can carry the top panel and whether the anchor can stay static. | Pass. The evidence holds attention; the anchor is still only a continuity marker. |
| [Andrew Tate arrest report](https://www.youtube.com/shorts/I2XE2JtJ-5g) | 10.4s | Whether the grammar survives a very short report with one dominant proof clip. | Pass. A concrete event and recognizable footage carry the entire short. |

## What Changed After Validation

Nothing in the core grammar changed. The holdouts strengthened two constraints:

1. One unmistakable proof image is better than several vague images.
2. The source sometimes uses named station graphics, but that is source-specific branding,
   not a reusable rule. A Wiggly version must use an original generic wrapper.

## Private Timing Trace

One private, local structural timing trace was made from the public Apple lawsuit report with
its original audio. It is intentionally not a public creative, asset, or repository file. The
trace separates the observed source from three neutral blocks representing the evidence panel,
recurring anchor, and caption zone.

Verification:

- duration: `16.274s`, matching the source duration;
- streams: one video and one audio;
- result: the event, evidence changes, static anchor, and caption zone align with the
  written four-beat report model.

The local FFmpeg install lacks `drawtext`, so the trace uses geometry rather than adding a
new dependency just to label a private study artifact. This is sufficient for the research
decision and does not belong in a product build.

## Decision

The format is understood well enough to make an **original** Wiggly proof-of-concept later.
It is not ready to be published as a product kit yet because a production kit would still need
its own fish, report wrapper, voice choice, evidence collection policy, and one controlled
visual proof run.
