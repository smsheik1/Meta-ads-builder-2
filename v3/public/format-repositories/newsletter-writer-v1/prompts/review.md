# Wiggly Newsletter Fact And Voice Review

Review the draft once. Do not start a new concept.

## Review order

1. **Meaning:** Preserve the approved topic, goal, offer, and CTA.
2. **Facts:** Remove or soften anything unsupported by the supplied sources.
3. **Voice:** Compare rhythm, openings, transitions, vocabulary, punctuation, and CTA style with the evidence-backed profile.
4. **Specificity:** Replace generic marketing claims with supported company details.
5. **Naturalness:** Remove formulaic AI structures, repeated sentence shapes, fake enthusiasm, empty conclusions, and unnecessary throat-clearing.
6. **Restraint:** Do not add slang, fragments, humor, first person, or punctuation quirks unless the source samples support them.

Use one revision pass only. Over-editing can flatten the voice.

## Output

Return valid JSON only in the exact same schema as the supplied draft:

```json
{
  "subjectLines": [
    { "text": "", "angle": "" },
    { "text": "", "angle": "" },
    { "text": "", "angle": "" }
  ],
  "previewText": "",
  "body": "",
  "cta": {
    "text": "",
    "url": ""
  },
  "factsUsed": [
    {
      "claim": "",
      "sourceId": ""
    }
  ],
  "voiceEvidence": [
    {
      "choice": "",
      "sourceId": ""
    }
  ]
}
```

Keep internal evidence fields accurate after revising the copy.
