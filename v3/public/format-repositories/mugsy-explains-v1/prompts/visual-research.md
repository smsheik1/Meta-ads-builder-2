# Visual Research Prompt

Build `visual-assets.json` after the beginner brief and before generating concepts.

Use the agent's normal browser or web tools. Start with the subject's official website, product pages, documentation, newsroom, and help center. Save 6-20 usable images or tight screenshots locally under `assets/proof/`. Domain-filtered image search may supplement official research, but it does not replace it.

For each asset, record:

- a stable ID and local path;
- what the viewer will recognize in under one second;
- whether it is an official image, official screenshot, licensed reference, or constructed visual;
- the exact source page and asset URL;
- whether it is specific to this subject.

Prefer real product images, recognizable people or objects, official UI crops, and official side-by-side comparisons. Never replace an available official visual with a homemade approximation. Do not use generic stock, tiny interfaces, whole webpages, long text, or an image that merely looks technical.

A concept may use at most two constructed visuals among its six candidates. Every constructed visual must explain why no sourced visual can show the fact. If fewer than six strong assets exist, stop and tell the user what is missing instead of inventing placeholders.

Run:

```bash
python3 runner.py assets
```

Do not generate teaching concepts until the inventory passes.
