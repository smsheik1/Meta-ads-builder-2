const researchTimeoutMessage = "That site took too long to read. Try again, or paste a more specific public page from the same brand.";

export function getMusicGenerationErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error || "");
  const message = rawMessage
    .replace(/^Uncaught Error:\s*/i, "")
    .replace(/\s+at\s+[\s\S]*$/m, "")
    .trim();

  if (/paid_plan_required|payment_required|402/i.test(message)) {
    return "Music generation failed: ElevenLabs Music requires a paid plan for this API key.";
  }
  if (/fish.*(?:401|invalid token)|invalid token.*fish/i.test(message)) {
    return "Music generation failed: the Fish voice API key is invalid. Update it, then try again.";
  }
  if (!message) return "Music generation failed.";
  if (/^music generation failed/i.test(message)) return message;
  return `Music generation failed: ${message}`;
}

export function getResearchActionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/\b(aborterror|aborted|timed out|timeout)\b/i.test(message)) return researchTimeoutMessage;
  return message || "Website research failed.";
}

export function getAdGenerationErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error || "");
  const message = rawMessage.match(/Uncaught Error:\s*([\s\S]*?)(?:\s+at\s|\n\s+at\s| Called by client|$)/)?.[1]?.trim()
    || rawMessage.replace(/^\[CONVEX[^\]]+]\s*\[Request ID:[^\]]+]\s*Server Error\s*/i, "").trim();
  if (/\b(aborterror|aborted|timed out|timeout)\b/i.test(message)) {
    if (/NVIDIA NIM|Gemini|Replicate|Seedance|Nano Banana|director/i.test(message)) {
      return `${message.replace(/[.\s]*$/, "")}. Try again.`;
    }
    if (/we'?re sorry/i.test(message)) {
      return "We're Sorry copy generation timed out. Try again.";
    }
    return "Ad generation timed out. Try again.";
  }
  if (/NVIDIA NIM.*(?:\b500\b|internal server error|upstream)/i.test(message)) {
    return "The writing model had a temporary problem. Press Generate ads to try again.";
  }
  return message || "Ad generation failed.";
}
