import fitty from "fitty";
import { useEffect, useRef, type CSSProperties } from "react";
import type { MemeAdScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";
import { getMemeTemplate, type MemeSlot } from "./templates";

const minFitFontSize = 14;
const maxFitFontSize = 96;
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

  return {
    position: "absolute",
    inset: 0,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: slot.align === "left" ? "flex-start" : "center",
    padding: posterText ? "0.2em" : "0.25em",
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

function getSlotTextInnerStyle(slot: MemeSlot): CSSProperties {
  return {
    display: "inline-block",
    maxWidth: "100%",
    whiteSpace: "normal",
    overflowWrap: "normal",
    wordBreak: "normal",
    textAlign: slot.align || "center",
  };
}

function shrinkToSlotBounds(element: HTMLElement) {
  const parent = element.parentElement;
  if (!parent) return;

  let fontSize = Number.parseFloat(window.getComputedStyle(element).fontSize);
  while (
    fontSize > minFitFontSize
    && (element.scrollWidth > parent.clientWidth || element.scrollHeight > parent.clientHeight)
  ) {
    fontSize -= 1;
    element.style.fontSize = `${fontSize}px`;
  }
}

function MemeSlotText({
  slot,
  text,
}: {
  slot: MemeSlot;
  text: string;
}) {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return undefined;

    const fit = fitty(element, {
      minSize: minFitFontSize,
      maxSize: Math.min(slot.fontSize, maxFitFontSize),
      multiLine: true,
    });
    fit.fit({ sync: true });
    shrinkToSlotBounds(element);

    return () => fit.unsubscribe();
  }, [slot.fontSize, text]);

  return (
    <span ref={textRef} style={getSlotTextInnerStyle(slot)}>
      {text}
    </span>
  );
}

export function MemeFormatRenderer({
  scene,
}: FormatRenderProps<MemeAdScene>) {
  const template = getMemeTemplate(scene.layout.templateId);
  if (!template) return null;
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
        <img
          alt=""
          draggable={false}
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
              <div style={getSlotFitBoxStyle(slot)}>
                <MemeSlotText slot={slot} text={text} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
