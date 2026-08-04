# Talking Fish News: Source Study

## Scope

This is research, not a public Wiggly format or an implementation plan.

The source is [@realtalkingfish](https://www.instagram.com/realtalkingfish/), whose public
Linktree identifies the account as `T.McTrout - The Real Talking Fish` and links its
YouTube mirror. The analysis below uses a public 12-episode sample from that channel.
It does not copy source assets, characters, logos, or audio into the product.

## Method

- Six higher-view episodes, three middle-view episodes, and three lower-view episodes.
- Frame sheets at four-second intervals for every episode.
- Public auto-captions where the channel made them available.
- The public YouTube view count is only a sampling signal, not proof of Instagram
  performance. The creator's Instagram outlier sort remains a separate verification pass.

## Corpus

| Tier | Episode | YouTube views at capture | Duration | Captions |
| --- | --- | ---: | ---: | --- |
| Higher | [Paul Alexander / iron lung](https://www.youtube.com/shorts/Nzfs6Y_gs4c) | 24K | 15.3s | Yes |
| Higher | [Francis Scott Key bridge](https://www.youtube.com/shorts/VM5LBYxOVhc) | 16K | 16.9s | No |
| Higher | [United flight tire](https://www.youtube.com/shorts/fgnE2I9uqvE) | 12K | 14.5s | No |
| Higher | [Combs raid](https://www.youtube.com/shorts/6Geb54n0m0g) | 11K | 9.7s | Yes |
| Higher | [Apple lawsuit](https://www.youtube.com/shorts/MZcxSnY4PcI) | 10K | 16.3s | Yes |
| Higher | [Akira Toriyama](https://www.youtube.com/shorts/fo0pfHdTw-0) | 9.6K | 14.8s | Yes |
| Middle | [Jake Paul v. Mike Tyson](https://www.youtube.com/shorts/dK9_lm4zT-s) | 4.9K | 17.3s | Yes |
| Middle | [Iran aerial attack](https://www.youtube.com/shorts/-V9CwOXWB1s) | 4.7K | 18.3s | Yes |
| Middle | [Krusty Towers](https://www.youtube.com/shorts/8w9lEQoM-iE) | 4.5K | 14.6s | Yes |
| Lower | [Teixeira case](https://www.youtube.com/shorts/-d7u3wc6Sz4) | 219 | 25.8s | Yes |
| Lower | [Texas Senate bill](https://www.youtube.com/shorts/AoiCXcndHv0) | 242 | 16.3s | Yes |
| Lower | [Ed Sheeran case](https://www.youtube.com/shorts/NchS9lbu43Y) | 313 | 29.3s | Yes |

## What The Episodes Actually Do

### Proven format grammar

1. **The event is the hook.** The first spoken words are normally `breaking news` plus a
   concrete event. There is no warm-up and no explanation of the presenter.
2. **Evidence leads.** A real photo, clip, headline, document, or recognizable fictional
   scene occupies the upper half of the vertical frame. It changes as the facts change.
3. **The anchor is an authority stamp, not the spectacle.** A nearly static fish cutout
   appears in the lower half against a simple underwater set. It rarely performs a visible
   action, and it does not need a desk or a realistic newsroom.
4. **Captions carry the full report.** Large, high-contrast sentence fragments sit over the
   fish section. They track the narration and explain what the source image means.
5. **The story is one short report.** Headline, two or three factual details, then either a
   developing-story exit, a proof clip, or `follow for more breaking news`.
6. **The comedy is restraint.** A dead-serious report inside a familiar underwater news
   wrapper does the work. The source does not add a joke after every line.

### Source timecode pattern

| Beat | Typical range | Evidence |
| --- | --- | --- |
| Headline | 0.0-2.5s | `breaking news` plus the event appears immediately in the Paul Alexander, Apple, Combs, Iran, Krusty Towers, and Teixeira episodes. |
| First fact | 2.5-6.5s | The top evidence switches once while the anchor and caption treatment stay stable. |
| Context | 6.5-12.5s | Two or three specific facts or source images explain why the event matters. |
| Proof or close | 12.5-18s | The strongest proof clip, consequence, or simple developing-story close. Longer reports may add a follow line. |

The 15.3-second Paul Alexander report is the cleanest compact example: the event lands in
the opening 2.8 seconds, the historical explanation runs through about 12.4 seconds, and
the final identifying fact closes by 17.3 seconds. It is not a five-act sales script.

## Asset Classification

| Element | Classification | What the evidence supports |
| --- | --- | --- |
| Immediate concrete headline | Fixed | Present in almost every sampled report. |
| One recurring anchor | Fixed | The same fish visual acts as the report's authority marker. |
| Evidence-led top panel | Fixed | Every sampled episode gives the subject more area than the anchor. |
| Large readable captions | Fixed | Captions supply the actual explanation, not decoration. |
| Deadpan neutral delivery | Fixed | The voice frames a report, not a brand testimonial. |
| Underwater blue/teal anchor backing | Usual | Repeats across the sample, but the exact art treatment varies. |
| `BREAKING NEWS` header | Usual | Present in most of the older/source-faithful layout; not every higher-view short uses the exact same spelling or treatment. |
| Follow/developing-story ending | Optional | Used in several reports, absent in compact reports. |
| Evidence type | Variable | News footage, official screen, infographic, photo, source document, or a proof clip. |
| B-roll count | Variable | Usually 2-4 distinct evidence moments. |
| Fish movement, desk, ticker, station bug, music sting, sign-off | Unsupported | The sampled source does not establish these as required. Adding them by default would be invention. |

## Why The Generic Director Brief Was Wrong

The proposed "photorealistic fish in a blue suit at a professional underwater news desk"
would miss the observed source in three ways:

- It makes the anchor the visual subject, while the source makes the evidence the subject.
- It assumes an elaborate broadcast studio, ticker, station logo, and music sting that the
  sample does not need.
- It turns the format into an ad presenter instead of a compact, evidence-led report.

The reusable production question is not "how do we animate a fish anchor?" It is
"what proof can make the brand event feel newsworthy before the product is named?"

## Initial Anti-Ad Rules

- Do not begin with the brand, product name, feature list, founder, or CTA.
- Do not put tiny screenshots, dense UI text, or unreadable legal/product copy in the
  evidence panel.
- Do not use an anchor monologue over a static product image.
- Do not make the fish smile, wink, pitch, gesture, or lip-sync theatrically.
- Do not rely on nostalgia alone. The story must have a concrete event, contrast, or proof.
- Do not force every business into "breaking news." A brief that cannot produce a credible
  newsworthy event must fail the concept stage instead of becoming a fake urgent ad.

## Pending Before A Build Decision

- Compare the sampled public channel structure against the user-sorted Instagram outliers
  before a public build decision.
- Test a controlled original visual proof before publishing an agent kit.

## Validation Status

- Two fresh holdout episodes were checked after the rulebooks were written; see
  [rule validation](./talking-fish-news-validation.md).
- Ecommerce, SaaS, local service, and information-business concept slates each produced one
  supported reportable event; see the
  [business stress test](./talking-fish-news-business-stress-test.md).
