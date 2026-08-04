# Talking Fish News: Episode Director

## Job

Make a vertical, evidence-led mini-report. The news visual language creates the frame;
the evidence creates the story.

## Runtime

- Target: 14-20 seconds.
- Allow: 10-30 seconds only when the evidence earns it.
- Voice: measured and neutral, never salesy or excited.
- Script: 38-60 words by default, one fact per sentence.

## Four-Beat Report

| Time | Beat | Requirement |
| --- | --- | --- |
| 0.0-2.5s | Headline | Say the event immediately. The first visual must prove it. |
| 2.5-7s | First fact | Show the cause, source, or before-state. |
| 7-13s | Context | Add one or two facts that make the event matter. Each gets a new proof image. |
| 13-20s | Payoff | Name the brand's role once and land the buyer reframe. No hard sell. |

### Opening Lock

For the source-faithful report mode, the first two spoken words are exactly `Breaking news.`
They are followed by a 6-13 word concrete event. An industry thesis such as "meeting capture
is becoming..." is not an event and fails the opening, even when the rest of the script is
accurate.

Good: `Breaking news. A meeting can now become three usable records.`

Bad: `Meeting capture is becoming an input to software.`

## Visual Contract

- **Top panel:** primary evidence. Use 2-4 big, simple images or clips. The viewer must
  understand each without reading small text.
- **Lower panel:** one nearly static anchor against a simple underwater/news backdrop.
  It is a continuity device, not a second story.
- **Captions:** renderer overlays, large enough to read on a phone. They rest in the lower
  panel and summarize the line being spoken.
- **Header:** a generic, original report banner can appear as a consistent wrapper. It must
  not copy a named station, source logo, or exact asset.
- **Brand proof:** product, screen, field photo, founder photo, or official document must
  enter as report evidence, not as an end-card interrupt.

## Shot Planning

For every sentence, produce:

```json
{
  "line": "The spoken sentence.",
  "proof": "One large, official visual that explains the line.",
  "proof_type": "product | comparison | official-screen | document | founder-history | field-photo | customer-outcome",
  "caption": "2-7 words, readable at phone size.",
  "anchor": "same anchor, same lower-panel placement",
  "change": "what visibly changes from the prior shot"
}
```

If `proof` is a dense webpage, a generic stock image, or a metaphor that could mean anything,
the episode does not pass storyboard review.

## Script Rules

- Use third-person report language: `A new report shows...`, `The old way...`,
  `That is why...`.
- Start source-faithful report mode with the locked `Breaking news.` event; do not begin with
  an industry thesis, a rhetorical question, or a product claim.
- Name the brand only after the viewer understands the event.
- Make the final line a reframe, such as `The product is not the straw. It is the part that
  stops the cup from becoming waste.`
- Use a soft end card or link overlay outside the voice if an action is needed.
- Never make the anchor introduce itself, explain the format, smile, improvise, or take a
  founder-testimonial tone.

## Failure Conditions

- Top visuals repeat the same product angle or cannot prove the caption.
- Every line is a brand claim rather than a reportable fact.
- The anchor takes more visual attention than the proof.
- Captions conflict with narration or cover the proof.
- The payoff is a generic CTA instead of a factual buyer reframe.
