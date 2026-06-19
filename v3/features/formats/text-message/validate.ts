import type { TextMessageAdScene } from "../../scene/types";
import type { FormatValidationResult } from "../types";
import {
  TEXT_MESSAGE_MAX_CHARS_PER_MESSAGE,
  TEXT_MESSAGE_MAX_MESSAGES,
  TEXT_MESSAGE_MAX_TOTAL_CHARS,
  TEXT_MESSAGE_MIN_MESSAGES,
} from "./prompt";

export function validateTextMessageScene(scene: TextMessageAdScene): FormatValidationResult {
  const errors: string[] = [];
  const messages = scene.layout.messages || [];
  if (scene.format !== "text-message") errors.push("Text message scene format is invalid.");
  if (scene.layout.preset !== "text-message-screenshot") errors.push("Text message layout preset is invalid.");
  if (!scene.brand?.name?.trim()) errors.push("Text message brand is missing.");
  if (!scene.layout.contactName?.trim()) errors.push("Text message contact name is missing.");
  if (!scene.layout.timestampLabel?.trim()) errors.push("Text message timestamp is missing.");
  if (messages.length < TEXT_MESSAGE_MIN_MESSAGES || messages.length > TEXT_MESSAGE_MAX_MESSAGES) {
    errors.push("Text message count must fit the screenshot.");
  }
  if (!messages.some((message) => message.side === "left") || !messages.some((message) => message.side === "right")) {
    errors.push("Text message conversation must include both sides.");
  }
  if (messages.some((message) => message.side !== "left" && message.side !== "right")) errors.push("Text message side is invalid.");
  if (messages.some((message) => !message.text.trim())) errors.push("Text message text is missing.");
  if (messages.some((message) => message.text.length > TEXT_MESSAGE_MAX_CHARS_PER_MESSAGE)) errors.push("Text message is too long.");
  if (messages.reduce((sum, message) => sum + message.text.length, 0) > TEXT_MESSAGE_MAX_TOTAL_CHARS) {
    errors.push("Text message screenshot text budget is too large.");
  }
  if (!/^#[0-9A-F]{6}$/i.test(scene.style.backgroundColor)) errors.push("Text message background color must be a hex color.");
  if (!/^#[0-9A-F]{6}$/i.test(scene.style.accentColor)) errors.push("Text message accent color must be a hex color.");

  return {
    valid: errors.length === 0,
    errors,
  };
}
