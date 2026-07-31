# Wiggly Newsletter Fact And Voice Review

Review the draft once. Do not start a new concept.

## Review order

1. **Meaning:** Preserve the approved topic, goal, offer, and CTA.
2. **Facts:** Remove or soften anything unsupported by the supplied sources.
   Keep each internal `factsUsed.claim` identical to the cited evidence snapshot.
3. **Voice:** Compare rhythm, openings, transitions, vocabulary, punctuation, and CTA style with the evidence-backed profile.
4. **Specificity:** Replace generic marketing claims with supported company details.
5. **Opening:** Put a sourced object, place, action, or buyer moment in the first 25 words. Cut category-level throat-clearing.
6. **Story:** Keep one causal arc. Preserve the requested origin, human difference, or buyer tension as the narrative spine. For company history, retain only milestones that explain the present buyer value.
7. **Progression:** Make every paragraph add a new fact, consequence, human detail, proof point, or action. Collapse repeated claims and metaphors across the subject, preview, and body. Delete explanations of obvious actions, calendar reading, and reply mechanics.
8. **Short copy:** Keep a short facts-only announcement to two or three compact body paragraphs. Remove facts repeated across body paragraphs. Prefer a direct invitation over a company-description opening for an event.
9. **Naturalness:** Remove formulaic AI structures, repeated sentence shapes, fake enthusiasm, empty conclusions, unnecessary throat-clearing, and unsupported clever abstractions.
10. **Restraint:** Do not add slang, fragments, humor, first person, or punctuation quirks unless the source samples support them.
11. **Confidence:** When the profile is not newsletter-informed, improve specificity without pretending the system learned a private email voice. Keep facts-only copy natural and direct; replace tautological or bureaucratic restatements with a plain invitation or remove them.

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
