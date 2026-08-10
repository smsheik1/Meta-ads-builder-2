"use client";

import JSZip from "jszip";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileArchive,
  Github,
  LoaderCircle,
  Search,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { useAction, useMutation } from "convex/react";
import { type FormEvent, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  buildRepoScan,
  normalizeRepoSubmissionDetails,
  parsePublicGitHubRepositoryUrl,
  validateRepoArchive,
  validateRepoSubmissionDetails,
  type RepoScanReport,
  type RepoSourceType,
  type RepoSubmissionDetails,
} from "@/features/discovery/repoSubmission";

type Stage = "source" | "review" | "details" | "complete";

type ScannedSource =
  | {
      type: "github";
      repoName: string;
      sourceUrl: string;
      description: string | null;
      scanReport: RepoScanReport;
    }
  | {
      type: "zip";
      repoName: string;
      file: File;
      scanReport: RepoScanReport;
    };

const initialDetails: RepoSubmissionDetails = {
  creatorName: "",
  contactEmail: "",
  formatName: "",
  promise: "",
  sourceCredit: "Original work.",
};

const stageOrder: Stage[] = ["source", "review", "details", "complete"];

const stageLabels = ["Add project", "Review scan", "Send details"];

function humanizeRepoName(value: string): string {
  return value
    .replace(/\.zip$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function friendlyError(caught: unknown): string {
  const fallback = "Something went wrong. Try again.";
  if (!(caught instanceof Error)) return fallback;
  const marker = caught.message.lastIndexOf("Uncaught Error:");
  const message = marker >= 0 ? caught.message.slice(marker + "Uncaught Error:".length) : caught.message;
  return message.replace(/\[Request ID:[^\]]+\]/g, "").trim() || fallback;
}

function Progress({ stage }: { stage: Stage }) {
  const currentIndex = Math.min(stageOrder.indexOf(stage), 2);
  return (
    <ol className="grid grid-cols-3 gap-2 border-y-2 border-[#080817] py-4 sm:gap-3" aria-label="Submission progress">
      {stageLabels.map((label, index) => {
        const complete = stage === "complete" || index < currentIndex;
        const current = stage !== "complete" && index === currentIndex;
        return (
          <li key={label} className="flex min-w-0 flex-col items-start gap-2 text-xs font-black sm:flex-row sm:items-center sm:gap-3 sm:text-sm">
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-md border-2 border-[#080817] sm:size-8 ${
                complete ? "bg-[#c9ff55]" : current ? "bg-[#52d6ff]" : "bg-white"
              }`}
            >
              {complete ? <Check className="size-4" aria-hidden="true" /> : index + 1}
            </span>
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function NextSteps() {
  return (
    <section className="mt-8 border-t-2 border-[#080817] pt-6" aria-labelledby="after-submit-heading">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">After you send it</p>
      <h3 id="after-submit-heading" className="mt-2 text-2xl font-black">Wiggly finishes the proof before publishing.</h3>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["1", "Runtime test", "The packaged commands run in an isolated workspace."],
          ["2", "Proof review", "The real output is checked against its quality rubric."],
          ["3", "Publish", "You approve the Format page and exact Repo version."],
        ].map(([number, title, description]) => (
          <li key={title} className="border-l-4 border-[#080817] pl-4">
            <p className="text-xs font-black text-[#667087]">{number}</p>
            <p className="mt-1 font-black">{title}</p>
            <p className="mt-1 text-sm font-bold leading-5 text-[#596176]">{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function RepoSubmissionFlow() {
  const scanPublicGitHub = useAction(api.discoverySubmissions.scanPublicGitHub);
  const createArchiveUploadUrl = useMutation(api.discoverySubmissions.createRepoArchiveUploadUrl);
  const submitRepo = useMutation(api.discoverySubmissions.submitRepo);
  const [stage, setStage] = useState<Stage>("source");
  const [sourceType, setSourceType] = useState<RepoSourceType>("github");
  const [githubUrl, setGithubUrl] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [scannedSource, setScannedSource] = useState<ScannedSource | null>(null);
  const [details, setDetails] = useState(initialDetails);
  const [status, setStatus] = useState<"idle" | "scanning" | "submitting">("idle");
  const [error, setError] = useState("");

  const missingRequired = useMemo(() => (
    scannedSource?.scanReport.checks.filter((check) => check.required && !check.found) ?? []
  ), [scannedSource]);

  const chooseSourceType = (next: RepoSourceType) => {
    setSourceType(next);
    setError("");
    setScannedSource(null);
  };

  const scanGitHub = async () => {
    if (!parsePublicGitHubRepositoryUrl(githubUrl)) {
      setError("Paste a public GitHub repository URL, like https://github.com/owner/repo.");
      return;
    }
    setStatus("scanning");
    setError("");
    try {
      const result = await scanPublicGitHub({ repositoryUrl: githubUrl });
      const source: ScannedSource = {
        type: "github",
        repoName: result.repoName,
        sourceUrl: result.sourceUrl,
        description: result.description,
        scanReport: result.scanReport,
      };
      setScannedSource(source);
      setGithubUrl(result.sourceUrl);
      setDetails((current) => ({
        ...current,
        formatName: current.formatName || humanizeRepoName(result.repoName),
        promise: current.promise || result.description || "",
      }));
      setStage("review");
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setStatus("idle");
    }
  };

  const scanZip = async () => {
    if (!zipFile) {
      setError("Choose a ZIP file first.");
      return;
    }
    const archiveError = validateRepoArchive(zipFile);
    if (archiveError) {
      setError(archiveError);
      return;
    }
    setStatus("scanning");
    setError("");
    try {
      const archive = await JSZip.loadAsync(zipFile);
      const filePaths = Object.values(archive.files)
        .filter((entry) => !entry.dir)
        .map((entry) => entry.name);
      if (filePaths.length === 0) throw new Error("That ZIP file does not contain any files.");
      if (filePaths.length > 10_000) throw new Error("Keep the project under 10,000 files for this scanner.");
      const repoName = zipFile.name.replace(/\.zip$/i, "");
      setScannedSource({
        type: "zip",
        repoName,
        file: zipFile,
        scanReport: buildRepoScan(filePaths),
      });
      setDetails((current) => ({
        ...current,
        formatName: current.formatName || humanizeRepoName(repoName),
      }));
      setStage("review");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not read that ZIP file.");
    } finally {
      setStatus("idle");
    }
  };

  const continueToDetails = () => {
    if (!scannedSource) return;
    setError("");
    setStage("details");
  };

  const updateDetails = <Key extends keyof RepoSubmissionDetails>(
    key: Key,
    value: RepoSubmissionDetails[Key],
  ) => {
    setDetails((current) => ({ ...current, [key]: value }));
  };

  const sendProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scannedSource) {
      setStage("source");
      setError("Add the project again.");
      return;
    }
    const normalizedDetails = normalizeRepoSubmissionDetails(details);
    const detailsError = validateRepoSubmissionDetails(normalizedDetails);
    if (detailsError) {
      setError(detailsError);
      return;
    }

    setStatus("submitting");
    setError("");
    try {
      let archiveStorageId: Id<"_storage"> | undefined;
      if (scannedSource.type === "zip") {
        const uploadUrl = await createArchiveUploadUrl({});
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/zip" },
          body: scannedSource.file,
        });
        if (!uploadResponse.ok) throw new Error("The ZIP upload failed. Try again.");
        const uploaded = await uploadResponse.json() as { storageId?: Id<"_storage"> };
        if (!uploaded.storageId) throw new Error("The ZIP upload did not return a stored file.");
        archiveStorageId = uploaded.storageId;
      }

      await submitRepo({
        sourceType: scannedSource.type,
        ...(scannedSource.type === "github"
          ? { githubUrl: scannedSource.sourceUrl }
          : {
              archiveStorageId,
              archiveName: scannedSource.file.name,
              archiveSize: scannedSource.file.size,
            }),
        repoName: scannedSource.repoName,
        ...normalizedDetails,
        scanReport: scannedSource.scanReport,
      });
      setDetails(normalizedDetails);
      setStage("complete");
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setStatus("idle");
    }
  };

  const restart = () => {
    setStage("source");
    setSourceType("github");
    setGithubUrl("");
    setZipFile(null);
    setScannedSource(null);
    setDetails(initialDetails);
    setError("");
  };

  return (
    <div>
      {stage === "source" ? (
        <div className="mb-8 max-w-3xl sm:mb-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">Create a Wiggly Repo</p>
          <h1 className="mt-4 text-5xl font-black leading-[0.9] sm:text-7xl">Turn a project into a reusable Format.</h1>
          <p className="mt-5 max-w-2xl text-lg font-bold leading-7 text-[#596176] sm:mt-6 sm:text-xl sm:leading-8">
            Start with a public GitHub repository or a ZIP. Wiggly scans the project before asking you for anything else.
          </p>
        </div>
      ) : null}

      <Progress stage={stage} />

      {stage === "source" ? (
        <section className="mt-6 sm:mt-8" aria-labelledby="source-heading">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">Step 1</p>
          <h2 id="source-heading" className="mt-2 text-3xl font-black leading-none sm:text-5xl">Where is your project?</h2>
          <p className="mt-4 max-w-2xl text-base font-bold leading-6 text-[#596176]">
            Pick one. Both paths use the same Wiggly scan.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              aria-pressed={sourceType === "github"}
              onClick={() => chooseSourceType("github")}
              className={`h-auto min-h-28 justify-start whitespace-normal border-2 border-[#080817] p-5 text-left shadow-[4px_4px_0_#080817] ${
                sourceType === "github" ? "bg-[#c9ff55] hover:bg-[#c9ff55]" : "bg-white hover:bg-[#fffdf8]"
              }`}
            >
              <Github className="size-7" aria-hidden="true" />
              <span>
                <span className="block text-lg font-black">Public GitHub repo</span>
                <span className="mt-1 block text-sm font-bold text-[#596176]">Paste the repository URL.</span>
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-pressed={sourceType === "zip"}
              onClick={() => chooseSourceType("zip")}
              className={`h-auto min-h-28 justify-start whitespace-normal border-2 border-[#080817] p-5 text-left shadow-[4px_4px_0_#080817] ${
                sourceType === "zip" ? "bg-[#c9ff55] hover:bg-[#c9ff55]" : "bg-white hover:bg-[#fffdf8]"
              }`}
            >
              <FileArchive className="size-7" aria-hidden="true" />
              <span>
                <span className="block text-lg font-black">ZIP on my computer</span>
                <span className="mt-1 block text-sm font-bold text-[#596176]">Use this for local or private projects.</span>
              </span>
            </Button>
          </div>

          <div className="mt-6 rounded-lg border-2 border-[#080817] bg-white p-5 shadow-[6px_6px_0_#52d6ff] sm:p-7">
            {sourceType === "github" ? (
              <div key="github-source" className="grid gap-3">
                <Label htmlFor="github-repository" className="font-black">Public GitHub repository URL</Label>
                <Input
                  id="github-repository"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  value={githubUrl}
                  onChange={(event) => setGithubUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void scanGitHub();
                    }
                  }}
                  placeholder="https://github.com/owner/repo"
                  className="h-13 border-2 border-[#aeb6c7] bg-[#fffdf8] px-4 font-bold focus-visible:ring-[#52d6ff]"
                />
                <p className="text-sm font-bold text-[#667087]">Private GitHub access can come later. Use a ZIP for now.</p>
                <Button
                  type="button"
                  onClick={() => void scanGitHub()}
                  disabled={status === "scanning"}
                  className="mt-2 min-h-12 w-full border-2 border-[#080817] bg-[#080817] px-5 font-black text-white shadow-[4px_4px_0_#c9ff55] sm:w-auto"
                >
                  {status === "scanning" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
                  {status === "scanning" ? "Scanning..." : "Scan repository"}
                </Button>
              </div>
            ) : (
              <div key="zip-source" className="grid gap-3">
                <Label htmlFor="repo-archive" className="font-black">Project ZIP</Label>
                <Input
                  id="repo-archive"
                  type="file"
                  accept=".zip,application/zip"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setZipFile(file);
                    setError(file ? validateRepoArchive(file) ?? "" : "");
                  }}
                  className="h-auto min-h-13 cursor-pointer border-2 border-[#aeb6c7] bg-[#fffdf8] px-4 py-3 font-bold file:mr-4 file:rounded-md file:bg-[#e9edf5] file:px-3 file:py-2 file:font-black focus-visible:ring-[#52d6ff]"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-[#667087]">
                  <span>ZIP files up to 200 MB.</span>
                  {zipFile ? <span>{zipFile.name} · {formatBytes(zipFile.size)}</span> : null}
                </div>
                <Button
                  type="button"
                  onClick={() => void scanZip()}
                  disabled={status === "scanning" || !zipFile}
                  className="mt-2 min-h-12 w-full border-2 border-[#080817] bg-[#080817] px-5 font-black text-white shadow-[4px_4px_0_#c9ff55] sm:w-auto"
                >
                  {status === "scanning" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
                  {status === "scanning" ? "Reading ZIP..." : "Scan ZIP"}
                </Button>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {stage === "review" && scannedSource ? (
        <section className="mt-8" aria-labelledby="scan-heading">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">Step 2</p>
              <h2 id="scan-heading" className="mt-2 text-4xl font-black leading-none sm:text-5xl">Here is what Wiggly found.</h2>
              <p className="mt-4 text-base font-bold text-[#596176]">
                {scannedSource.repoName} · {scannedSource.scanReport.fileCount.toLocaleString()} files scanned
              </p>
            </div>
            <Badge
              variant="outline"
              className={`border-2 border-[#080817] px-3 py-2 text-sm font-black ${
                missingRequired.length === 0 ? "bg-[#c9ff55]" : "bg-[#ffd65a]"
              }`}
            >
              {scannedSource.scanReport.requiredFound} of {scannedSource.scanReport.requiredTotal} required parts found
            </Badge>
          </div>

          <div className="mt-7 overflow-hidden rounded-lg border-2 border-[#080817] bg-white shadow-[6px_6px_0_#080817]">
            <ul className="divide-y-2 divide-[#d8dbe3]">
              {scannedSource.scanReport.checks.map((check) => (
                <li key={check.id} className="grid gap-3 p-4 sm:grid-cols-[28px_1fr_auto] sm:items-center sm:px-5">
                  {check.found ? (
                    <CheckCircle2 className="size-6 text-[#287100]" aria-hidden="true" />
                  ) : (
                    <XCircle className="size-6 text-[#b14800]" aria-hidden="true" />
                  )}
                  <div>
                    <p className="font-black">{check.label}</p>
                    <p className="mt-1 text-sm font-bold leading-5 text-[#667087]">{check.description}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`w-fit border-2 border-[#080817] font-black ${
                      check.found ? "bg-[#dfffb5]" : check.required ? "bg-[#ffe7ca]" : "bg-[#eef1f6]"
                    }`}
                  >
                    {check.found ? "Found" : check.required ? "Missing" : "Optional"}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>

          <div className={`mt-6 border-l-4 border-[#080817] p-4 ${missingRequired.length === 0 ? "bg-[#e8ffd1]" : "bg-[#fff0cf]"}`}>
            <p className="font-black">
              {missingRequired.length === 0
                ? "The structure is ready for a real runtime test."
                : `${missingRequired.length} required ${missingRequired.length === 1 ? "part is" : "parts are"} still missing.`}
            </p>
            <p className="mt-1 text-sm font-bold leading-5 text-[#596176]">
              {missingRequired.length === 0
                ? "Wiggly will run the packaged commands after you submit."
                : "You can still send it. This scan becomes the exact build checklist."}
            </p>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStage("source");
                setError("");
              }}
              className="min-h-12 border-2 border-[#080817] bg-white px-5 font-black"
            >
              <ArrowLeft aria-hidden="true" />
              Change source
            </Button>
            <Button
              type="button"
              onClick={continueToDetails}
              className="min-h-12 border-2 border-[#080817] bg-[#080817] px-5 font-black text-white shadow-[4px_4px_0_#52d6ff]"
            >
              Continue
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>

          <NextSteps />
        </section>
      ) : null}

      {stage === "details" && scannedSource ? (
        <section className="mt-8" aria-labelledby="details-heading">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#667087]">Step 3</p>
          <h2 id="details-heading" className="mt-2 text-4xl font-black leading-none sm:text-5xl">Last, tell us who made it.</h2>
          <p className="mt-4 max-w-2xl text-base font-bold leading-6 text-[#596176]">
            The source and scan are already attached. We only need the details that cannot be read from the files.
          </p>

          <form onSubmit={sendProject} noValidate className="mt-7 rounded-lg border-2 border-[#080817] bg-white p-5 shadow-[7px_7px_0_#080817] sm:p-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="creator-name" className="font-black">Your name</Label>
                <Input
                  id="creator-name"
                  autoComplete="name"
                  value={details.creatorName}
                  onChange={(event) => updateDetails("creatorName", event.target.value)}
                  placeholder="Maya Chen"
                  className="h-12 border-2 border-[#aeb6c7] bg-[#fffdf8] px-4 font-bold focus-visible:ring-[#52d6ff]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-email" className="font-black">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={details.contactEmail}
                  onChange={(event) => updateDetails("contactEmail", event.target.value)}
                  placeholder="you@studio.com"
                  className="h-12 border-2 border-[#aeb6c7] bg-[#fffdf8] px-4 font-bold focus-visible:ring-[#52d6ff]"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <Label htmlFor="format-name" className="font-black">Format name</Label>
              <Input
                id="format-name"
                value={details.formatName}
                onChange={(event) => updateDetails("formatName", event.target.value)}
                placeholder="Bikini Bottom Dance Off"
                className="h-12 border-2 border-[#aeb6c7] bg-[#fffdf8] px-4 font-bold focus-visible:ring-[#52d6ff]"
              />
            </div>

            <div className="mt-5 grid gap-2">
              <div className="flex items-end justify-between gap-4">
                <Label htmlFor="format-promise" className="font-black">What does this Format consistently make?</Label>
                <span className="text-xs font-black text-[#667087]">{details.promise.length}/160</span>
              </div>
              <Textarea
                id="format-promise"
                value={details.promise}
                onChange={(event) => updateDetails("promise", event.target.value)}
                maxLength={160}
                placeholder="Turns one song into a four-character dance-off video."
                className="min-h-24 resize-y border-2 border-[#aeb6c7] bg-[#fffdf8] p-4 font-bold leading-6 focus-visible:ring-[#52d6ff]"
              />
            </div>

            <div className="mt-5 grid gap-2">
              <Label htmlFor="source-credit" className="font-black">Source or remix credit</Label>
              <Input
                id="source-credit"
                value={details.sourceCredit}
                onChange={(event) => updateDetails("sourceCredit", event.target.value)}
                maxLength={300}
                placeholder="Original work, or name the Format you remixed."
                className="h-12 border-2 border-[#aeb6c7] bg-[#fffdf8] px-4 font-bold focus-visible:ring-[#52d6ff]"
              />
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-md bg-[#edf9ff] p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-bold leading-5 text-[#30374b]">
                Nothing is published automatically. Paid provider calls also require your approval.
              </p>
            </div>

            {error ? (
              <p role="alert" className="mt-5 rounded-md border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStage("review");
                  setError("");
                }}
                className="min-h-12 border-2 border-[#080817] bg-white px-5 font-black"
              >
                <ArrowLeft aria-hidden="true" />
                Back to scan
              </Button>
              <Button
                type="submit"
                disabled={status === "submitting"}
                className="min-h-12 border-2 border-[#080817] bg-[#080817] px-5 font-black text-white shadow-[4px_4px_0_#c9ff55]"
              >
                {status === "submitting" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                {status === "submitting" ? "Sending project..." : "Send project"}
                {status !== "submitting" ? <ArrowRight aria-hidden="true" /> : null}
              </Button>
            </div>
          </form>

          <NextSteps />
        </section>
      ) : null}

      {stage === "complete" && scannedSource ? (
        <section className="mt-8 rounded-lg border-2 border-[#080817] bg-[#c9ff55] p-6 shadow-[8px_8px_0_#080817] sm:p-9" aria-labelledby="complete-heading">
          <CheckCircle2 className="size-11" aria-hidden="true" />
          <p className="mt-5 text-xs font-black uppercase tracking-[0.18em]">Project received</p>
          <h2 id="complete-heading" className="mt-2 text-4xl font-black leading-none sm:text-5xl">The scan and source are together.</h2>
          <p className="mt-4 max-w-2xl text-base font-bold leading-6 text-[#30374b]">
            {details.formatName} is queued for its isolated runtime test. Wiggly will use the scan as the build checklist and contact {details.contactEmail} before anything is published.
          </p>
          <div className="mt-7 grid gap-3 border-y-2 border-[#080817] py-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em]">Source</p>
              <p className="mt-1 font-black">{scannedSource.type === "github" ? "GitHub repository" : "Stored ZIP"}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em]">Structure scan</p>
              <p className="mt-1 font-black">{scannedSource.scanReport.requiredFound} of {scannedSource.scanReport.requiredTotal} required parts</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em]">Next</p>
              <p className="mt-1 font-black">Isolated runtime test</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={restart}
            className="mt-7 min-h-12 border-2 border-[#080817] bg-[#080817] px-5 font-black text-white"
          >
            Submit another project
          </Button>
        </section>
      ) : null}

      {error && stage !== "details" ? (
        <p role="alert" className="mt-5 rounded-md border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
