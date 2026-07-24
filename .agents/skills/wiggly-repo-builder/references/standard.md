# Wiggly Repo Standard

This is the single living record of what Wiggly has learned about reusable, agent-operated Formats. Update it after real builds and blind-agent runs, not after brainstorming alone.

## Contents

- How to update this standard
- Proven rules
- Still testing
- Otaku-specific choices
- Gate for calling something a Wiggly Repo

## How to update this standard

Classify every lesson:

- **Proven:** observed in a real failure or successful run.
- **Still testing:** plausible, but not yet supported by different Repos.
- **Format-specific:** useful inside one Repo and not a shared rule.

For a new lesson, record the behavior, root cause, smallest general rule, and evidence. Prefer changing an existing rule over adding a near-duplicate.

## Proven rules

### 1. Ship a runnable package

**Rule:** A Wiggly Repo must include its working runtime, not only a page, prompts, screenshots, or pseudocode.

**Why:** A fresh agent rebuilt Otaku’s renderer when it could only see how the output was supposed to look. The replacement introduced different timing behavior.

**Evidence:** The downloadable Otaku Format Kit let fresh agents use the packaged runner and renderer instead.

### 2. Make one runtime official

**Rule:** Preview, test, and final output must use the same packaged renderer and runner. Instructions must explicitly forbid rebuilding them.

**Why:** Reimplementation creates outputs that look close while quietly changing timing, layout, or audio.

**Evidence:** Otaku’s official runner preserved its renderer across Naruto, Danny Phantom, SpongeBob, Yu-Gi-Oh, and later blind-agent world changes.

### 3. Declare requirements without storing secrets

**Rule:** Name required local tools, providers, and environment variables. Keep secret values outside the Repo and ask only for missing key names.

**Why:** An agent should know what it needs before starting, while a person who receives the Repo supplies their own keys.

**Evidence:** Otaku’s requirement check separated Fish voice access from optional Serper asset sourcing without leaking either key.

### 4. Smoke-test before real work

**Rule:** Provide a free, one-command smoke test that exercises the official runtime and fixed assets without provider calls.

**Why:** Missing tools, broken assets, and renderer setup should fail before the agent spends money or builds a full run.

**Evidence:** Otaku’s smoke test found that short videos did not produce contact sheets under the old fixed sampling interval.

### 5. Validate before spending

**Rule:** Validate inputs, contracts, asset references, layouts, and timing data before any paid or rate-limited media call.

**Why:** Provider success cannot repair an invalid plan.

**Evidence:** Otaku rejects unknown roles, layouts, backgrounds, missing assets, and invalid scenes before Fish voice generation.

### 6. Read timing from media

**Rule:** Derive scene and output duration from actual audio or video files. Represent intentional holds explicitly; never add unexplained padding.

**Why:** Guessed padding created audible dead air between otherwise valid voice clips.

**Evidence:** Historical Otaku runs contained roughly 520 ms of extra time per scene. The official runner and audio checks now detect that mismatch.

### 7. Inspect the finished media

**Rule:** Evaluate the rendered output, not only plans, API responses, or individual assets. Produce inspectable evidence such as a contact sheet, playable output, and quality report.

**Why:** Many failures appear only after composition: clipped text, floating characters, silent gaps, hard music seams, or bad pacing.

**Evidence:** Otaku’s contact sheets and final-video inspection exposed visual grounding and audio-continuity problems that source validation could not.

### 8. Combine automatic gates with human judgment

**Rule:** Block finalization when measurable checks fail, then require an honest creative review for meaning, fit, and usefulness.

**Why:** Software can detect missing audio and bad timing but cannot decide by itself whether a joke lands or an analogy makes sense.

**Evidence:** Otaku automatically checks audio, timing, assets, and contracts while its review asks whether the lesson is accurate and natural.

### 9. Separate reusable mechanics from replaceable content

**Rule:** Keep content packs, prompts, assets, voices, and facts outside the reusable renderer and runner.

**Why:** A content change should not require surgery on the engine.

**Evidence:** Danny Phantom and SpongeBob were added through world data, assets, voices, music, and scenes without story-specific renderer code.

### 10. Limit attempts and fail clearly

**Rule:** Set a small render-attempt ceiling. Fix only observed problems, and stop with a clear blocker rather than silently retrying or changing providers.

**Why:** Unbounded agent loops waste time and money while hiding whether the Format is reliable.

**Evidence:** Otaku caps a run at three attempts and records why each attempt exists.

### 11. Preserve evidence and provenance

**Rule:** Keep the Format version, input, assets and sources, dependency choices, attempt history, quality report, and final output reviewable after refresh or fresh checkout.

**Why:** A finished file alone cannot explain how it was made or whether another agent can reproduce it.

**Evidence:** Otaku packages world data, asset provenance, voice IDs, scene plans, contact sheets, quality reports, and final videos.

### 12. Return the result

**Rule:** A successful agent run ends by giving the user the finished media, not merely a path, commit, or “render complete” message.

**Why:** The user asked for the creative result, not the build system.

**Evidence:** The useful Otaku proof was the playable video delivered in chat.

### 13. Never animate planning thumbnails

**Rule:** Storyboards and contact sheets may guide production, but every generative-video start and end frame must be a separately generated, full-quality production asset.

**Why:** Enlarging a small storyboard panel produced a blurry endpoint, and the video model copied that blur while inventing a new person and setting to bridge the mismatch.

**Evidence:** The first 3D Breakdown LEGO proof passed duration and file checks but failed paid-media review because its ending frames came from upscaled storyboard crops.

## Still testing

These ideas are deliberately not universal yet:

- Every Wiggly Repo should use the exact Otaku command names.
- Every Repo needs a public file-browser page.
- Every Repo needs scenes or a timeline.
- Every Repo needs a contact sheet; static-image Formats may need different evidence.
- Run evidence should share one product-wide UI component.
- One folder and manifest shape can cover static ads, template-only video, and generative video equally well.

Repo #2 should challenge these assumptions instead of copying Otaku blindly.

## Otaku-specific choices

Do not put these into a general builder or Wiggly’s app shell:

- learner, guide, and challenger roles;
- story-world packs and lore;
- 12–18 short scenes;
- anime or cartoon character cutouts;
- two- and three-character layouts;
- speech bubbles, moving backgrounds, callouts, and active-speaker glow;
- the rule that a technical lesson maps to events from a fictional world.

## Gate for calling something a Wiggly Repo

A candidate passes only when:

1. A fresh agent can start from the Repo package or page without the user teaching the Format.
2. The free smoke test proves the official runtime locally.
3. Missing tools and key names are reported before work begins.
4. Validation happens before spending.
5. At least two meaningfully different inputs use the same runtime.
6. The agent inspects the real output and cannot finalize failed checks.
7. Replaceable content does not require proof-specific renderer or runner changes.
8. The final media and evidence are returned and remain reviewable.

Passing one beautiful example is not enough.
