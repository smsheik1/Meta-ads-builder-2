export type ResearchProviderStatus = {
  provider: "firecrawl";
  status: "used" | "failed";
  reason: string;
};

export type ResearchReceipts = {
  specificClaims: string[];
  buyerMoments: string[];
  exactSiteLanguage: string[];
  namedProof: string[];
};

export type ResearchEvidence = {
  headings: string[];
  paragraphs: string[];
  receipts: ResearchReceipts;
  rawMarkdown: string;
};

export type BrandSnapshot = {
  name: string;
  url: string;
  host: string;
  title: string;
  description: string;
  faviconUrl: string | null;
  logoUrl: string | null;
  ogImageUrl: string | null;
  screenshotUrl: string | null;
  colors: string[];
  fonts: {
    heading?: string;
    body?: string;
    feel: "serif" | "sans" | "display" | "mono" | "unknown";
  };
  vibeTags: string[];
};

export type WebsiteResearchResult = {
  websiteUrl: string;
  finalUrl: string;
  host: string;
  brand: BrandSnapshot;
  evidence: ResearchEvidence;
  metadata: Record<string, unknown>;
  branding: Record<string, unknown>;
  providerStatus: ResearchProviderStatus[];
};

export type StoredWebsiteResearchResult = WebsiteResearchResult & {
  sessionId: string;
  researchRunId: string;
  brandSnapshotId: string;
};
