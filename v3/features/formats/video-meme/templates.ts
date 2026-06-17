export const VIDEO_MEME_VARIANT_COUNT = 8;
export const PINGU_NOOT_NOOT_VARIANT_COUNT = 3;
export const DARWIN_JOURNEY_VARIANT_COUNT = 3;

export type VideoMemeTemplateId = "bear-sniff" | "pingu-noot-noot" | "darwin-journey";

export type VideoMemeTemplate = {
  id: VideoMemeTemplateId;
  name: string;
  videoSrc: string;
  durationSeconds: number;
  captionPosition: "top";
  captionMaxChars: number;
  variantCount: number;
  patternPrefixes: readonly string[];
  allowedModes: readonly string[];
  notes: string;
  promptNotes: string;
};

export const VIDEO_MEME_TEMPLATES: readonly VideoMemeTemplate[] = [
  {
    id: "bear-sniff",
    name: "Bear Sniffing Meme",
    videoSrc: "/video-memes/bear-sniff.mp4",
    durationSeconds: 8,
    captionPosition: "top",
    captionMaxChars: 90,
    variantCount: VIDEO_MEME_VARIANT_COUNT,
    patternPrefixes: ["This bear sniffs"],
    allowedModes: ["caught", "flattering"],
    notes: "The bear is a secret-sniffer. The strongest captions expose a hidden thought, guilty work habit, or embarrassing buyer moment.",
    promptNotes: `fixed caption family:
  - Primary: "This bear sniffs people who \${secretBehavior}"
  - Also allowed when more natural: "This bear sniffs \${specificGroup} \${secretBehavior}"

BEAR-SNIFF CALIBRATION EXAMPLES:
These teach the PATTERN. Do NOT copy them. They are from other contexts to show the shape, not to reuse.

The strongest bear captions expose a SECRET behavior or thought, like the bear is a lie detector. The comedy is being CAUGHT, not being complimented.

VIRAL PATTERN (caught in the act):
"This bear sniffs people who want to quit their job."
"This bear sniffs people updating LinkedIn at office hours."
"This bear sniffs people with eleven half-used serums in the drawer."
Why they work: each names a SECRET the viewer recognizes in themselves. The bear exposing it is the joke. Viewers tag a friend who is guilty of it.

WEAKER PATTERN (flattering claim, use sparingly):
"This bear sniffs people who never miss a client call."
Why it is weaker: it is a compliment, not an exposure. Still works, but lower share rate. Use only when no secret-behavior angle exists.

DEAD (do not write):
"This bear sniffs successful business owners."  (too vague, no specific behavior)
"This bear sniffs people who use [Brand]."  (names the product, nobody tags themselves for using a tool)
"This bear sniffs people who want to transform their business."  (marketing language, not a real human thought)

MODES:
- caught: primary mode. Exposes a secret behavior, private thought, guilty work habit, or embarrassing buyer moment.
- flattering: fallback mode. Names an aspirational identity or after-state. Use sparingly.

RULES:
- Default to caught mode.
- Caption must start with "This bear sniffs".`,
  },
  {
    id: "pingu-noot-noot",
    name: "Pingu Noot Noot Meme",
    videoSrc: "/video-memes/pingu-noot-noot.mp4",
    durationSeconds: 8.5,
    captionPosition: "top",
    captionMaxChars: 70,
    variantCount: PINGU_NOOT_NOOT_VARIANT_COUNT,
    patternPrefixes: [],
    allowedModes: ["comic_dread"],
    notes: "Pingu is a two-beat comic dread meme. The setup is calm; the dread line lands on the dramatic close-up.",
    promptNotes: `FORMAT FRAME:
This is a comedy meme. It treats a tiny, specific work annoyance as if it were a grand tragedy. The clip moves from calm Pingu to a frozen dramatic close-up as opera music swells. The comedy comes from the mismatch: a normal moment gets an absurdly serious reaction.

PINGU NOOT-NOOT CALIBRATION EXAMPLES:
These teach the PATTERN. Do NOT copy them. They are from other contexts to show the shape, not to reuse.

Write ONE matched before/after pair:
- setupText: the calm/confident thought right before reality hits
- dreadText: the comic doom thought when the dramatic close-up lands

Both slots must read like thoughts happening right now, not captions describing a situation.
Bad: "the client changed the brief"
Good: "client says the old brief was better"

Strong:
"client approved the final version" -> "client: can we go back to v1"
"just pushed the update, heading home" -> "the update was on prod"
"schedule looks light today" -> "every patient calls at the exact same minute"
"campaign numbers look amazing" -> "CEO asks which channel drove revenue"
"the post just went viral" -> "out of stock by noon"

Weak:
"we get a lot of calls" -> "we miss some calls"
Why weak: no real flip, too generic.

DEAD (do not write):
"transform your front desk" -> "with [Brand]"  (marketing + names product)
"things are fine" -> "things are bad"  (vague, no specific moment)

MODES:
- comic_dread only. Positive or aspirational angles do NOT fit this clip.

RULES:
- setupText must feel calm, even smug.
- dreadText must directly undercut setupText.
- The text is flat and literal; the clip and music supply the comedy.
- Do not add jokes, winks, commentary, or explanations to the text.
- Do not write generic dread words like panic, disaster, nightmare, chaos, doomed, or things go wrong.
- Name the actual specific thing that went wrong.
- Each slot must be under 70 characters.
- Return templateId "pingu-noot-noot", not clipId.
- Output slots.setupText and slots.dreadText. Do not output caption.`,
  },
  {
    id: "darwin-journey",
    name: "Darwin's Journey",
    videoSrc: "/video-memes/darwin-journey.mp4",
    durationSeconds: 19.39,
    captionPosition: "top",
    captionMaxChars: 90,
    variantCount: DARWIN_JOURNEY_VARIANT_COUNT,
    patternPrefixes: [],
    allowedModes: ["customer_pain", "business_pain", "goofy_exaggeration"],
    notes: "Darwin stays blank-faced while chaos blurs past. The caption names who stayed calm and what brand-specific pain they survived.",
    promptNotes: `FORMAT FRAME:
This is a comedy meme. Darwin sits calm and blank-faced while wildly chaotic environments blur past behind him. The joke is the mismatch: visible calm versus the absurd amount of specific pain they clearly survived.

DARWIN JOURNEY CALIBRATION EXAMPLES:
These teach the PATTERN. Do NOT copy them. They are from other contexts to show the shape, not to reuse.

Strong customer_pain:
"POV: the patient who called 4 dentists and got voicemail at every one"

Strong business_pain:
"POV: the front desk after flu season, 30 voicemails, and a triple-booked Monday"

Strong goofy_exaggeration:
"POV: the front desk whose voicemail box filed a restraining order"

Weak:
"When work gets crazy"
Why weak: generic chaos, no specific persona or pain stack.

Dead:
"When your coffee spills and your wifi dies"
Why dead: random off-brand trouble, not a brand pain.

CAPTION PATTERNS:
- "POV: the \${persona} who survived \${specific stacked pains}"
- "When your calm doesn't match the \${specific thing you just got through}"
- "\${specific persona} after \${specific pain stack}"

MODES:
- customer_pain: the buyer's POV after surviving the bad version of the problem.
- business_pain: the operator's POV after surviving the workload or grind.
- goofy_exaggeration: a real brand pain exaggerated absurdly. Not random internet chaos.

RULES:
- Single caption only. Return slots.caption.
- Prefer a mode mix when evidence supports it, but never force a weak mode.
- Name the actual pain stack. Do not call it chaos, stress, or things getting crazy.
- Goofy variants must exaggerate a real brand pain, and selfCheckPassed must name the real pain underneath.
- Do not use "This bear sniffs".
- Do not use setupText or dreadText.
- Return templateId "darwin-journey", not clipId.`,
  },
] as const;

export const getVideoMemeTemplate = (id: string) => (
  VIDEO_MEME_TEMPLATES.find((template) => template.id === id) || null
);
