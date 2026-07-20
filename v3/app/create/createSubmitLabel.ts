import { PRODUCT_PHOTOSHOOT_FORMAT, type CreateFormatId } from "./createFormats";

export function getCreateSubmitLabel({
  adStatus,
  creativePackBusy,
  format,
  needsThreeDSubject,
  needsThreeDSubjectUrl,
  status,
}: {
  adStatus: "idle" | "loading" | "ready" | "error";
  creativePackBusy: boolean;
  format: CreateFormatId;
  needsThreeDSubject: boolean;
  needsThreeDSubjectUrl: boolean;
  status: "idle" | "loading" | "ready" | "error";
}) {
  if (creativePackBusy) return "Creative pack running";
  if (status === "loading") return "Reading website";
  if (adStatus === "loading") {
    const loadingLabels: Partial<Record<CreateFormatId, string>> = {
      [PRODUCT_PHOTOSHOOT_FORMAT]: "Generating shots",
      meme: "Writing memes",
      "were-sorry": "Writing apologies",
      "video-meme": "Writing video memes",
      jingle: "Writing jingles",
      "text-message": "Writing texts",
      brainrot: "Writing brainrot",
      reviews: "Writing proof ads",
      "motion-story": "Writing stories",
      "three-d-breakdown": "Writing 3D stories",
    };
    return loadingLabels[format] || "Writing ideas";
  }
  if (needsThreeDSubject) return "Choose a 3D subject";
  if (needsThreeDSubjectUrl) return "Add a product page";
  if (format === PRODUCT_PHOTOSHOOT_FORMAT) return "Generate product shots";
  return "Generate ads";
}
