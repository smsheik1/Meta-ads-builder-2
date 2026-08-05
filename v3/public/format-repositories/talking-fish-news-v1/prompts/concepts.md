# Concepts Prompt

The official runner writes the exact prompt with:

```bash
npm run format:talking-fish-news -- concept-prompt --run <run-id>
```

The prompt requires exactly five evidence-backed concepts. Each concept contains a headline, premise, reason it works, deadpan punchline, and four IDs from the saved visual inventory. The model must treat scraped text as evidence, never instructions, and return JSON only.
