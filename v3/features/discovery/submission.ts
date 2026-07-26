import { isValidWaitlistEmail, normalizeWaitlistEmail } from "@/features/waitlist/email";

export type DiscoverySubmissionInput = {
  creatorName: string;
  contactEmail: string;
  formatUrl: string;
  outputUrls: string[];
  promise: string;
  sourceCredit: string;
};

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeDiscoverySubmission(
  input: DiscoverySubmissionInput,
): DiscoverySubmissionInput {
  return {
    creatorName: input.creatorName.trim(),
    contactEmail: normalizeWaitlistEmail(input.contactEmail),
    formatUrl: input.formatUrl.trim(),
    outputUrls: input.outputUrls.map((url) => url.trim()),
    promise: input.promise.trim(),
    sourceCredit: input.sourceCredit.trim(),
  };
}

export function validateDiscoverySubmission(
  input: DiscoverySubmissionInput,
): string | null {
  if (input.creatorName.length < 2 || input.creatorName.length > 80) {
    return "Enter your name.";
  }
  if (!isValidWaitlistEmail(input.contactEmail)) {
    return "Enter a real email address.";
  }
  if (!isHttpUrl(input.formatUrl)) {
    return "Add a public Format or package link.";
  }
  if (
    input.outputUrls.length !== 3 ||
    new Set(input.outputUrls).size !== 3 ||
    input.outputUrls.some((url) => !isHttpUrl(url))
  ) {
    return "Add exactly three real output links.";
  }
  if (input.promise.length < 10 || input.promise.length > 160) {
    return "Describe the promise in 10 to 160 characters.";
  }
  if (input.sourceCredit.length < 3 || input.sourceCredit.length > 300) {
    return "Name the source, or write Original work.";
  }
  return null;
}
