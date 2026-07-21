"use client";

import { ChevronLeft, ChevronRight, Quote, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AdRenderSurface } from "@/features/render/AdRenderSurface";
import type { JingleAdScene, VisualizerAdScene } from "@/features/scene/types";

const formatSlides = [
  {
    id: "three-d-breakdown",
    label: "3D Breakdown",
    eyebrow: "Explain the mechanism",
    headline: "Show what the product does from the inside.",
    accent: "#52D6FF",
    visual: "three-d" as const,
  },
  {
    id: "jingle-apple",
    label: "Apple Jingle",
    eyebrow: "Brand jingle",
    headline: "Apple magic, all in one place.",
    accent: "#FF7BAA",
    jinglePreviewId: "apple-all-in-one-place",
    visual: "jingle" as const,
  },
  {
    id: "motion-story",
    label: "Motion Story",
    eyebrow: "Make the product feel premium",
    headline: "Turn proof and product imagery into a polished story.",
    accent: "#C9FF55",
    status: "Coming soon",
    visual: "motion" as const,
  },
  {
    id: "video-meme",
    label: "Video Meme",
    eyebrow: "Borrow the scroll stop",
    headline: "Give a familiar reaction clip a brand-specific punchline.",
    accent: "#FFD75A",
    visual: "video-meme" as const,
  },
  {
    id: "reviews",
    label: "Reviews",
    eyebrow: "Let the customer sell it",
    headline: "Turn the strongest line on the page into the ad.",
    accent: "#FF7BAA",
    visual: "reviews" as const,
  },
  {
    id: "jingle-davids",
    label: "David's Jingle",
    eyebrow: "Brand jingle",
    headline: "Need a gift that hits, no time to bake?",
    accent: "#FF7BAA",
    jinglePreviewId: "davids-no-time-to-bake",
    visual: "jingle" as const,
  },
  {
    id: "meme",
    label: "Meme",
    eyebrow: "Test the pain cheaply",
    headline: "Put the buyer's daily frustration in a format they know.",
    accent: "#FF9B5E",
    visual: "meme" as const,
  },
  {
    id: "text-message",
    label: "iMessage",
    eyebrow: "Make it feel recommended",
    headline: "Sell the product like one friend texting another.",
    accent: "#63E6BE",
    visual: "text-message" as const,
  },
  {
    id: "jingle-ogtool",
    label: "OGTool Jingle",
    eyebrow: "Brand jingle",
    headline: "Oh Gee Tool, we break the old rules.",
    accent: "#FF7BAA",
    jinglePreviewId: "ogtool-break-the-rules",
    visual: "jingle" as const,
  },
  {
    id: "visualizer",
    label: "Visualizer",
    eyebrow: "Make the explanation easy",
    headline: "Pair voice, captions, and motion when the offer needs clarity.",
    accent: "#8D7CFF",
    visual: "visualizer" as const,
  },
  {
    id: "brainrot",
    label: "Brainrot",
    eyebrow: "Hold attention with chaos",
    headline: "Turn the offer into a fast argument over familiar gameplay.",
    accent: "#F7F06D",
    visual: "brainrot" as const,
  },
] as const;

type FormatSlide = (typeof formatSlides)[number];

const brainrotPreviewBeats = [
  {
    speaker: "left" as const,
    text: "Wait. Your ads still look like everyone else's?",
  },
  {
    speaker: "right" as const,
    text: "Exactly. Wiggly turns your website into ads people actually watch.",
  },
] as const;

const brainrotSecondBeatStartsAtMs = 2_748;
const brainrotPreviewDurationMs = 6_910;
const jinglePreviewDurationMs = 20_000;

const visualizerPreviewScene: VisualizerAdScene = {
  version: 1,
  format: "visualizer",
  brand: {
    name: "Wiggly",
    url: "https://wiggly.agentenamel.com",
    host: "wiggly.agentenamel.com",
    title: "Wiggly",
    description: "Ads without the hard part.",
    faviconUrl: null,
    logoUrl: "/wiggly-wordmark-3d-crop.png",
    ogImageUrl: null,
    screenshotUrl: null,
    colors: ["#52D6FF", "#5B38D7"],
    fonts: { feel: "sans" },
    vibeTags: ["playful", "direct"],
    receipts: {
      specificClaims: [],
      buyerMoments: [],
      exactSiteLanguage: [],
      namedProof: [],
    },
  },
  creative: {
    angleId: "homepage-visualizer-preview",
    headline: "Your website has an ad hiding inside it.",
    subheadline: "Hear the two-person Visualizer format.",
    ctaText: "Hear it",
    headlineType: "callout",
    selectedPain: "Ads that look like every other ad.",
    selectedProof: "Wiggly turns a website into ready-to-test creative.",
  },
  style: {
    backgroundColor: "#FFFFFF",
    textColor: "#080817",
    accentColor: "#5B38D7",
    visualizerColor: "#52D6FF",
    fontFeel: "sans",
    visualizer: {
      type: "waveform-strip",
      barCount: 24,
      sensitivity: 1.5,
      heightScale: 0.9,
      baseline: 4,
      gain: 1.7,
      compression: 4,
      floor: 0.08,
      ceiling: 0.92,
      curve: "sqrt",
      bandFocus: "voice",
      mirror: false,
      splitSpeakers: true,
    },
  },
  audio: {
    status: "generated",
    storageId: "homepage-visualizer-dialogue",
    url: "/brainrot/homepage-dialogue.mp3",
    mimeType: "audio/mpeg",
    durationMs: brainrotPreviewDurationMs,
    durationSeconds: brainrotPreviewDurationMs / 1_000,
    transcript: "Wait. Your ads still look like everyone else's? Exactly. Wiggly turns your website into ads people actually watch.",
    captions: [
      { text: "Wait. Your ads still look", startMs: 0, endMs: 1_350, speaker: 1 },
      { text: "like everyone else's?", startMs: 1_350, endMs: brainrotSecondBeatStartsAtMs, speaker: 1 },
      { text: "Exactly. Wiggly turns your website", startMs: brainrotSecondBeatStartsAtMs, endMs: 4_750, speaker: 2 },
      { text: "into ads people actually watch.", startMs: 4_750, endMs: brainrotPreviewDurationMs, speaker: 2 },
    ],
    provider: "upload",
    model: "bundled-homepage-dialogue",
    generatedAt: 0,
  },
  layout: { preset: "centered-hero" },
  metadata: {
    candidateIndex: 0,
    generationBatchId: "homepage-visualizer-preview",
    researchRunId: "homepage-visualizer-preview",
    brandSnapshotId: "homepage-visualizer-preview",
    model: "bundled-homepage-preview",
    provider: "deterministic",
    generatedAt: 0,
  },
};

type HomepageJinglePreview = {
  id: string;
  audioUrl: string;
  scene: JingleAdScene;
};

function createHomepageJinglePreview(input: {
  id: string;
  brandName: string;
  brandUrl: string;
  description: string;
  colors: string[];
  accentColor: string;
  audioUrl: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  transcript: string;
  captions: Array<{ text: string; startMs: number; endMs: number }>;
  lyrics: string[];
  angle: string;
  musicStyle: string;
}): HomepageJinglePreview {
  const host = new URL(input.brandUrl).host;
  return {
    id: input.id,
    audioUrl: input.audioUrl,
    scene: {
      version: 1,
      format: "jingle",
      brand: {
        name: input.brandName,
        url: input.brandUrl,
        host,
        title: input.brandName,
        description: input.description,
        faviconUrl: null,
        logoUrl: null,
        ogImageUrl: null,
        screenshotUrl: null,
        colors: input.colors,
        fonts: { feel: "sans" },
        vibeTags: ["memorable", "musical"],
        receipts: { specificClaims: [], buyerMoments: [], exactSiteLanguage: [], namedProof: [] },
      },
      creative: {
        angleId: `homepage-brand-jingle-${input.id}`,
        headline: input.headline,
        subheadline: input.subheadline,
        ctaText: input.ctaText,
        headlineType: "callout",
        selectedPain: input.angle,
        selectedProof: input.subheadline,
      },
      style: {
        backgroundColor: "#07111F",
        textColor: "#FFFFFF",
        accentColor: input.accentColor,
        fontFeel: "sans",
      },
      audio: {
        status: "generated",
        storageId: `homepage-${input.id}-jingle`,
        url: input.audioUrl,
        mimeType: "audio/mpeg",
        durationMs: jinglePreviewDurationMs,
        durationSeconds: jinglePreviewDurationMs / 1_000,
        transcript: input.transcript,
        captions: input.captions,
        provider: "elevenlabs",
        model: "music_v2",
        generatedAt: 0,
      },
      layout: {
        preset: "jingle-lyrics",
        brandPhonetic: input.brandName === "OGTool" ? "Oh Gee Tool" : input.brandName,
        angle: input.angle,
        lyrics: input.lyrics,
        musicLengthMs: jinglePreviewDurationMs,
        compositionPlan: {
          chunks: input.captions.map((caption) => ({
            text: caption.text,
            duration_ms: caption.endMs - caption.startMs,
            positive_styles: [input.musicStyle],
            negative_styles: ["generic"],
            context_adherence: "high",
          })) as JingleAdScene["layout"]["compositionPlan"]["chunks"],
        },
        selfCheckPassed: "Real bundled Wiggly brand-jingle output.",
      },
      metadata: {
        candidateIndex: 0,
        generationBatchId: `homepage-brand-jingle-${input.id}`,
        researchRunId: `homepage-brand-jingle-${input.id}`,
        brandSnapshotId: `homepage-brand-jingle-${input.id}`,
        model: "bundled-homepage-preview",
        provider: "deterministic",
        generatedAt: 0,
      },
    },
  };
}

const homepageJinglePreviews = [
  createHomepageJinglePreview({
    id: "apple-all-in-one-place",
    brandName: "Apple",
    brandUrl: "https://apple.com",
    description: "Devices designed to work together.",
    colors: ["#0071E3", "#2997FF", "#FFFFFF"],
    accentColor: "#2997FF",
    audioUrl: "/homepage/jingles/apple-all-in-one-place.mp3",
    headline: "Apple magic, all in one place",
    subheadline: "Every device in sync, keeping your pace.",
    ctaText: "Discover Apple",
    transcript: "Apple magic, all in one place\nEvery device in sync, keeping your pace\nYour old phone drags, your laptop won't play\nM5 wakes up, chases lags away\nApple magic, all in one place\nApple",
    captions: [
      { text: "Apple magic, all in one place", startMs: 0, endMs: 6_000 },
      { text: "M5 wakes up, chases lags away", startMs: 6_000, endMs: 14_000 },
      { text: "Apple magic, all in one place", startMs: 14_000, endMs: 20_000 },
    ],
    lyrics: ["Apple magic, all in one place", "Every device in sync, keeping your pace", "Your old phone drags, your laptop won't play", "M5 wakes up, chases lags away", "Apple magic, all in one place", "Apple"],
    angle: "One connected ecosystem across devices.",
    musicStyle: "funk pop",
  }),
  createHomepageJinglePreview({
    id: "davids-no-time-to-bake",
    brandName: "David's Cookies",
    brandUrl: "https://davidscookies.com",
    description: "Fresh-baked gifts delivered door to door.",
    colors: ["#D6001C", "#FFFFFF", "#097DB3"],
    accentColor: "#D6001C",
    audioUrl: "/homepage/jingles/davids-no-time-to-bake.mp3",
    headline: "Need a gift that hits, no time to bake?",
    subheadline: "Fresh-baked cookies delivered for gifting.",
    ctaText: "Shop fresh baked",
    transcript: "Need a gift that hits, no time to bake?\nDavid's Cookies, fresh, no mistake\nNo more stale sweets from the grocery aisle\nSend a tin that travels mile to mile\nFresh baked, packed tight, make em smile\nNeed a gift that hits, no time to bake?\nDavid's Cookies",
    captions: [
      { text: "Need a gift that hits, no time to bake?", startMs: 0, endMs: 6_000 },
      { text: "Fresh baked, packed tight, make em smile", startMs: 6_000, endMs: 14_000 },
      { text: "David's Cookies", startMs: 14_000, endMs: 20_000 },
    ],
    lyrics: ["Need a gift that hits, no time to bake?", "David's Cookies, fresh, no mistake", "No more stale sweets from the grocery aisle", "Send a tin that travels mile to mile", "Fresh baked, packed tight, make em smile", "Need a gift that hits, no time to bake?", "David's Cookies"],
    angle: "A memorable answer to last-minute gifting.",
    musicStyle: "modern hip hop",
  }),
  createHomepageJinglePreview({
    id: "ogtool-break-the-rules",
    brandName: "OGTool",
    brandUrl: "https://ogtool.com",
    description: "Reddit campaigns and AI visibility for D2C brands.",
    colors: ["#2563EB", "#FFFFFF", "#111827"],
    accentColor: "#52D6FF",
    audioUrl: "/homepage/jingles/ogtool-break-the-rules.mp3",
    headline: "Oh Gee Tool, we break the old rules",
    subheadline: "Turn paid attention into traffic that compounds.",
    ctaText: "Book a call",
    transcript: "Oh Gee Tool, we break the old rules\nTurn your spend into something that compounds and fuels\nAds gettin' pricey, no stackin' effect\nWe seed Reddit threads for the traffic you get\nRank on Google fast, AI knows your name\nInbound from the model, not the same old game\nOh Gee Tool, we break the old rules\nTurn your spend into something that compounds and fuels\nOh Gee Tool",
    captions: [
      { text: "Oh Gee Tool, we break the old rules", startMs: 0, endMs: 6_000 },
      { text: "Inbound from the model, not the same old game", startMs: 6_000, endMs: 14_000 },
      { text: "Oh Gee Tool, we break the old rules", startMs: 14_000, endMs: 20_000 },
    ],
    lyrics: ["Oh Gee Tool, we break the old rules", "Turn your spend into something that compounds and fuels", "Ads gettin' pricey, no stackin' effect", "We seed Reddit threads for the traffic you get", "Rank on Google fast, AI knows your name", "Inbound from the model, not the same old game", "Oh Gee Tool, we break the old rules", "Turn your spend into something that compounds and fuels", "Oh Gee Tool"],
    angle: "Replace rising ad costs with visibility that compounds.",
    musicStyle: "modern hip hop",
  }),
] as const;

function VisualizerArtwork() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [timeSeconds, setTimeSeconds] = useState(0);

  const toggleSound = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (soundOn) {
      audio.pause();
      setSoundOn(false);
      return;
    }

    try {
      await audio.play();
      setSoundOn(true);
    } catch {
      setSoundOn(false);
    }
  };

  return (
    <div className="relative h-full overflow-hidden bg-white">
      <audio
        ref={audioRef}
        src="/brainrot/homepage-dialogue.mp3"
        preload="metadata"
        loop
        onTimeUpdate={(event) => setTimeSeconds(event.currentTarget.currentTime)}
        onPause={() => setSoundOn(false)}
        onPlay={() => setSoundOn(true)}
      />
      <AdRenderSurface
        scene={visualizerPreviewScene}
        timeSeconds={timeSeconds}
        motionMode={soundOn ? "auto" : "idle"}
      />
      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={soundOn}
        aria-label={soundOn ? "Mute Visualizer conversation" : "Play Visualizer conversation"}
        className="absolute right-3 top-3 z-20 grid size-10 place-items-center rounded-full border-2 border-[#080817] bg-white text-[#080817] shadow-[3px_3px_0_#080817] transition hover:-translate-y-0.5"
        title={soundOn ? "Mute conversation" : "Hear the conversation"}
      >
        {soundOn ? <VolumeX className="size-5" strokeWidth={3} /> : <Volume2 className="size-5" strokeWidth={3} />}
      </button>
    </div>
  );
}

function JingleArtwork({ preview }: { preview: HomepageJinglePreview }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [timeSeconds, setTimeSeconds] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    audio.currentTime = 0;
    audio.muted = false;
    setTimeSeconds(0);
    void audio.play()
      .then(() => setSoundOn(true))
      .catch(() => setSoundOn(false));
    return () => audio.pause();
  }, [preview.audioUrl]);

  const toggleSound = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (soundOn) {
      audio.muted = true;
      setSoundOn(false);
      return;
    }

    audio.muted = false;
    try {
      await audio.play();
      setSoundOn(true);
    } catch {
      audio.muted = true;
      setSoundOn(false);
    }
  };

  return (
    <div className="relative h-full overflow-hidden bg-[#07111F]">
      <audio
        ref={audioRef}
        src={preview.audioUrl}
        autoPlay
        loop
        preload="metadata"
        onTimeUpdate={(event) => setTimeSeconds(event.currentTarget.currentTime)}
      />
      <AdRenderSurface scene={preview.scene} timeSeconds={timeSeconds} />
      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={soundOn}
        aria-label={soundOn ? "Mute brand jingle" : "Play brand jingle"}
        className="absolute right-3 top-3 z-20 grid size-10 place-items-center rounded-full border-2 border-[#080817] bg-white text-[#080817] shadow-[3px_3px_0_#080817] transition hover:-translate-y-0.5"
        title={soundOn ? "Mute brand jingle" : "Hear the brand jingle"}
      >
        {soundOn ? <VolumeX className="size-5" strokeWidth={3} /> : <Volume2 className="size-5" strokeWidth={3} />}
      </button>
    </div>
  );
}

function BrainrotArtwork() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeBeatIndex, setActiveBeatIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const activeBeat = brainrotPreviewBeats[activeBeatIndex];

  useEffect(() => {
    if (soundOn) return undefined;
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const elapsedMs = (performance.now() - startedAt) % brainrotPreviewDurationMs;
      setActiveBeatIndex(elapsedMs < brainrotSecondBeatStartsAtMs ? 0 : 1);
    }, 100);
    return () => window.clearInterval(timer);
  }, [soundOn]);

  const toggleSound = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (soundOn) {
      audio.pause();
      setSoundOn(false);
      return;
    }

    audio.currentTime = 0;
    setActiveBeatIndex(0);
    try {
      await audio.play();
      setSoundOn(true);
    } catch {
      setSoundOn(false);
    }
  };

  return (
    <div className="relative h-full overflow-hidden bg-[#79D37A]">
      <video
        src="/brainrot/block-parkour.mp4"
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Brainrot format gameplay preview"
      />
      <audio
        ref={audioRef}
        src="/brainrot/homepage-dialogue.mp3"
        preload="metadata"
        loop
        onTimeUpdate={(event) => {
          setActiveBeatIndex(event.currentTarget.currentTime * 1_000 < brainrotSecondBeatStartsAtMs ? 0 : 1);
        }}
      />

      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={soundOn}
        aria-label={soundOn ? "Mute Brainrot dialogue" : "Play Brainrot dialogue"}
        className="absolute right-3 top-3 z-20 flex h-9 items-center gap-2 rounded-md border-2 border-[#080817] bg-white px-3 text-[10px] font-black uppercase tracking-[0.08em] text-[#080817] shadow-[3px_3px_0_#080817] transition hover:-translate-y-0.5"
      >
        {soundOn ? <VolumeX className="size-4" strokeWidth={3} /> : <Volume2 className="size-4" strokeWidth={3} />}
        {soundOn ? "Mute" : "Hear it"}
      </button>

      <p
        aria-live="off"
        className="absolute inset-x-4 top-[15%] z-10 text-center text-xl font-black uppercase leading-[0.96] text-white"
        style={{
          textShadow: "-2px -2px 0 #080817, 2px -2px 0 #080817, -2px 2px 0 #080817, 2px 2px 0 #080817, 0 4px 0 #080817",
        }}
      >
        {activeBeat.text}
      </p>

      <img
        src="/brainrot/peter.png"
        alt=""
        className="absolute bottom-44 left-3 h-auto w-[37%] drop-shadow-lg transition duration-300 ease-out"
        style={{
          opacity: activeBeat.speaker === "left" ? 1 : 0.42,
          transform: activeBeat.speaker === "left" ? "translateY(-6px) scale(1.05)" : "translateY(0) scale(1)",
        }}
      />
      <img
        src="/brainrot/stewie.png"
        alt=""
        className="absolute bottom-44 right-3 h-auto w-[38%] drop-shadow-lg transition duration-300 ease-out"
        style={{
          opacity: activeBeat.speaker === "right" ? 1 : 0.42,
          transform: activeBeat.speaker === "right" ? "translateY(-6px) scale(1.05)" : "translateY(0) scale(1)",
        }}
      />
    </div>
  );
}

function FormatArtwork({ slide }: { slide: FormatSlide }) {
  if (slide.visual === "three-d") {
    return (
      <video
        src="/homepage/three-d-breakdown-showcase.mp4"
        poster="/homepage/three-d-breakdown-showcase-poster.jpg"
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Compilation of Wiggly 3D Breakdown ads"
      />
    );
  }

  if (slide.visual === "jingle") {
    const preview = homepageJinglePreviews.find((item) => item.id === slide.jinglePreviewId)
      || homepageJinglePreviews[0];
    return <JingleArtwork preview={preview} />;
  }

  if (slide.visual === "motion") {
    return (
      <img
        src="/three-d-breakdown/references/procedural-3d-style-frame-v1.png"
        alt="Premium 3D product scene"
        className="h-full w-full object-cover"
      />
    );
  }

  if (slide.visual === "video-meme") {
    return (
      <video
        src="/video-memes/bear-sniff.mp4"
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Video Meme format preview"
      />
    );
  }

  if (slide.visual === "meme") {
    return (
      <div className="h-full bg-[#f2e6d4] p-5">
        <div className="relative mt-10 aspect-square w-full overflow-hidden border-4 border-[#080817] bg-white">
          <img src="/memes/this_is_fine_full.png" alt="This is fine meme" className="absolute inset-0 h-full w-full object-cover" />
          <p className="absolute inset-x-3 top-[8%] text-center text-xl font-black uppercase leading-none text-[#080817] xl:text-2xl">
            When every ad
          </p>
          <p className="absolute inset-x-3 bottom-[8%] text-center text-xl font-black uppercase leading-none text-[#080817] xl:text-2xl">
            Looks the same
          </p>
        </div>
      </div>
    );
  }

  if (slide.visual === "reviews") {
    return (
      <div className="flex h-full flex-col bg-[#ffe675] px-8 pb-52 pt-10 text-[#080817]">
        <Quote className="size-12 fill-current" strokeWidth={2.5} />
        <p className="mt-6 text-3xl font-black leading-[1.04]">
          &ldquo;I bought one for myself, then ordered three more.&rdquo;
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em]">
          <Sparkles className="size-5 shrink-0" /> Your brand&apos;s website testimonials
        </div>
      </div>
    );
  }

  if (slide.visual === "text-message") {
    return (
      <div className="flex h-full flex-col justify-center gap-4 bg-[#f4f4f0] px-6 text-lg font-bold text-[#080817]">
        <div className="max-w-[86%] self-end rounded-[24px] rounded-br-md bg-[#168CFF] px-5 py-3 text-white">
          wait, is this the product you were talking about?
        </div>
        <div className="max-w-[84%] rounded-[24px] rounded-bl-md bg-white px-5 py-3 shadow-sm">
          yep. it fixed the annoying part nobody warns you about.
        </div>
        <div className="max-w-[74%] self-end rounded-[24px] rounded-br-md bg-[#168CFF] px-5 py-3 text-white">
          sending it to the group chat.
        </div>
      </div>
    );
  }

  if (slide.visual === "visualizer") {
    return <VisualizerArtwork />;
  }

  return <BrainrotArtwork />;
}

export function WaitlistFormatCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = formatSlides[activeIndex];
  const compactFooterCopy = slide.visual === "three-d"
    ? "Real Wiggly-generated 3D ad highlights."
    : slide.visual === "jingle"
      ? "A real Wiggly-generated brand jingle."
      : slide.visual === "visualizer"
        ? "Tap the sound button to hear both voices."
        : null;

  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % formatSlides.length);
    }, slide.visual === "brainrot" ? 7_500 : slide.visual === "jingle" ? 20_500 : 4_500);
    return () => window.clearInterval(timer);
  }, [activeIndex, paused, slide.visual]);

  const move = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + formatSlides.length) % formatSlides.length);
  };

  return (
    <section
      className="w-full max-w-[430px]"
      aria-label="Wiggly ad format previews"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xl font-black text-[#080817]">Pick the format that fits the angle.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => move(-1)}
            className="grid size-10 place-items-center rounded-lg border-2 border-[#080817] bg-white text-[#080817] transition hover:-translate-y-0.5 hover:bg-[#C9FF55]"
            aria-label="Previous format"
            title="Previous format"
          >
            <ChevronLeft className="size-5" strokeWidth={3} />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="grid size-10 place-items-center rounded-lg border-2 border-[#080817] bg-[#080817] text-white transition hover:-translate-y-0.5 hover:bg-[#5b38d7]"
            aria-label="Next format"
            title="Next format"
          >
            <ChevronRight className="size-5" strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="relative mx-auto aspect-[9/16] w-[315px] overflow-hidden rounded-lg border-2 border-[#080817] bg-[#080817] shadow-[12px_14px_0_#080817] sm:w-[350px] lg:w-[275px] xl:w-[310px] 2xl:w-[360px]">
        <div key={slide.id} className="wiggly-format-slide absolute inset-0">
          <FormatArtwork slide={slide} />
          {compactFooterCopy ? (
            <div className="absolute inset-x-0 bottom-0 border-t border-white/15 bg-[#080817]/96 px-4 py-3 text-white backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: slide.accent }}>
                  {slide.label}
                </p>
                <span className="size-2 rounded-full" style={{ backgroundColor: slide.accent }} />
              </div>
              <p className="mt-1 text-xs font-bold text-white/70">{compactFooterCopy}</p>
            </div>
          ) : (
            <div className="absolute inset-x-0 bottom-0 border-t border-white/15 bg-[#080817]/96 p-5 text-white backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: slide.accent }}>
                  {slide.label}
                </p>
                {"status" in slide ? (
                  <span className="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">
                    {slide.status}
                  </span>
                ) : (
                  <span className="size-2 rounded-full" style={{ backgroundColor: slide.accent }} />
                )}
              </div>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.17em] text-white/55">{slide.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-black leading-[1.05] tracking-normal">{slide.headline}</h2>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex gap-1.5" aria-label="Choose a format preview">
          {formatSlides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.label}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 transition-all ${index === activeIndex ? "w-8 bg-[#080817]" : "w-2.5 bg-[#c7cad3] hover:bg-[#8f95a6]"}`}
            />
          ))}
        </div>
        <p className="shrink-0 font-mono text-xs font-bold text-[#626b82]">
          {String(activeIndex + 1).padStart(2, "0")} / {String(formatSlides.length).padStart(2, "0")}
        </p>
      </div>
    </section>
  );
}
