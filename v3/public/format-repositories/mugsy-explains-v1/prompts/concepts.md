# Five Teaching Concepts Prompt

Using only the approved beginner brief and its evidence, generate exactly five different teaching concepts in `concepts.json`.

Each concept must contain:

- a curiosity-driven title;
- one central viewer question;
- one plain statement of what the viewer learns;
- why the idea is interesting;
- why it does not feel like an advertisement;
- the evidence IDs it uses;
- three planned A-versus-B comparisons that build one lesson.

Every A and B pair must answer the same question. Prefer distinctions a beginner can see: old versus new, myth versus reality, one object versus the system behind it, manual versus managed, or output versus process.

Reject concepts that list features, repeat the company name as the answer, depend on jargon, compare unlike categories, make unsupported claims, or end with a sales action.

Show all five concepts to the user in plain language. Do not write the fifteen-line script until the user chooses one and the runner records approval with:

```bash
python3 runner.py approve-concept --concept-id <id> --human-review pass
```
