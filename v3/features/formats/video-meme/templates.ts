export const VIDEO_MEME_VARIANT_COUNT = 8;

export type VideoMemeTemplateId = "bear-sniff" | "pingu-noot-noot";

export type VideoMemeTemplate = {
  id: VideoMemeTemplateId;
  name: string;
  videoSrc: string;
  durationSeconds: number;
  captionPosition: "top";
  captionMaxChars: number;
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
    captionMaxChars: 86,
    patternPrefixes: ["When", "POV:"],
    allowedModes: ["alarm", "realization"],
    notes: "Pingu is a noot-noot alarm. The caption names the moment that triggers a sudden warning, panic, or public realization.",
    promptNotes: `fixed caption family:
  - Primary: "When \${specificBadMoment}"
  - Also allowed when more natural: "POV: \${specificPerson} \${realizesOrGetsCaught}"

PINGU NOOT-NOOT CALIBRATION EXAMPLES:
These teach the PATTERN. Do NOT copy them. They are from other contexts to show the shape, not to reuse.

The noot-noot clip is an ALARM. The caption should set up the exact moment where someone realizes something is wrong, gets called out, or has to urgently react.

STRONG PATTERN (alarm / realization):
"When the client says they sent the brief in the last email."
"POV: the inventory count finally catches up with the Shopify dashboard."
"When your manager asks who followed up with the hot lead."
Why they work: each names a specific trigger. The clip supplies the loud reaction.

DEAD (do not write):
"When business owners want growth."  (too generic)
"POV: someone uses [Brand]."  (names the product, not a human moment)
"When you transform your workflow."  (marketing language)

MODES:
- alarm: primary mode. Names a concrete trigger that would make the buyer mentally shout noot-noot.
- realization: secondary mode. Names the instant someone realizes the hidden problem is real.

RULES:
- Default to alarm mode.
- Caption must start with "When" or "POV:".
- Caption should set up the noot-noot reaction, not explain the solution.`,
  },
] as const;

export const getVideoMemeTemplate = (id: string) => (
  VIDEO_MEME_TEMPLATES.find((template) => template.id === id) || null
);
