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
    kind: "video" | "image";
    src: string;
    poster?: string;
    durationLabel: string;
  };
  format: {
    slug: string;
    name: string;
    version: string;
    owner: string;
  };
};
