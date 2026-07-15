"use client";

import { ChevronLeft, ChevronRight, Quote, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

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
        <img
          src="/memes/this_is_fine_full.png"
          alt="Meme format preview"
          className="mt-10 aspect-square w-full border-4 border-[#080817] object-cover"
        />
      </div>
    );
  }

  if (slide.visual === "reviews") {
    return (
      <div className="flex h-full flex-col justify-center bg-[#ffe675] px-8 text-[#080817]">
        <Quote className="size-12 fill-current" strokeWidth={2.5} />
        <p className="mt-7 text-4xl font-black leading-[1.02]">
          &ldquo;Finally, an ad tool that starts with what customers actually said.&rdquo;
        </p>
        <div className="mt-8 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em]">
          <Sparkles className="size-5" /> Real website proof
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
      <img src="/brainrot/peter.png" alt="" className="absolute bottom-44 left-3 h-auto w-[37%] drop-shadow-lg" />
      <img src="/brainrot/stewie.png" alt="" className="absolute bottom-44 right-3 h-auto w-[38%] drop-shadow-lg" />
    </div>
  );
}

export function WaitlistFormatCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = formatSlides[activeIndex];

  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % formatSlides.length);
    }, 4_500);
    return () => window.clearInterval(timer);
  }, [activeIndex, paused]);

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
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#626b82]">One URL, many ways in</p>
          <p className="mt-1 text-xl font-black text-[#080817]">Pick the format that fits the angle.</p>
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
              <span className="size-2 rounded-full" style={{ backgroundColor: slide.accent }} />
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
