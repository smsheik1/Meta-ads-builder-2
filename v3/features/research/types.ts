export type ResearchProviderStatus = {
  provider:
    | "jina"
    | "firecrawl"
    | "brand-cache"
    | "brandfetch"
    | "html-brand-assets"
    | "ad-angles"
    | "gemini-curator"
    | "nvidia-nim-curator";
  status: "used" | "failed" | "skipped";
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

export type BrandBrief = {
  brandName: string;
  offer: string;
  audience: string;
  buyerMoments: string[];
  proof: string[];
  siteLanguage: string[];
  ctaDirection: string;
  visualNotes: string[];
  droppedNoiseSummary: string[];
  confidence: "low" | "medium" | "high";
};

export type BrandAdAngle = {
  buyer: string;
  moment: string;
  pain: string;
  proof: string;
  sitePhrase: string | null;
};

export type WebsiteResearchResult = {
  websiteUrl: string;
  finalUrl: string;
  host: string;
  brand: BrandSnapshot;
  brandBrief: BrandBrief;
  adAngles?: BrandAdAngle[];
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

export type StoredWebsiteResearchFailure = {
  status: "failed";
  sessionId: string;
  researchRunId: string;
  error: string;
};

export type StoredWebsiteResearchResponse = StoredWebsiteResearchResult | StoredWebsiteResearchFailure;

export const isStoredWebsiteResearchFailure = (
  result: StoredWebsiteResearchResponse,
): result is StoredWebsiteResearchFailure => (
  "status" in result && result.status === "failed"
);
