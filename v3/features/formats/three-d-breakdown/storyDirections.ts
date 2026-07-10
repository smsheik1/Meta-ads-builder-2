import type {
  ThreeDBreakdownEvidenceUseType,
  ThreeDBreakdownRevealPattern,
} from "../../scene/types";

export type ThreeDBreakdownStoryDirection = {
  directionId: string;
  hookLine: string;
  subheadline: string;
  shortSummary: string;
  category: string;
  whyCompelling: string;
  adAngle: string;
  visualEngine: string;
  evidenceIndex: number;
  evidenceUseType: ThreeDBreakdownEvidenceUseType;
  possibleRevealPatterns: ThreeDBreakdownRevealPattern[];
};

export type ThreeDBreakdownStoryDirectionSlate = {
  directions: ThreeDBreakdownStoryDirection[];
  recommendedDirectionId: string;
};
