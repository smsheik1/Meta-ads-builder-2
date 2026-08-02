# Story Prompt

Write three short A-versus-B explanations from the user-approved concept in `concepts.json`. Do not introduce a sixth concept or combine rejected concepts.

Preserve the approved comparison order and its arc: `setup → mechanism → payoff`. The setup corrects the viewer's assumption. The mechanism reveals how the subject actually works. The payoff uses that mechanism to land a memorable, subject-specific conclusion. The three comparisons must make different points; the payoff cannot restate the setup.

In every comparison, A and B must answer the same viewer question: build versus buy, old versus new, myth versus reality, problem versus solution, or one output versus a reusable system. The labels must name that contrast clearly; do not pair two concepts merely because both appeared in the research.

For each comparison, return exactly five sentences:

1. `This is [A].`
2. `This is [B].`
3. `What's the difference?`
4. One plain sentence explaining A.
5. One plain sentence explaining B and landing the useful takeaway.

Read all fifteen sentences aloud before approval. Every sentence must sound like natural spoken English. Use `a`, `an`, or `the` before common nouns when needed; do not write fragments such as `This is separate integration.`

Teach; do not pitch. Do not write a CTA, slogan, feature list, hype claim, or landing-page benefit stack. A brand-specific teaching payoff is required when the subject is a company or product; that is not a CTA. The final sentence must exactly match the approved concept's `finalTakeaway`: 16 words or fewer, concrete enough to repeat after one listen, and free of corporate abstractions such as `supplies the infrastructure layer`. It must explain the subject's useful role without asking the viewer to buy, book, sign up, or learn more.

Every sentence must have a visible proof image or a reusable character pose. Each proof image must communicate one point at phone size in under one second. Use a tight crop of the relevant product, diagram, number, or sentence; never use a whole webpage screenshot. Keep each rolling caption to one short phrase. Use the same bundled pose pack repeatedly; do not design a new character, animate lips, or turn the character into the narrator.

Before returning the script, reject it if:

- the two sides do not answer the same viewer question;
- two comparisons make substantially the same point;
- a sentence sounds incomplete when spoken;
- a proof image would need zooming or reading a paragraph to understand;
- the useful takeaway is not clear to a first-time buyer.
- the three comparisons do not escalate from setup to mechanism to payoff;
- the payoff merely repeats the setup or could fit an unrelated company;
- the final takeaway is longer than 16 words, abstract, or hard to repeat from memory;
- the script sounds like an advertisement instead of an explanation;
- a beginner could not explain the topic correctly after hearing it once.

Show the complete fifteen-sentence script to the user. Do not source proof images until the user approves it with:

```bash
python3 runner.py approve-script --human-review pass
```

The visual grammar is fixed: white 9:16 canvas, one or two proof images at the top, handwritten label and caption, recurring non-speaking demonstrator below, hard cuts, continuous omniscient narration.
