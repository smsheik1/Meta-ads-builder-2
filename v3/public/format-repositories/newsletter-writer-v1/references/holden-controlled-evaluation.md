# Holden controlled comparison

This is historical v1.0-to-v1.1 proof, not a generation from the current v1.1.1
prompts. The current release's six-scenario validation is documented in
`blind-customer-stress-2026-07-30.md`.

Both versions used the same reconstructed Holden website evidence, topic,
brief, and three-stage generation sequence. Version A used the prompts from
base commit `0c08645e`. Version B used the revised prompts. Neither agent saw
the other output. The original model configuration was not recorded, so this
is a qualitative prompt comparison rather than a controlled model benchmark.

## Read before revealing the labels

- [Version A](../comparisons/holden-current-controlled-run.md)
- [Version B](../comparisons/holden-improved-controlled-run.md)

## Reveal

- **Version A:** frozen v1.0 agent
- **Version B:** improved v1.1 agent

## What materially improved

| Dimension | Version A | Version B |
| --- | --- | --- |
| Opening | Concrete, but begins with the abstract phrase “Holden’s history starts” | Starts immediately with the founder, binders, garage, date, and place |
| Story shape | Walks through several milestones like a company timeline | Uses one causal idea: Holden changes when the customer’s world changes |
| Reader relevance | Buyer value arrives after the history | The first paragraph explains why the origin matters to today’s buyer |
| Product breadth | Lists categories and scale | Turns breadth into a buyer decision: plan the whole project before choosing an item |
| Ending | Repeats a website slogan before the action | Ends on one direct project question and one literal next step |
| Evidence honesty | Calls website language a voice despite having no newsletters | Explicitly labels the profile `website-language` with low confidence |

Version B wins this controlled trial because it is more concrete, more causal,
and more useful to a buyer while using fewer historical facts. It does not prove
Holden’s private newsletter voice because no past newsletters were supplied.

## Failure museum

An earlier treatment opened with “A branded merchandise project is more than a
product search.” It passed schema and evidence checks but could fit almost any
promotional-products company. The final prompt now requires a sourced object,
place, action, or buyer moment in the first 25 words. This is a focused
regression lesson, not a general AI-detector rule.
