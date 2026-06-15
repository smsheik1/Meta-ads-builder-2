import type { CSSProperties } from "react";
import type { MemeAdScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";
import { getMemeTemplate, type MemeSlot } from "./templates";

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
  const fontSize = Math.max(12, Math.min(slot.fontSize, Math.floor(slot.height / Math.max(1, slot.maxLines) * 0.78)));

  return {
    position: "absolute",
    left: `${(slot.x / templateWidth) * 100}%`,
    top: `${(slot.y / templateHeight) * 100}%`,
    width: `${(slot.width / templateWidth) * 100}%`,
    height: `${(slot.height / templateHeight) * 100}%`,
    display: "flex",
    alignItems: "center",
    justifyContent: slot.align === "left" ? "flex-start" : "center",
    overflow: "hidden",
    padding: "0.4em",
    textAlign: slot.align || "center",
    color: "#fff",
    fontFamily: "Impact, Haettenschweiler, 'Arial Black', sans-serif",
    fontSize: `clamp(12px, ${(fontSize / templateWidth) * 100}cqw, ${fontSize}px)`,
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: "0.01em",
    overflowWrap: "break-word",
    textShadow,
    textTransform: slot.textCase === "uppercase" ? "uppercase" : "none",
  };
}

export function MemeFormatRenderer({
  scene,
}: FormatRenderProps<MemeAdScene>) {
  const template = getMemeTemplate(scene.layout.templateId);
  if (!template) return null;

  return (
    <div
      className="mx-auto"
      data-format="meme"
      data-meme-template={template.id}
      style={{
        width: "min(100%, 640px)",
        containerType: "inline-size",
      }}
    >
      <div
        className="relative overflow-hidden rounded-[1rem] bg-white shadow-2xl shadow-slate-950/20"
        style={{
          aspectRatio: `${template.width} / ${template.height}`,
        }}
      >
        <img
          alt=""
          draggable={false}
          src={template.image}
          className="absolute inset-0 size-full select-none object-cover"
        />
        {template.slots.map((slot) => (
          <div
            key={slot.id}
            data-meme-slot={slot.id}
            style={getSlotStyle(slot, template.width, template.height)}
          >
            {getSlotText(scene, slot)}
          </div>
        ))}
      </div>
    </div>
  );
}
