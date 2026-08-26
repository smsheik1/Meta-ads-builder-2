export type FormatRepoTrustData = {
  idPrefix: string;
  version: string;
  assembly: {
    title: string;
    path: string;
    ariaLabel: string;
    commandsLabel: string;
    commandsAriaLabel: string;
    steps: Array<{
      title: string;
      cost: string;
      description: string;
      waiting?: string;
    }>;
    commands: string[];
  };
  proof: {
    durationTimeLabel: string;
    aspectRatio?: "9:16" | "16:9";
  };
  proofCopy: {
    eyebrow: string;
    title: string;
  };
  annotations: Array<{
    seconds: number;
    timeLabel: string;
    title: string;
    description: string;
    color: "cyan" | "pink" | "lime" | "yellow";
  }>;
  quality: {
    eyebrow: string;
    title: string;
    summary: Array<{ value: string; label: string }>;
    noteTitle: string;
    note: string;
    criteriaTitle: string;
    criteriaSubtitle: string;
    criteria: Array<{
      id: string;
      label: string;
      value?: string;
      badge?: string;
    }>;
    ratingScale?: Array<{ value: string; label: string }>;
    rule: string;
  };
  commands: string[];
  receipt: {
    rows: Array<{ label: string; value: string }>;
    note: string;
  };
  files: Array<{
    label: string;
    path: string;
    content: string;
  }>;
};
