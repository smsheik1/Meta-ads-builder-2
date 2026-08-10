import { v } from "convex/values";
import {
  buildRepoScan,
  normalizeRepoSubmissionDetails,
  parsePublicGitHubRepositoryUrl,
  validateRepoArchive,
  validateRepoScanReport,
  validateRepoSubmissionDetails,
  type RepoScanReport,
} from "../features/discovery/repoSubmission";
import { action, internalQuery, mutation } from "./_generated/server";

const repoScanCheckValidator = v.object({
  id: v.union(
    v.literal("instructions"),
    v.literal("manifest"),
    v.literal("runtime"),
    v.literal("requirements"),
    v.literal("inputs"),
    v.literal("outputs"),
    v.literal("quality"),
    v.literal("proof"),
    v.literal("assets"),
  ),
  label: v.string(),
  description: v.string(),
  required: v.boolean(),
  found: v.boolean(),
  evidence: v.array(v.string()),
});

const repoScanReportValidator = v.object({
  schemaVersion: v.literal(1),
  fileCount: v.number(),
  requiredFound: v.number(),
  requiredTotal: v.number(),
  readyForRuntimeTest: v.boolean(),
  checks: v.array(repoScanCheckValidator),
});

const submissionValidator = v.object({
  _id: v.id("discoverySubmissions"),
  _creationTime: v.number(),
  creatorName: v.string(),
  contactEmail: v.string(),
  formatUrl: v.string(),
  outputUrls: v.array(v.string()),
  promise: v.string(),
  sourceCredit: v.string(),
  sourceType: v.optional(v.union(v.literal("github"), v.literal("zip"))),
  sourceKey: v.optional(v.string()),
  githubUrl: v.optional(v.string()),
  archiveStorageId: v.optional(v.id("_storage")),
  archiveName: v.optional(v.string()),
  archiveSize: v.optional(v.number()),
  repoName: v.optional(v.string()),
  formatName: v.optional(v.string()),
  scanReport: v.optional(repoScanReportValidator),
  status: v.literal("pending"),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const createRepoArchiveUploadUrl: ReturnType<typeof mutation> = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

export const scanPublicGitHub: ReturnType<typeof action> = action({
  args: {
    repositoryUrl: v.string(),
  },
  returns: v.object({
    sourceUrl: v.string(),
    repoName: v.string(),
    defaultBranch: v.string(),
    description: v.union(v.string(), v.null()),
    scanReport: repoScanReportValidator,
  }),
  handler: async (_ctx, args) => {
    const parsed = parsePublicGitHubRepositoryUrl(args.repositoryUrl);
    if (!parsed) {
      throw new Error("Paste a public GitHub repository URL, like https://github.com/owner/repo.");
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "Wiggly-Repo-Intake",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const token = process.env.GITHUB_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    const repositoryResponse = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`,
      { headers },
    );
    if (repositoryResponse.status === 404) {
      throw new Error("We could not find that public GitHub repository. Check the URL or use a ZIP file.");
    }
    if (repositoryResponse.status === 403) {
      throw new Error("GitHub's public scan limit is busy right now. Try again later or use a ZIP file.");
    }
    if (!repositoryResponse.ok) {
      throw new Error("GitHub could not open that repository. Try a ZIP file instead.");
    }

    const repository = await repositoryResponse.json() as {
      name?: unknown;
      description?: unknown;
      default_branch?: unknown;
      private?: unknown;
    };
    if (repository.private === true) {
      throw new Error("Private GitHub repositories are not supported yet. Upload a ZIP file instead.");
    }
    if (typeof repository.name !== "string" || typeof repository.default_branch !== "string") {
      throw new Error("GitHub returned incomplete repository information. Try a ZIP file instead.");
    }

    const treeResponse = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`,
      { headers },
    );
    if (!treeResponse.ok) {
      throw new Error("GitHub could not list the repository files. Try a ZIP file instead.");
    }
    const tree = await treeResponse.json() as {
      truncated?: unknown;
      tree?: Array<{ path?: unknown; type?: unknown }>;
    };
    if (tree.truncated === true) {
      throw new Error("This repository is too large for the public scanner. Upload a ZIP file instead.");
    }
    const filePaths = Array.isArray(tree.tree)
      ? tree.tree.flatMap((entry) => (
        entry.type === "blob" && typeof entry.path === "string" ? [entry.path] : []
      ))
      : [];
    if (filePaths.length === 0) {
      throw new Error("This repository does not contain any files to scan.");
    }

    return {
      sourceUrl: parsed.canonicalUrl,
      repoName: repository.name,
      defaultBranch: repository.default_branch,
      description: typeof repository.description === "string" ? repository.description : null,
      scanReport: buildRepoScan(filePaths),
    };
  },
});

export const submitRepo: ReturnType<typeof mutation> = mutation({
  args: {
    sourceType: v.union(v.literal("github"), v.literal("zip")),
    githubUrl: v.optional(v.string()),
    archiveStorageId: v.optional(v.id("_storage")),
    archiveName: v.optional(v.string()),
    archiveSize: v.optional(v.number()),
    repoName: v.string(),
    creatorName: v.string(),
    contactEmail: v.string(),
    formatName: v.string(),
    promise: v.string(),
    sourceCredit: v.string(),
    scanReport: repoScanReportValidator,
  },
  returns: v.object({
    submissionId: v.id("discoverySubmissions"),
    status: v.union(v.literal("created"), v.literal("updated")),
  }),
  handler: async (ctx, args) => {
    const details = normalizeRepoSubmissionDetails(args);
    const detailsError = validateRepoSubmissionDetails(details);
    if (detailsError) throw new Error(detailsError);
    const scanError = validateRepoScanReport(args.scanReport as RepoScanReport);
    if (scanError) throw new Error(scanError);
    if (args.repoName.trim().length < 1 || args.repoName.trim().length > 100) {
      throw new Error("The project name is invalid. Scan the source again.");
    }

    let sourceKey: string;
    let formatUrl: string;
    let sourceFields:
      | { githubUrl: string }
      | { archiveStorageId: NonNullable<typeof args.archiveStorageId>; archiveName: string; archiveSize: number };

    if (args.sourceType === "github") {
      const parsed = parsePublicGitHubRepositoryUrl(args.githubUrl ?? "");
      if (!parsed) throw new Error("Scan a public GitHub repository again.");
      sourceKey = parsed.canonicalUrl.toLowerCase();
      formatUrl = parsed.canonicalUrl;
      sourceFields = { githubUrl: parsed.canonicalUrl };
    } else {
      if (!args.archiveStorageId || !args.archiveName || typeof args.archiveSize !== "number") {
        throw new Error("Upload the ZIP file again.");
      }
      const archiveError = validateRepoArchive({ name: args.archiveName, size: args.archiveSize });
      if (archiveError) throw new Error(archiveError);
      sourceKey = `zip:${args.archiveStorageId}`;
      formatUrl = `convex-storage:${args.archiveStorageId}`;
      sourceFields = {
        archiveStorageId: args.archiveStorageId,
        archiveName: args.archiveName,
        archiveSize: args.archiveSize,
      };
    }

    const now = Date.now();
    const repoSubmission = {
      creatorName: details.creatorName,
      contactEmail: details.contactEmail,
      formatUrl,
      outputUrls: [] as string[],
      promise: details.promise,
      sourceCredit: details.sourceCredit,
      sourceType: args.sourceType,
      sourceKey,
      repoName: args.repoName.trim(),
      formatName: details.formatName,
      scanReport: args.scanReport,
      status: "pending" as const,
      updatedAt: now,
      ...sourceFields,
    };

    const existing = await ctx.db
      .query("discoverySubmissions")
      .withIndex("by_contactEmail_and_sourceKey", (query) => (
        query.eq("contactEmail", details.contactEmail).eq("sourceKey", sourceKey)
      ))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, repoSubmission);
      return { submissionId: existing._id, status: "updated" as const };
    }

    const submissionId = await ctx.db.insert("discoverySubmissions", {
      ...repoSubmission,
      createdAt: now,
    });
    return { submissionId, status: "created" as const };
  },
});

export const listPending: ReturnType<typeof internalQuery> = internalQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(submissionValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    return ctx.db
      .query("discoverySubmissions")
      .withIndex("by_status_and_createdAt", (query) => query.eq("status", "pending"))
      .order("desc")
      .take(limit);
  },
});
