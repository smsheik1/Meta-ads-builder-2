"use client";

import { ChevronLeft, ChevronRight, Quote, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
      <img
        src="/three-d-breakdown/references/ecommerce-teardown-style-reference-clean-v7.jpg"
        alt="Six-frame 3D Breakdown storyboard"
        className="h-full w-full object-cover"
      />
    );
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
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white px-8 text-[#080817]">
        <img src="/wiggly-wordmark-3d-crop.png" alt="Wiggly" className="w-52" />
        <div className="mt-12 flex h-32 items-center justify-center gap-2">
          {Array.from({ length: 17 }).map((_, index) => (
            <span
              key={index}
              className="wiggly-format-wave block w-2 rounded-full bg-[#52D6FF]"
              style={{
                height: `${24 + ((index * 23) % 88)}px`,
                animationDelay: `${index * 65}ms`,
              }}
            />
          ))}
        </div>
        <p className="mt-9 text-center text-2xl font-black leading-tight">Voice, captions, and motion in one clean story.</p>
      </div>
    );
  }

  return <BrainrotArtwork />;
}

export function WaitlistFormatCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = formatSlides[activeIndex];

  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % formatSlides.length);
    }, slide.visual === "brainrot" ? 7_500 : 4_500);
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
