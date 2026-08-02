# Five Teaching Concepts Prompt

Using only the approved beginner brief, its evidence, and the validated assets in `visual-assets.json`, generate exactly five different teaching concepts in `concepts.json`.

Each concept must contain:

- a curiosity-driven title;
- one central viewer question;
- one plain statement of what the viewer learns;
- why the idea is interesting;
- why it does not feel like an advertisement;
- the evidence IDs it uses;
- six unique `visualAssetIds` from the inventory that can actually show the three comparisons, ordered as `setup A`, `setup B`, `mechanism A`, `mechanism B`, `payoff A`, `payoff B`;
- three planned A-versus-B comparisons that build one escalating lesson;
- one final takeaway that names the subject's useful role without asking the viewer to act.

The three comparisons must have these `beat` values in order:

1. `setup`: correct the beginner's false assumption or establish the category distinction;
2. `mechanism`: reveal a deeper process, system, or cause;
3. `payoff`: apply the mechanism and land the memorable subject-specific conclusion.

The payoff cannot merely rename or restate the setup. Read the three `difference` fields in order: they should feel like discovery, not three definitions of the same distinction. `finalTakeaway` must be a complete spoken sentence of 16 words or fewer that a viewer can repeat after hearing once. Use concrete verbs to show the useful division of labor, cause, or consequence. Prefer lines like `Recall.ai records the meeting; your product decides what happens next.` Reject corporate abstractions such as `supplies the infrastructure layer`. It may name the company or product when that makes the lesson concrete, but it must not be a CTA or slogan.

Every A and B pair must answer the same question. Prefer distinctions a beginner can see: old versus new, myth versus reality, one object versus the system behind it, manual versus managed, or output versus process.

Visual feasibility is part of concept quality. Recommend a concept only when its six inventoried assets make all three comparisons instantly understandable. At least four candidates must be subject-specific, and no more than two may be constructed. Do not propose a concept and hope to invent its visuals later.

Reject concepts that list features, repeat the same distinction three times, depend on jargon, compare unlike categories, make unsupported claims, omit a subject-specific payoff, end with a sales action, or lack six strong sourced visuals.

Show all five concepts to the user in plain language. Do not write the fifteen-line script until the user chooses one and the runner records approval with:

```bash
python3 runner.py approve-concept --concept-id <id> --human-review pass
```
