import type { ThreeDBreakdownStorySubjectKind } from "./storySubject";

const buyerActionPattern = /\b(shop|try|get|buy|order|start|choose|book|download|subscribe|visit|support|join)\b/i;
const storyActionPattern = /\b(watch|discover|learn|explore|see)\b/i;
const unusableCtaPattern = /\b(?:see the mechanism|the journey is the product|visible mechanism|hidden mechanism|watch the journey|see the proof)\b|\bstart\b.{0,64}\bfrom\b/i;

const clean = (value: unknown) => String(value || "").replace(/\s+/g, " ").trim().slice(0, 90);
const wordCount = (value: string) => value.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)?/g)?.length || 0;
const shortName = (value: string, maxWords = 5) => clean(value).split(/\s+/).slice(0, maxWords).join(" ");

export const getThreeDBreakdownCtaError = (
  value: unknown,
  subjectKind: ThreeDBreakdownStorySubjectKind | undefined,
) => {
  const cta = clean(value);
  if (!cta) return "Add a final CTA.";
  if (wordCount(cta) < 3) return "CTA must be at least 3 words.";
  if (wordCount(cta) > 7) return "CTA must be 7 words or fewer.";
  if (unusableCtaPattern.test(cta)) return "CTA must ask the viewer to act, not describe the mechanism.";
  const hasAction = buyerActionPattern.test(cta)
    || (subjectKind !== "product" && Boolean(subjectKind) && storyActionPattern.test(cta));
  if (!hasAction) return "CTA needs a clear action verb.";
  return "";
};

export const assertThreeDBreakdownCta = (
  value: unknown,
  subjectKind: ThreeDBreakdownStorySubjectKind | undefined,
) => {
  const error = getThreeDBreakdownCtaError(value, subjectKind);
  if (error) throw new Error(`3D Breakdown ${error}`);
};

export const selectThreeDBreakdownCta = ({
  brandName,
  generatedCta,
  productTitle,
  siteCta,
  subjectKind,
}: {
  brandName: string;
  generatedCta?: string;
  productTitle?: string;
  siteCta?: string;
  subjectKind?: ThreeDBreakdownStorySubjectKind;
}) => {
  if (subjectKind === "brand") return "Watch the full story.";
  if (subjectKind === "customer-problem") return `See how ${shortName(brandName, 3)} solves it.`;
  if (subjectKind === "product" && productTitle) return `Try ${shortName(productTitle)} today.`;

  const supported = [generatedCta, siteCta]
    .map(clean)
    .find((candidate) => !getThreeDBreakdownCtaError(candidate, subjectKind));
  if (supported) return supported;

  if (subjectKind === "custom") return `Learn more about ${shortName(brandName, 4)}.`;
  return `Shop ${shortName(productTitle || brandName || "this product")} today.`;
};
