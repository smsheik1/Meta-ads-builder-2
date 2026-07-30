# Research decisions

Wiggly adapts ideas, not whole codebases.

## Adopted

- Evidence-backed voice profiles and sample-first calibration from [milock/humanizer](https://github.com/milock/humanizer) (MIT).
- Multi-dimensional voice extraction from [gooseworks-ai/goose-skills](https://github.com/gooseworks-ai/goose-skills) (MIT).
- Structural AI-tell review and meaning preservation from [blader/humanizer](https://github.com/blader/humanizer) (MIT).
- Voice-hypothesis and regression-scenario ideas from [harshaneel/humanize](https://github.com/harshaneel/humanize) (MIT).
- Deterministic pattern validation as a guardrail, not a detector score, inspired by [brandonwise/humanizer](https://github.com/brandonwise/humanizer) (license must be rechecked before copying any implementation).

## Rejected for this MVP

- AI-detector evasion as a product goal.
- Giant banned-word catalogs as the main quality system.
- Random typos, slang, fragments, or disfluency injection.
- Five mandatory feedback rounds before the first useful output.
- A vector database or semantic RAG service.
- Scraper-specific dependencies.
- Best-of-N generation and commercial detector scoring.
- Automatic learning from every user edit.

## Wiggly's newsletter-specific decision

Three to five real newsletters determine writing behavior. Website evidence determines current facts. The writer produces one draft, and a separate review prompt performs one meaning-first fact-and-voice revision. The local runner validates structure, source ids, generic failure phrases, and saved progress without calling a provider.
