# Visual Research Prompt

Build `visual-assets.json` after the beginner brief and before generating concepts.

Stop once you have 6-12 strong assets that can support five genuinely different concepts.

Use the agent's normal browser or web tools. Start with the subject's official website, product pages, documentation, newsroom, help center, and official social or video channels. Save 6-12 usable images or tight screenshots locally under `assets/proof/`.

Do not spend more than five minutes fighting one download method. Use this fallback order:

1. Save the official image or direct CDN asset.
2. If that fails or returns `403`, immediately capture a tight visible-browser screenshot of the useful visual on the official page. Do not try another media extractor or asset-bundling tool.
3. Use domain-filtered image search to locate the same official page or CDN asset.
4. Use a frame from the subject's official video or social account, recording that official URL as the source.

Do not use `pageAssets.bundle` or any bulk media export. You need 6-12 strong pictures, not the whole site. Search results are discovery tools, not evidence by themselves. The saved asset must resolve back to an official source. If all four methods fail, stop and name the missing visual instead of hanging, using generic stock, or lowering the quality bar.

For each asset, record:

- a stable ID and local path;
- what the viewer will recognize in under one second;
- a 2-8 word `glanceMeaning` that names only what is visibly obvious;
- a `sceneFamily` that distinguishes its setting or composition from similar images;
- `visualForm`: `object`, `person`, `action`, `place`, `simple-graphic`, or `interface`;
- `textDependency`: `none` or `large-label`;
- whether it is an official image, official screenshot, licensed reference, or constructed visual;
- the exact source page and asset URL;
- whether it is specific to this subject.

Prefer real product images, recognizable people or objects, physical actions, places, simple official graphics, and official side-by-side comparisons. Never replace an available official visual with a homemade approximation. Do not use generic stock, tiny interfaces, whole webpages, code, paragraphs, course-page screenshots, patent drawings that need explanation, or an image that merely looks technical. If the viewer must read fine text to know what the picture proves, the asset is invalid.

For software, crop to one obvious state, person, bot tile, icon, or action instead of showing a whole interface. For information businesses, show the expert, demonstration, learner action, artifact, or result instead of six pages of course copy. For physical products, the mechanism itself must be visible without asking the caption to explain a technical drawing. For locations, distinguish a tight object or station from a genuinely wider environment.

A concept may use at most two constructed visuals among its six candidates. Every constructed visual must explain why no sourced visual can show the fact. If fewer than six strong assets exist, stop and tell the user what is missing instead of inventing placeholders.

Run:

```bash
python3 runner.py assets
python3 runner.py asset-board
```

View the image-only audition at phone size. Reject any picture that needs fine print, a paragraph, or technical interpretation. Approve only a board where every picture is recognizable on sight:

```bash
python3 runner.py approve-assets --human-review pass
```

Do not generate teaching concepts until the visual inventory is approved.
