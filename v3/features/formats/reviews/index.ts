import type { ReviewsAdScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { ReviewsFormatRenderer } from "./render";
import { reviewsEditorSchema } from "./schema";
import { validateReviewsScene } from "./validate";

export const reviewsFormatModule: AdFormatModule<"reviews", ReviewsAdScene> = {
  id: "reviews",
  label: "Reviews Proof Ad",
  defaultSlots: ["headline"],
  editorSchema: reviewsEditorSchema,
  RenderComponent: ReviewsFormatRenderer,
  validate: validateReviewsScene,
};
