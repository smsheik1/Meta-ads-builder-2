export type MakerAnalysisActivity = {
  id: string;
  label: string;
  detail?: string;
  status: "active" | "complete" | "failed";
  elapsedSeconds: number;
};

export type MakerAnalysisTiming = {
  ocrSeconds?: number;
  semanticSeconds?: number;
  samSeconds?: number;
};

export type MakerAnalysisStreamMessage =
  | { type: "progress"; activity: MakerAnalysisActivity }
  | { type: "complete"; result: { draft: unknown; warnings?: string[]; timing?: MakerAnalysisTiming } }
  | { type: "error"; error: string };

export const encodeMakerAnalysisStreamMessage = (message: MakerAnalysisStreamMessage) => `${JSON.stringify(message)}\n`;

export function mergeMakerAnalysisActivity(
  activities: MakerAnalysisActivity[],
  next: MakerAnalysisActivity,
) {
  const existingIndex = activities.findIndex((activity) => activity.id === next.id);
  if (existingIndex === -1) return [...activities, next];
  return activities.map((activity, index) => index === existingIndex ? next : activity);
}
