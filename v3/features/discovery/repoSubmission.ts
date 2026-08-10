import { isValidWaitlistEmail, normalizeWaitlistEmail } from "../waitlist/email";

export const REPO_ARCHIVE_MAX_BYTES = 200 * 1024 * 1024;

export type RepoSourceType = "github" | "zip";

export type RepoScanCheckId =
  | "instructions"
  | "manifest"
  | "runtime"
  | "requirements"
  | "inputs"
  | "outputs"
  | "quality"
  | "proof"
  | "assets";

export type RepoScanCheck = {
  id: RepoScanCheckId;
  label: string;
  description: string;
  required: boolean;
  found: boolean;
  evidence: string[];
};

export type RepoScanReport = {
  schemaVersion: 1;
  fileCount: number;
  requiredFound: number;
  requiredTotal: number;
  readyForRuntimeTest: boolean;
  checks: RepoScanCheck[];
};

export type RepoSubmissionDetails = {
  creatorName: string;
  contactEmail: string;
  formatName: string;
  promise: string;
  sourceCredit: string;
};

export type ParsedGitHubRepository = {
  owner: string;
  repo: string;
  canonicalUrl: string;
};

type CheckDefinition = Omit<RepoScanCheck, "found" | "evidence"> & {
  match: (paths: string[]) => string[];
};

const matches = (paths: string[], predicate: (path: string) => boolean) => (
  paths.filter(predicate).slice(0, 3)
);

const hasFile = (path: string, name: string) => (
  path === name || path.endsWith(`/${name}`)
);

const checkDefinitions: CheckDefinition[] = [
  {
    id: "instructions",
    label: "Agent instructions",
    description: "A SKILL.md that explains how an agent operates the Format.",
    required: true,
    match: (paths) => matches(paths, (path) => hasFile(path, "skill.md")),
  },
  {
    id: "manifest",
    label: "Format manifest",
    description: "A format.json or KIT-MANIFEST.json that identifies the package and version.",
    required: true,
    match: (paths) => matches(paths, (path) => (
      hasFile(path, "format.json") || hasFile(path, "kit-manifest.json")
    )),
  },
  {
    id: "runtime",
    label: "Official runtime",
    description: "A package and runner that provide one production path.",
    required: true,
    match: (paths) => {
      const packages = matches(paths, (path) => hasFile(path, "package.json"));
      const runners = matches(paths, (path) => (
        /(^|\/)(runner|render|renderer)\.(mjs|cjs|js|ts|tsx)$/.test(path)
        || path.includes("/runtime/")
      ));
      return packages.length > 0 && runners.length > 0
        ? [...packages, ...runners].slice(0, 3)
        : [];
    },
  },
  {
    id: "requirements",
    label: "Tools and API keys",
    description: "requirements.json or an equivalent file naming tools, providers, and key names.",
    required: true,
    match: (paths) => matches(paths, (path) => (
      hasFile(path, "requirements.json") || hasFile(path, ".env.example")
    )),
  },
  {
    id: "inputs",
    label: "Input contract",
    description: "A machine-readable list of what the user must provide.",
    required: true,
    match: (paths) => matches(paths, (path) => (
      hasFile(path, "input-contract.json") || hasFile(path, "inputs.json")
    )),
  },
  {
    id: "outputs",
    label: "Output contract",
    description: "A machine-readable definition of the files the Format returns.",
    required: true,
    match: (paths) => matches(paths, (path) => hasFile(path, "output-contract.json")),
  },
  {
    id: "quality",
    label: "Quality checks",
    description: "Automatic checks plus the rubric used to judge the finished output.",
    required: true,
    match: (paths) => {
      const rubric = matches(paths, (path) => hasFile(path, "quality.json"));
      const tests = matches(paths, (path) => path.includes("/tests/") || path.startsWith("tests/"));
      return rubric.length > 0 && tests.length > 0
        ? [...rubric, ...tests].slice(0, 3)
        : [];
    },
  },
  {
    id: "proof",
    label: "Proof and fixture",
    description: "At least one example run and one small free smoke-test fixture.",
    required: true,
    match: (paths) => {
      const examples = matches(paths, (path) => (
        path.includes("/examples/") || path.startsWith("examples/") || path.includes("/proof/")
      ));
      const fixtures = matches(paths, (path) => (
        path.includes("/fixtures/") || path.startsWith("fixtures/") || path.includes("smoke")
      ));
      return examples.length > 0 && fixtures.length > 0
        ? [...examples, ...fixtures].slice(0, 3)
        : [];
    },
  },
  {
    id: "assets",
    label: "Fixed assets and sources",
    description: "Reusable assets plus provenance or usage notes when the Format needs them.",
    required: false,
    match: (paths) => {
      const assets = matches(paths, (path) => path.includes("/assets/") || path.startsWith("assets/"));
      const sources = matches(paths, (path) => (
        hasFile(path, "provenance.json") || hasFile(path, "sources.json") || hasFile(path, "assets.json")
      ));
      return assets.length > 0 && sources.length > 0
        ? [...assets, ...sources].slice(0, 3)
        : [];
    },
  },
];

function normalizeRepoPaths(filePaths: string[]): string[] {
  const normalized = filePaths
    .map((path) => path.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, ""))
    .filter((path) => path && !path.endsWith("/") && !path.startsWith("__MACOSX/"));

  const firstSegments = new Set(normalized.map((path) => path.split("/")[0]));
  const hasSharedWrapper = firstSegments.size === 1 && normalized.every((path) => path.includes("/"));
  const withoutWrapper = hasSharedWrapper
    ? normalized.map((path) => path.slice(path.indexOf("/") + 1))
    : normalized;

  return [...new Set(withoutWrapper.map((path) => path.toLowerCase()))].sort();
}

export function buildRepoScan(filePaths: string[]): RepoScanReport {
  const paths = normalizeRepoPaths(filePaths).slice(0, 10_000);
  const checks = checkDefinitions.map(({ match, ...definition }) => {
    const evidence = match(paths);
    return {
      ...definition,
      found: evidence.length > 0,
      evidence,
    };
  });
  const requiredChecks = checks.filter((check) => check.required);
  const requiredFound = requiredChecks.filter((check) => check.found).length;

  return {
    schemaVersion: 1,
    fileCount: paths.length,
    requiredFound,
    requiredTotal: requiredChecks.length,
    readyForRuntimeTest: requiredFound === requiredChecks.length,
    checks,
  };
}

export function parsePublicGitHubRepositoryUrl(value: string): ParsedGitHubRepository | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") return null;
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 2) return null;
    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/i, "");
    const validSegment = /^[A-Za-z0-9_.-]+$/;
    if (!validSegment.test(owner) || !validSegment.test(repo)) return null;
    return {
      owner,
      repo,
      canonicalUrl: `https://github.com/${owner}/${repo}`,
    };
  } catch {
    return null;
  }
}

export function normalizeRepoSubmissionDetails(
  input: RepoSubmissionDetails,
): RepoSubmissionDetails {
  return {
    creatorName: input.creatorName.trim(),
    contactEmail: normalizeWaitlistEmail(input.contactEmail),
    formatName: input.formatName.trim(),
    promise: input.promise.trim(),
    sourceCredit: input.sourceCredit.trim(),
  };
}

export function validateRepoSubmissionDetails(
  input: RepoSubmissionDetails,
): string | null {
  if (input.creatorName.length < 2 || input.creatorName.length > 80) {
    return "Enter your name.";
  }
  if (!isValidWaitlistEmail(input.contactEmail)) {
    return "Enter a real email address.";
  }
  if (input.formatName.length < 2 || input.formatName.length > 100) {
    return "Give the Format a name.";
  }
  if (input.promise.length < 10 || input.promise.length > 160) {
    return "Describe what the Format makes in 10 to 160 characters.";
  }
  if (input.sourceCredit.length < 3 || input.sourceCredit.length > 300) {
    return "Name the source, or write Original work.";
  }
  return null;
}

export function validateRepoScanReport(report: RepoScanReport): string | null {
  if (report.schemaVersion !== 1 || report.fileCount < 1 || report.fileCount > 10_000) {
    return "The project scan is invalid. Scan the source again.";
  }
  if (report.checks.length !== checkDefinitions.length) {
    return "The project scan is incomplete. Scan the source again.";
  }
  const expectedIds = checkDefinitions.map((check) => check.id);
  if (report.checks.some((check, index) => check.id !== expectedIds[index])) {
    return "The project scan is out of date. Scan the source again.";
  }
  const requiredChecks = report.checks.filter((check) => check.required);
  const requiredFound = requiredChecks.filter((check) => check.found).length;
  if (
    report.requiredTotal !== requiredChecks.length
    || report.requiredFound !== requiredFound
    || report.readyForRuntimeTest !== (requiredFound === requiredChecks.length)
  ) {
    return "The project scan totals do not match. Scan the source again.";
  }
  if (report.checks.some((check) => check.evidence.length > 3)) {
    return "The project scan contains too much evidence. Scan the source again.";
  }
  return null;
}

export function validateRepoArchive(file: { name: string; size: number }): string | null {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return "Choose a ZIP file.";
  }
  if (file.size === 0) {
    return "That ZIP file is empty.";
  }
  if (file.size > REPO_ARCHIVE_MAX_BYTES) {
    return "Keep the ZIP under 200 MB, or use a public GitHub repository.";
  }
  return null;
}
