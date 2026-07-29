export type DiscoveryGoal = "all" | "sell" | "explain" | "story" | "teach" | "entertain";

export type DiscoveryEntry = {
  id: string;
  status: "published" | "draft";
  order: number;
  brand: string;
  title: string;
  curatorNote: string;
  goal: Exclude<DiscoveryGoal, "all">;
  media: {
    kind: "video" | "image" | "audio";
    src: string;
    poster?: string;
    referenceSrc?: string;
    durationLabel: string;
    accentColor?: string;
  };
  format: {
    slug: string;
    name: string;
    version: string;
    owner: string;
  };
};

export type DiscoveryFormatProfile = {
  slug: string;
  name: string;
  version: string;
  creator: string;
  promise: string;
  lastUpdated: string;
  technicalHref?: string;
  proofEntries: DiscoveryEntry[];
  whatStays: string[];
  whatChanges: string[];
  handoff?: DiscoveryFormatHandoff;
};

export type DiscoveryRunEstimate = {
  label: string;
  cost: string;
  time: string;
};

export type DiscoveryFormatHandoff = {
  requiredInputs: string[];
  deliverables: string[];
  instructions: string[];
  estimates: DiscoveryRunEstimate[];
  totalEstimate: string;
  output: string;
  firstQuestion: string;
};

export type DiscoveryCreator = {
  handle: string;
  name: string;
  bio: string;
  avatar: {
    kind: "image" | "initials";
    value: string;
  };
};
