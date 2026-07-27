import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { useRenderAssetComponents } from "../../render/RenderAssetContext";
import type { MemeAdScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";
import { getMemeTemplate, type MemeSlot } from "./templates";

const minFitFontSize = 14;
const maxFitFontSize = 96;
const textStrokeGuardPx = 8;
const textShadow = [
  "2px 2px 0 #000",
  "-2px 2px 0 #000",
  "2px -2px 0 #000",
  "-2px -2px 0 #000",
  "0 2px 0 #000",
  "2px 0 0 #000",
  "0 -2px 0 #000",
  "-2px 0 0 #000",
].join(", ");

function getSlotText(scene: MemeAdScene, slot: MemeSlot) {
  const value = scene.layout.slots[slot.id] || "";
  return slot.textCase === "uppercase" ? value.toUpperCase() : value;
}

export function layoutMemeSlotText(slot: MemeSlot, text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { fontSize: slot.fontSize, text: "" };

  const posterText = slot.textStyle === "poster";
  const horizontalScale = posterText ? 0.86 : 0.88;
  const verticalScale = posterText ? 0.84 : 0.88;
  const glyphWidth = posterText ? 0.58 : 0.62;
  const lineHeight = posterText ? 0.95 : 0.94;
  const characterCapacity = Math.max(
    1,
    Math.floor((slot.width * horizontalScale) / (slot.fontSize * glyphWidth)),
  );
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (
      currentLine &&
      candidate.length > characterCapacity &&
      lines.length < slot.maxLines - 1
    ) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }
  if (currentLine) lines.push(currentLine);

  const longestLine = Math.max(...lines.map((line) => line.length), 1);
  const widthFit = (slot.width * horizontalScale) / (longestLine * glyphWidth);
  const heightFit = (slot.height * verticalScale) / (lines.length * lineHeight);

  return {
    fontSize: Math.max(
      minFitFontSize,
      Math.floor(Math.min(slot.fontSize, widthFit, heightFit)),
    ),
    text: lines.join("\n"),
  };
}

function getSlotStyle(slot: MemeSlot, templateWidth: number, templateHeight: number): CSSProperties {
  return {
    position: "absolute",
    left: `${(slot.x / templateWidth) * 100}%`,
    top: `${(slot.y / templateHeight) * 100}%`,
    width: `${(slot.width / templateWidth) * 100}%`,
    height: `${(slot.height / templateHeight) * 100}%`,
    overflow: "hidden",
  };
}

function getSlotFitBoxStyle(slot: MemeSlot): CSSProperties {
  const posterText = slot.textStyle === "poster";
  const horizontalInset = posterText ? "7%" : "6%";
  const verticalInset = posterText ? "8%" : "6%";

  return {
    position: "absolute",
    inset: `${verticalInset} ${horizontalInset}`,
    boxSizing: "border-box",
    display: "flex",
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: slot.align === "left" ? "flex-start" : "center",
    textAlign: slot.align || "center",
    color: posterText ? "#050505" : "#fff",
    fontFamily: posterText
      ? "Arial Black, Impact, var(--font-geist-sans), sans-serif"
      : "Impact, Haettenschweiler, 'Arial Black', sans-serif",
    fontSize: `${Math.min(slot.fontSize, maxFitFontSize)}px`,
    fontWeight: 900,
    lineHeight: posterText ? 0.95 : 0.94,
    letterSpacing: "0",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    textShadow: posterText ? "none" : textShadow,
    textTransform: slot.textCase === "uppercase" ? "uppercase" : "none",
  };
}

function getSlotTextInnerStyle(slot: MemeSlot, fontSize: number): CSSProperties {
  return {
    display: "block",
    boxSizing: "border-box",
    fontSize: `${fontSize}px`,
    maxHeight: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "pre-line",
    overflowWrap: "break-word",
    wordBreak: "normal",
    textAlign: slot.align || "center",
  };
}

function fitTextToSlotBounds(element: HTMLElement, maxFontSize: number) {
  const parent = element.parentElement;
  if (!parent) return;

  const maxWidth = Math.max(1, parent.clientWidth - textStrokeGuardPx);
  const maxHeight = Math.max(1, parent.clientHeight - textStrokeGuardPx);
  element.style.width = `${maxWidth}px`;
  element.style.maxWidth = `${maxWidth}px`;

  const fitsAt = (fontSize: number) => {
    element.style.fontSize = `${fontSize}px`;
    return element.scrollWidth <= maxWidth && element.scrollHeight <= maxHeight;
  };

  let low = minFitFontSize;
  let high = Math.max(minFitFontSize, maxFontSize);
  let best = minFitFontSize;

  for (let i = 0; i < 8; i += 1) {
    const mid = (low + high) / 2;
    if (fitsAt(mid)) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  element.style.fontSize = `${Math.floor(best)}px`;
}

function MemeSlotText({
  slot,
  text,
}: {
  slot: MemeSlot;
  text: string;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const layout = layoutMemeSlotText(slot, text);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return undefined;
    const parent = element.parentElement;
    const maxFontSize = Math.min(layout.fontSize, maxFitFontSize);
    let animationFrame = 0;

    const fit = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => fitTextToSlotBounds(element, maxFontSize));
    };

    fitTextToSlotBounds(element, maxFontSize);
    const resizeObserver = parent && "ResizeObserver" in window
      ? new ResizeObserver(fit)
      : null;
    if (parent) resizeObserver?.observe(parent);
    window.addEventListener("resize", fit);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [layout.fontSize, layout.text]);

  return (
    <span ref={textRef} style={getSlotTextInnerStyle(slot, layout.fontSize)}>
      {layout.text}
    </span>
  );
}

export function MemeFormatRenderer({
  scene,
}: FormatRenderProps<MemeAdScene>) {
  const template = getMemeTemplate(scene.layout.templateId);
  if (!template) return null;
  const { Image } = useRenderAssetComponents();
  const templateAspect = template.width / template.height;
  const fitByHeight = templateAspect < 0.8;

  return (
    <div
      className="flex h-full w-full items-center justify-center bg-white"
      data-format="meme"
      data-meme-template={template.id}
      style={{
        containerType: "inline-size",
      }}
    >
      <div
        data-meme-artboard={template.id}
        className="relative overflow-hidden bg-white shadow-2xl shadow-slate-950/10"
        style={{
          aspectRatio: `${template.width} / ${template.height}`,
          height: fitByHeight ? "100%" : "auto",
          maxHeight: "100%",
          maxWidth: "100%",
          width: fitByHeight ? "auto" : "100%",
        }}
      >
        <Image
          alt=""
          src={template.image}
          className="absolute inset-0 size-full select-none object-cover"
        />
        {template.slots.map((slot) => {
          const text = getSlotText(scene, slot);

          return (
            <div
              key={slot.id}
              data-meme-slot={slot.id}
              style={getSlotStyle(slot, template.width, template.height)}
            >
              <div data-meme-fit-box={slot.id} style={getSlotFitBoxStyle(slot)}>
                <MemeSlotText slot={slot} text={text} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
