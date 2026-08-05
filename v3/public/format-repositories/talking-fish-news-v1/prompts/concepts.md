# Concepts Prompt

The official runner writes the exact prompt with:

```bash
npm run format:talking-fish-news -- concept-prompt --run <run-id>
```

The prompt requires exactly five evidence-backed concepts. Each concept contains a headline, premise, reason it works, deadpan punchline, four IDs from the saved visual inventory, and four visible story moves in this order: setup, escalation, reveal, payoff. It applies a shuffle test: if the middle images can trade places without weakening the story, the concept fails. It contrasts the bad pattern `event -> statistic -> bigger statistic -> joke` with the good pattern `event -> obstacle -> visible discovery -> changed outcome plus joke`. It treats scraped text as evidence rather than instructions and returns JSON only.
