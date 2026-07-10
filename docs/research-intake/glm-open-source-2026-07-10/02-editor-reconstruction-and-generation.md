# Packet 2: Editor, Reconstruction, Scraping, and Structured Output

- Review status: Unverified
- Decision status: No new candidate approved

## Candidate map from the intake

| Candidate | Proposed role | Claimed effect |
| --- | --- | --- |
| LayerHub `react-design-editor` | Complete `/builder` canvas editor | Reduce canvas work to integration only |
| LayerD | Convert a reference ad into layers | Supply the Maker reconstruction engine |
| Polotno SDK and JSON | Template representation, variables, and editor data | Receive LayerD output and drive editable templates |
| Konva | Canvas rendering | Provide a “single render path” inside the proposed editor stack |
| `browser-use` plus `ad-use` | Website and product extraction | Replace or accelerate scraper work |
| Instructor plus GLM | Structured output for eight Campaign Plays | Constrain model responses and reduce parser work |

## Proposed flow described by GLM

```text
Reference ad
  -> LayerD layers
  -> translation into Polotno JSON
  -> LayerHub editor
  -> Konva rendering

Website
  -> browser-use / ad-use extraction
  -> brand and product data
  -> GLM plus Instructor
  -> eight Campaign Plays
  -> content swap and CSS visual reroll
```

The intake names LayerHub, Polotno, and Konva together but does not define their exact ownership boundaries or whether they share one scene model.

## Claimed custom work

- LayerD-to-Polotno translation
- Format skill and Campaign Play prompt
- `/create` flow wiring
- Format Version and Player instance schema
- Content reroll as JSON replacement
- Visual reroll as CSS replacement

## Claimed time estimates

| Work | GLM estimate |
| --- | ---: |
| Canvas editor | 0 days |
| Layer reconstruction wiring | About 1 week |
| Format skill plus eight Campaign Plays | About 3 days |
| Scraper adaptation | About 1 day |
| `/create` Player flow | About 3 days |
| Reroll logic | About 1 day |

These are copied estimates, not an accepted schedule.

## Information to collect during review

- Exact LayerHub repository, current activity, React/Next compatibility, and export model
- Whether LayerHub uses Polotno, a fork, or a different document schema
- Whether Polotno is a library dependency, a data format, or both in this proposal
- Whether the stack would introduce a second pixel renderer or state store
- LayerD output fidelity and translation cost on Wiggly's saved references
- `browser-use` and `ad-use` output quality versus Wiggly's existing research and product extraction
- Instructor support for the locked NVIDIA NIM and GLM 5.2 path
- Exact semantics behind “JSON swap” and “CSS swap” for overrides, groups, and deterministic rerolls
