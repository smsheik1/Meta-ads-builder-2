import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import {
  getPublishedDiscoveryEntries,
  groupDiscoveryEntriesByShelf,
} from "../features/discovery/catalog";
import { getBikiniBottomDanceOffTrustData } from "../features/discovery/bikiniBottomDanceOffTrust.server";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const repositoryRoot = "public/format-repositories/bikini-bottom-dance-off-v1";
const evidenceRoot = `${repositoryRoot}/examples/wiggle-proof/evidence`;
const download = `${repositoryRoot}/downloads/wiggly-bikini-bottom-dance-off-format-kit.zip`;
const finalVideo = `${evidenceRoot}/final.mp4`;
const profile = getDiscoveryFormatProfile("bikini-bottom-dance-off");
const entries = getPublishedDiscoveryEntries().filter((entry) => entry.format.slug === "bikini-bottom-dance-off");

assert.deepEqual(entries.map((entry) => entry.id), ["bikini-bottom-dance-off-wiggle"]);
assert.equal(entries[0]?.media.src, `/${finalVideo.replace(/^public\//, "")}`);
assert.equal(entries[0]?.media.poster, `/${evidenceRoot.replace(/^public\//, "")}/poster.png`);
assert.equal(entries[0]?.media.aspectRatio, "9:16");
assert.equal(statSync(finalVideo).size > 5_000_000, true);
assert.equal(existsSync(`${evidenceRoot}/poster.png`), true);
assert.equal(existsSync(`${evidenceRoot}/contact-sheet.png`), true);
assert.equal(existsSync(`${evidenceRoot}/delivery.json`), true);

const evalReport = JSON.parse(readFileSync(`${evidenceRoot}/eval-report.json`, "utf8")) as {
  overall: Record<string, string | number>;
  criteria: Array<{ status: string; explanation: string }>;
};
assert.deepEqual(evalReport.overall, {
  status: "pass",
  score: 100,
  grade: "A+",
  passingScore: 85,
  provisionalPercent: 100,
  automaticScore: 70,
  automaticMaximum: 70,
  humanScore: 30,
  humanMaximum: 30,
});
assert.ok(evalReport.criteria.length > 20);
assert.ok(evalReport.criteria.every((criterion) => criterion.status === "pass" && criterion.explanation));
const delivery = JSON.parse(readFileSync(`${evidenceRoot}/delivery.json`, "utf8")) as {
  status: string;
  finalVideo: { path: string; sha256: string };
  eval: { grade: string; score: number; status: string };
};
assert.equal(delivery.status, "ready");
assert.equal(delivery.eval.grade, "A+");
assert.equal(delivery.eval.score, 100);
assert.equal(delivery.eval.status, "pass");
assert.equal(delivery.finalVideo.path, "final.mp4");
assert.match(delivery.finalVideo.sha256, /^[0-9a-f]{64}$/);

assert.ok(profile?.handoff);
assert.equal(profile.version, "0.8.0");
assert.equal(profile.technicalHref, "/format-lab/character-dance-lab");
assert.equal(profile.handoff.output, "One 47-second vertical MP4 plus a quality report");
assert.equal(profile.repositoryHref, "/format-repositories/bikini-bottom-dance-off-v1/downloads/wiggly-bikini-bottom-dance-off-format-kit.zip");
assert.equal(profile.proofEntries.length, 1);
assert.equal(existsSync(download), true);
const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Runnable Repo: https:\/\/wiggly\.agentenamel\.com\/format-repositories\/bikini-bottom-dance-off-v1\/downloads/);
assert.match(prompt, /Return final\.mp4 together with eval-report\.md and delivery\.json/);
assert.match(prompt, /What song should the four characters dance to\?/);

const shelf = groupDiscoveryEntriesByShelf(getPublishedDiscoveryEntries())
  .find((candidate) => candidate.id === "character-dance-offs");
assert.ok(shelf?.entries.some((entry) => entry.format.slug === "bikini-bottom-dance-off"));
assert.equal(
  groupDiscoveryEntriesByShelf(getPublishedDiscoveryEntries())
    .find((candidate) => candidate.id === "character-explainers")
    ?.entries.some((entry) => entry.format.slug === "bikini-bottom-dance-off"),
  false,
  "Dance Off should not be mixed into the explainer shelf.",
);

const consumerRoute = readFileSync("app/formats/[slug]/page.tsx", "utf8");
const connectionsComponent = readFileSync("features/discovery/BikiniBottomDanceOffConnections.tsx", "utf8");
const runSummaryComponent = readFileSync("features/discovery/BikiniBottomDanceOffRunSummary.tsx", "utf8");
const trustComponent = readFileSync("features/discovery/BikiniBottomDanceOffTrust.tsx", "utf8");
const convexProvider = readFileSync("app/ConvexClientProvider.tsx", "utf8");
assert.match(consumerRoute, /Download runnable Repo/);
assert.match(consumerRoute, /format\.repositoryHref/);
assert.match(consumerRoute, /BikiniBottomDanceOffTrust/);
assert.match(consumerRoute, /<BikiniBottomDanceOffConnections data=\{danceOffTrust\} \/>/);
assert.match(consumerRoute, /<BikiniBottomDanceOffRunSummary format=\{format\} \/>/);
assert.doesNotMatch(consumerRoute, /variant="inline"/);
assert.match(consumerRoute, /slug === "bikini-bottom-dance-off"/);
assert.match(consumerRoute, /!danceOffTrust/);
assert.match(
  consumerRoute,
  /\{!danceOffTrust \? \(\s*<a\s+href="#proof"/,
  "Dance Off should not show the redundant hero proof button once proof is inline.",
);
assert.match(trustComponent, /videoRef\.current\.currentTime = annotation\.seconds/);
assert.match(trustComponent, /aria-pressed=\{activeAnnotation === index\}/);
assert.match(trustComponent, /See it work\./);
assert.match(trustComponent, /What gets stopped\./);
assert.doesNotMatch(trustComponent, /One job\. Six transformations\./);
assert.doesNotMatch(trustComponent, /The real proof, annotated\./);
assert.doesNotMatch(trustComponent, /What the Repo refuses to ship\./);
assert.match(trustComponent, /Read from the published v\s*\{data\.version\} Repo/);
assert.match(trustComponent, /<section id="how-it-works"/);
assert.match(trustComponent, /id="proof"/);
assert.match(trustComponent, /How this Format works\./);
assert.match(trustComponent, /href="#dance-off-assembly"/);
assert.match(trustComponent, /href="#dance-off-quality"/);
assert.match(trustComponent, /href="#dance-off-repo"/);
assert.match(trustComponent, /href="#dance-off-advanced"/);
assert.match(trustComponent, /Open SKILL\.md/);
assert.match(trustComponent, /Open proof report/);
assert.match(trustComponent, /Open quality\.json/);
assert.match(trustComponent, /onClick=\{\(\) => revealSource\("SKILL\.md"\)\}/);
assert.doesNotMatch(trustComponent, /From SKILL\.md/);
assert.doesNotMatch(trustComponent, /From PROOF-REPORT\.md/);
assert.doesNotMatch(trustComponent, /From quality\.json/);
assert.doesNotMatch(trustComponent, /fake green statuses/);
assert.doesNotMatch(trustComponent, /does not maintain a second proof asset/);
assert.doesNotMatch(trustComponent, /You’ve seen the system/);
assert.match(connectionsComponent, /Services &amp; costs/);
assert.match(connectionsComponent, /1 required · 1 optional/);
assert.match(connectionsComponent, /What’s an API key\?/);
assert.match(connectionsComponent, /Character voices/);
assert.match(connectionsComponent, /Extra dances/);
assert.match(connectionsComponent, /Required/);
assert.match(connectionsComponent, /Optional/);
assert.match(connectionsComponent, /Free tier available/);
assert.match(connectionsComponent, /Check pricing/);
assert.match(connectionsComponent, /Pricing details/);
assert.doesNotMatch(connectionsComponent, /provider\.estimatedCost/);
assert.match(connectionsComponent, /Never paste it into Wiggly/);
assert.doesNotMatch(connectionsComponent, /Current estimate/);
assert.doesNotMatch(connectionsComponent, /No API key needed for/);
assert.doesNotMatch(connectionsComponent, /valid dialogue is already cached/);
assert.match(convexProvider, /pathname\.startsWith\("\/formats\/"\)/);
assert.match(runSummaryComponent, /What you need\. What you get\./);
assert.match(runSummaryComponent, /Pick an agent\. Wiggly sends it this exact Format version\./);
assert.match(runSummaryComponent, /One song you are allowed to use/);
assert.match(runSummaryComponent, /A scored quality report with explanations/);
assert.match(runSummaryComponent, /Usually 12–30 minutes/);
assert.match(runSummaryComponent, /nothing paid runs without\s+approval/);
assert.doesNotMatch(runSummaryComponent, /validated episode input/);
assert.doesNotMatch(runSummaryComponent, /provider cost/);
assert.doesNotMatch(runSummaryComponent, /A-F eval/);
assert.match(consumerRoute, /Ready to make one\?/);
assert.match(consumerRoute, /The requirements, timing, and exact Repo files are already above\./);
assert.match(
  consumerRoute,
  /danceOffTrust && format\.handoff \? \([\s\S]*Ready to make one\?[\s\S]*\) : \(/,
  "Dance Off should end with a compact CTA instead of repeating the full run breakdown.",
);

const trustData = await getBikiniBottomDanceOffTrustData();
assert.equal(trustData.version, "0.8.0");
assert.deepEqual(trustData.stats, {
  motions: 25,
  backgrounds: 4,
  automaticCriteria: 16,
  humanCriteria: 12,
  rendererCount: 1,
});
assert.deepEqual(trustData.annotations.map((annotation) => annotation.timeLabel), ["00:04", "00:34", "00:43", "00:46"]);
assert.deepEqual(trustData.annotations.map((annotation) => annotation.title), [
  "Each character gets a full solo.",
  "All four characters keep moving.",
  "All four deliver the closing line.",
  "The ending deliberately creates the replay.",
]);
assert.equal(trustData.proof.grade, "A+");
assert.equal(trustData.proof.score, 100);
assert.equal(trustData.requirements.providers[0]?.name, "Fish Audio");
assert.deepEqual(trustData.requirements.environmentVariables, ["FISH_STUDIO_APIKEY", "SQUILLIAM_VOICE_ID"]);
assert.equal(trustData.commands.includes("npm run render -- --run=episode-01 --approve-provider"), true);
assert.equal(trustData.commands.includes("npm run finalize -- --run=episode-01 --human-review=pass"), true);
assert.equal(trustData.fileGroups.flatMap((group) => group.files).some((file) => file.path === "PROOF-REPORT.md"), true);

const starterManifest = JSON.parse(readFileSync(`${repositoryRoot}/../mixamo-character-motion-v1/assets/motions/manifest.json`, "utf8")) as { motions: unknown[] };
assert.equal(starterManifest.motions.length, 25);
const motionRunner = readFileSync(`${repositoryRoot}/../mixamo-character-motion-v1/runner.mjs`, "utf8");
assert.match(motionRunner, /user-motions/);
assert.match(motionRunner, /loadMotionCatalog/);

console.log("Bikini Bottom Dance Off Discover page tests passed.");
