import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
const entries = getPublishedDiscoveryEntries().filter(
  (entry) => entry.format.slug === "bikini-bottom-dance-off",
);

assert.deepEqual(
  entries.map((entry) => entry.id),
  ["bikini-bottom-dance-off-wiggle"],
);
assert.equal(entries[0]?.media.src, `/${finalVideo.replace(/^public\//, "")}`);
assert.equal(
  entries[0]?.media.poster,
  `/${evidenceRoot.replace(/^public\//, "")}/poster.png`,
);
assert.equal(entries[0]?.media.aspectRatio, "9:16");
assert.equal(statSync(finalVideo).size > 5_000_000, true);
assert.equal(existsSync(`${evidenceRoot}/poster.png`), true);
assert.equal(existsSync(`${evidenceRoot}/contact-sheet.png`), true);
assert.equal(existsSync(`${evidenceRoot}/delivery.json`), true);
assert.equal(existsSync(`${evidenceRoot}/review-packet.json`), true);
assert.equal(existsSync(`${evidenceRoot}/blind-review.submission.json`), true);
assert.equal(existsSync(`${evidenceRoot}/blind-review.json`), true);

const evalReport = JSON.parse(
  readFileSync(`${evidenceRoot}/eval-report.json`, "utf8"),
) as {
  rubricVersion: string;
  overall: Record<string, string | number>;
  technicalCriteria: Array<{ status: string; explanation: string }>;
  blindCriteria: Array<{ status: string; explanation: string; rating: number; score: number }>;
};
assert.deepEqual(evalReport.overall, {
  status: "pass",
  score: 85,
  provisionalScore: 85,
  grade: "B",
  passingScore: 85,
  scoreMeaning: "blind creative quality only; technical validity is reported separately as pass or fail",
  technicalStatus: "pass",
  technicalPassed: 16,
  technicalTotal: 16,
});
assert.equal(evalReport.rubricVersion, "1.0.0");
assert.equal(evalReport.technicalCriteria.length, 16);
assert.ok(
  evalReport.technicalCriteria.every(
    (criterion) => criterion.status === "pass" && criterion.explanation,
  ),
);
assert.equal(evalReport.blindCriteria.length, 7);
assert.ok(evalReport.blindCriteria.every((criterion) => criterion.status === "scored" && criterion.rating === 3));
const delivery = JSON.parse(
  readFileSync(`${evidenceRoot}/delivery.json`, "utf8"),
) as {
  status: string;
  finalVideo: { path: string; sha256: string };
  eval: { grade: string; score: number; status: string };
};
assert.equal(delivery.status, "ready");
assert.equal(delivery.eval.grade, "B");
assert.equal(delivery.eval.score, 85);
assert.equal(delivery.eval.status, "pass");
assert.equal(delivery.finalVideo.path, "final.mp4");
assert.match(delivery.finalVideo.sha256, /^[0-9a-f]{64}$/);

assert.ok(profile?.handoff);
assert.equal(profile.version, "0.10.0");
assert.equal(profile.technicalHref, "/format-lab/character-dance-lab");
assert.equal(
  profile.handoff.output,
  "One 47-second vertical MP4 plus a quality report",
);
assert.equal(
  profile.repositoryHref,
  "/format-repositories/bikini-bottom-dance-off-v1/downloads/wiggly-bikini-bottom-dance-off-format-kit.zip",
);
assert.equal(profile.proofEntries.length, 1);
assert.equal(existsSync(download), true);
const kitRoot = "wiggly-bikini-bottom-dance-off-format-kit";
const zipEntries = execFileSync("unzip", ["-Z1", download], { encoding: "utf8" });
for (const entry of [
  "AGENTS.md",
  "CLAUDE.md",
  ".cursor/rules/wiggly-format.mdc",
  "verify-entrypoints.mjs",
  "KIT-MANIFEST.json",
  "bikini-bottom-dance-off-v1/SKILL.md",
]) {
  assert.match(zipEntries, new RegExp(`${kitRoot}/${entry.replaceAll(".", "\\.")}`));
}
const archivedManifest = JSON.parse(
  execFileSync("unzip", ["-p", download, `${kitRoot}/KIT-MANIFEST.json`], {
    encoding: "utf8",
  }),
) as { formatVersion: string };
assert.equal(archivedManifest.formatVersion, "0.10.0");
const archivedAgents = execFileSync(
  "unzip",
  ["-p", download, `${kitRoot}/AGENTS.md`],
  { encoding: "utf8" },
);
assert.match(archivedAgents, /bikini-bottom-dance-off-v1\/SKILL\.md/);
assert.match(archivedAgents, /exact resolved version/);
assert.match(archivedAgents, /Codex, Antigravity app and CLI, and GitHub Copilot/);
const prompt = buildDiscoveryHandoffPrompt(
  profile,
  "https://wiggly.agentenamel.com",
);
assert.match(
  prompt,
  /Runnable Repo: https:\/\/wiggly\.agentenamel\.com\/format-repositories\/bikini-bottom-dance-off-v1\/downloads/,
);
assert.match(prompt, /root agent instructions/);
assert.match(prompt, /KIT-MANIFEST\.json/);
assert.match(prompt, /latest published Wiggly Format/);
assert.ok(prompt.startsWith("CODING AGENT REQUIRED:"));
assert.match(prompt, /do not analyze or simulate/);
assert.match(prompt, /Reply only: "Open this in Codex, Claude Code, Antigravity, Cursor, or Copilot CLI\."/);
assert.match(prompt, /return its defined deliverables/);
assert.doesNotMatch(prompt, /Exact public version: 0\.10\.0/);
assert.doesNotMatch(prompt, /Required inputs:|Format instructions:|Working rules:/);
assert.ok(prompt.length < 1000);

const shelf = groupDiscoveryEntriesByShelf(getPublishedDiscoveryEntries()).find(
  (candidate) => candidate.id === "character-dance-offs",
);
assert.ok(
  shelf?.entries.some(
    (entry) => entry.format.slug === "bikini-bottom-dance-off",
  ),
);
assert.equal(
  groupDiscoveryEntriesByShelf(getPublishedDiscoveryEntries())
    .find((candidate) => candidate.id === "character-explainers")
    ?.entries.some((entry) => entry.format.slug === "bikini-bottom-dance-off"),
  false,
  "Dance Off should not be mixed into the explainer shelf.",
);

const consumerRoute = readFileSync("app/formats/[slug]/page.tsx", "utf8");
const connectionsComponent = readFileSync(
  "features/discovery/BikiniBottomDanceOffConnections.tsx",
  "utf8",
);
const runSummaryComponent = readFileSync(
  "features/discovery/BikiniBottomDanceOffRunSummary.tsx",
  "utf8",
);
const includedAssetsComponent = readFileSync(
  "features/discovery/BikiniBottomDanceOffIncludedAssets.tsx",
  "utf8",
);
const trustComponent = readFileSync(
  "features/discovery/BikiniBottomDanceOffTrust.tsx",
  "utf8",
);
const trustStyles = readFileSync(
  "features/discovery/BikiniBottomDanceOffTrust.module.css",
  "utf8",
);
const convexProvider = readFileSync("app/ConvexClientProvider.tsx", "utf8");
assert.match(consumerRoute, /Download runnable Repo/);
assert.match(consumerRoute, /format\.repositoryHref/);
assert.match(consumerRoute, /BikiniBottomDanceOffTrust/);
assert.match(
  consumerRoute,
  /<BikiniBottomDanceOffConnections data=\{danceOffTrust\} \/>/,
);
assert.match(
  consumerRoute,
  /<BikiniBottomDanceOffRunSummary format=\{format\} \/>/,
);
assert.match(
  consumerRoute,
  /<BikiniBottomDanceOffIncludedAssets data=\{danceOffTrust\} \/>/,
);
assert.ok(
  consumerRoute.indexOf("<BikiniBottomDanceOffRunSummary") <
    consumerRoute.indexOf("<BikiniBottomDanceOffIncludedAssets"),
  "Included assets should follow the short run summary.",
);
assert.ok(
  consumerRoute.indexOf("<BikiniBottomDanceOffIncludedAssets") <
    consumerRoute.indexOf("<BikiniBottomDanceOffTrust"),
  "Included assets should appear before the proof and technical details.",
);
assert.doesNotMatch(consumerRoute, /variant="inline"/);
assert.match(consumerRoute, /slug === "bikini-bottom-dance-off"/);
assert.match(consumerRoute, /!danceOffTrust/);
assert.match(consumerRoute, /w-\[min\(100%-32px,980px\)\]/);
assert.match(consumerRoute, /md:grid-cols-\[1\.15fr_0\.85fr\]/);
assert.match(consumerRoute, /text-\[clamp\(42px,6vw,72px\)\]/);
assert.match(consumerRoute, /max-w-\[310px\]/);
assert.match(
  consumerRoute,
  /\{!danceOffTrust \? \(\s*<a\s+href="#proof"/,
  "Dance Off should not show the redundant hero proof button once proof is inline.",
);
assert.match(
  trustComponent,
  /videoRef\.current\.currentTime = annotation\.seconds/,
);
assert.match(trustComponent, /aria-pressed=\{activeAnnotation === index\}/);
assert.match(trustComponent, /02 · Finished example/);
assert.match(trustComponent, /Watch the final video\./);
assert.doesNotMatch(trustComponent, /Proof explained|See it work\.|\u2014/);
assert.match(trustComponent, /How your finished video is graded\./);
assert.match(trustComponent, /The blind judge scores seven things/);
assert.match(trustComponent, /Archived visual\/caption-assisted pilot/);
assert.match(trustComponent, /requires direct moving-video and audio perception/);
assert.doesNotMatch(trustComponent, /One job\. Six transformations\./);
assert.doesNotMatch(trustComponent, /The real proof, annotated\./);
assert.doesNotMatch(trustComponent, /What the Repo refuses to ship\./);
assert.match(trustComponent, /<section id="how-it-works"/);
assert.match(trustComponent, /id="proof"/);
assert.doesNotMatch(trustComponent, /Inside this Format/);
assert.doesNotMatch(trustComponent, /How this Format works\./);
assert.doesNotMatch(trustComponent, /Follow the workflow/);
assert.doesNotMatch(trustComponent, /Format system sections/);
assert.match(trustComponent, /Open proof report/);
assert.match(trustComponent, /Open quality\.json/);
assert.match(trustComponent, /The assembly line/);
assert.match(
  trustComponent,
  /Song analysis → Dance plan → Voice lines → Render → Deliver/,
);
assert.match(trustComponent, /Finds the beat, the best excerpt, and exact timing\./);
assert.match(trustComponent, /Waits for your approval/);
assert.match(trustComponent, /Waits for your review/);
assert.match(trustComponent, /Free tier/);
assert.match(trustComponent, /What the coding agent runs/);
assert.match(trustComponent, /Exact Dance Off runtime commands/);
assert.match(trustComponent, /npm run list-motions/);
assert.match(
  trustComponent,
  /node runner\.mjs render --run=<id> --approve-provider/,
);
assert.match(
  trustComponent,
  /node runner\.mjs finalize --run=<id> --review=<review\.json>/,
);
assert.doesNotMatch(trustComponent, /FlowStation|Brief enters|Timed scene map/);
assert.doesNotMatch(trustComponent, /One request moves straight to a finished Reel\./);
assert.match(trustComponent, /className=\{styles\.fileCount\}/);
assert.doesNotMatch(trustComponent, /styles\.repoSummary/);
assert.doesNotMatch(trustComponent, /styles\.fileIcon/);
assert.doesNotMatch(trustComponent, /onClick=\{\(\) => revealSource\("SKILL\.md"\)\}/);
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
assert.match(runSummaryComponent, /Make your Dance Off\./);
assert.match(
  runSummaryComponent,
  /Add one song and optionally choose the dances or dialogue\.[\s\S]*The\s+agent handles everything else\./,
);
assert.match(runSummaryComponent, /label="You provide">One song/);
assert.match(
  runSummaryComponent,
  /label="You get">\{format\.handoff\.output\}/,
);
assert.match(runSummaryComponent, /label="Usually ready">12–30 minutes/);
assert.match(runSummaryComponent, /max-w-\[980px\]/);
assert.match(runSummaryComponent, /min-\[701px\]:grid-cols-3/);
assert.doesNotMatch(runSummaryComponent, /shadow-\[5px_5px_0_#080817\]/);
assert.match(includedAssetsComponent, /The cast, stages, and moves\./);
assert.doesNotMatch(includedAssetsComponent, /already inside/);
assert.doesNotMatch(includedAssetsComponent, /Production-ready Repo assets/);
assert.match(includedAssetsComponent, /DiscoveryCharacterModelViewer/);
assert.match(includedAssetsComponent, /Drag to inspect in 3D/);
assert.doesNotMatch(includedAssetsComponent, /Included in Repo/);
assert.match(includedAssetsComponent, />\s*3D model\s*</);
assert.match(includedAssetsComponent, /1 fixed character stage/);
assert.match(includedAssetsComponent, /aria-pressed=\{isSelected\}/);
assert.doesNotMatch(includedAssetsComponent, /No Mixamo download required/);
assert.doesNotMatch(includedAssetsComponent, /createElement\("model-viewer"/);
assert.doesNotMatch(includedAssetsComponent, /ColladaLoader|WebGLRenderer|iframe/);
assert.equal(
  (runSummaryComponent.match(/<DiscoveryFormatHandoff/g) ?? []).length,
  1,
  "The run summary should have one clear Send to Coding Agent action.",
);
assert.doesNotMatch(runSummaryComponent, /checked episode plan/i);
assert.doesNotMatch(runSummaryComponent, /preview contact sheet/i);
assert.doesNotMatch(runSummaryComponent, /Final output/);
assert.doesNotMatch(runSummaryComponent, /format\.handoff\.estimates\.map/);
assert.doesNotMatch(runSummaryComponent, /validated episode input/);
assert.doesNotMatch(runSummaryComponent, /provider cost/);
assert.doesNotMatch(runSummaryComponent, /A-F eval/);
assert.match(consumerRoute, /Ready to make one\?/);
assert.match(
  consumerRoute,
  /The requirements, timing, and exact Repo files are already\s+above\./,
);
assert.match(
  consumerRoute,
  /danceOffTrust && format\.handoff \? \([\s\S]*Ready to make one\?[\s\S]*\) : \(/,
  "Dance Off should end with a compact CTA instead of repeating the full run breakdown.",
);
assert.match(
  consumerRoute,
  /\{!danceOffTrust \? \([\s\S]*What stays the same[\s\S]*What changes[\s\S]*\) : null\}/,
  "Dance Off should omit the redundant fixed-versus-changeable wall of text.",
);

assert.match(trustStyles, /width: min\(100%, 980px\)/);
assert.match(
  trustStyles,
  /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/,
);
assert.doesNotMatch(trustStyles, /\.conveyor|\.machine|\.gateState/);
assert.match(trustStyles, /\.fileGroups \{\s*border-top: 1\.5px solid #080817/);
assert.match(trustStyles, /@media \(max-width: 700px\)/);
assert.doesNotMatch(trustStyles, /box-shadow: 7px 7px 0 #080817/);

const trustData = await getBikiniBottomDanceOffTrustData();
assert.equal(trustData.version, "0.10.0");
assert.deepEqual(trustData.stats, {
  motions: 25,
  backgrounds: 4,
  technicalGates: 16,
  blindCriteria: 7,
  rendererCount: 1,
});
assert.deepEqual(
  trustData.includedAssets.characters.map(({ id, label }) => ({ id, label })),
  [
    { id: "spongebob", label: "SpongeBob SquarePants" },
    { id: "patrick", label: "Patrick Star" },
    { id: "mr-krabs", label: "Mr. Krabs" },
    { id: "squilliam", label: "Squilliam Fancyson" },
  ],
);
assert.equal(
  trustData.includedAssets.performerStage.src,
  "/format-repositories/mixamo-character-motion-v1/assets/backgrounds/fish-news-underwater-studio.png",
);
assert.equal(trustData.includedAssets.backgrounds.length, 4);
assert.equal(trustData.includedAssets.defaultBackgroundId, "deep-ocean");
assert.deepEqual(trustData.includedAssets.motionLabels, [
  "Silly Dancing",
  "Runningman Hip Hop Dancing",
  "Macarena Dance",
  "Ymca Dance",
]);
for (const character of trustData.includedAssets.characters) {
  assert.equal(existsSync(`public${character.modelSrc}`), true);
  assert.equal(existsSync(`public${character.posterSrc}`), true);
  const previewModel = readFileSync(`public${character.modelSrc}`);
  assert.equal(previewModel.subarray(0, 4).toString("ascii"), "glTF");
  assert.ok(previewModel.byteLength > 250_000);
  assert.ok(statSync(`public${character.posterSrc}`).size > 30_000);
}
assert.equal(
  existsSync(
    "public/discovery/bikini-bottom-dance-off/character-previews/provenance.json",
  ),
  true,
);
for (const background of trustData.includedAssets.backgrounds) {
  assert.equal(existsSync(`public${background.src}`), true);
}
assert.equal(
  existsSync(`public${trustData.includedAssets.performerStage.src}`),
  true,
);
assert.deepEqual(
  trustData.annotations.map((annotation) => annotation.timeLabel),
  ["00:04", "00:34", "00:43", "00:46"],
);
assert.deepEqual(
  trustData.annotations.map((annotation) => annotation.title),
  [
    "Each character gets a full solo.",
    "All four characters keep moving.",
    "All four deliver the closing line.",
    "The ending deliberately creates the replay.",
  ],
);
assert.equal(trustData.proof.grade, "B");
assert.equal(trustData.proof.score, 85);
assert.equal(trustData.proof.rubricVersion, "1.0.0");
assert.equal(trustData.grading.rubricVersion, "1.1.1");
assert.equal(trustData.requirements.providers[0]?.name, "Fish Audio");
assert.deepEqual(trustData.requirements.environmentVariables, [
  "FISH_STUDIO_APIKEY",
  "SQUILLIAM_VOICE_ID",
]);
assert.equal(
  trustData.commands.includes(
    "npm run render -- --run=episode-01 --approve-provider",
  ),
  true,
);
assert.equal(
  trustData.commands.includes(
    "npm run finalize -- --run=episode-01 --review=/absolute/path/to/blind-review.json --second-review=/absolute/path/to/second-review.json",
  ),
  true,
);
assert.equal(
  trustData.fileGroups
    .flatMap((group) => group.files)
    .some((file) => file.path === "PROOF-REPORT.md"),
  true,
);
assert.equal(
  trustData.fileGroups
    .flatMap((group) => group.files)
    .some((file) => file.path === "CALIBRATION-REPORT.md"),
  true,
);

const starterManifest = JSON.parse(
  readFileSync(
    `${repositoryRoot}/../mixamo-character-motion-v1/assets/motions/manifest.json`,
    "utf8",
  ),
) as { motions: unknown[] };
assert.equal(starterManifest.motions.length, 25);
const motionRunner = readFileSync(
  `${repositoryRoot}/../mixamo-character-motion-v1/runner.mjs`,
  "utf8",
);
assert.match(motionRunner, /user-motions/);
assert.match(motionRunner, /loadMotionCatalog/);

console.log("Bikini Bottom Dance Off Discover page tests passed.");
