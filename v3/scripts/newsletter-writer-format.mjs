import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const packageRoot = path.join(v3Root, "public", "format-repositories", "newsletter-writer-v1");

const GENERIC_PATTERNS = [
  /\bin today['’]s fast[- ]paced\b/i,
  /\bi hope this email finds you well\b/i,
  /\bdelve into\b/i,
  /\bgame[- ]changing\b/i,
  /\bunlock (?:the|your) (?:power|potential)\b/i,
  /\brevolutioni[sz]e\b/i,
  /\bit is important to note\b/i,
  /\bwithout further ado\b/i,
];

const PROMPT_INJECTION = [
  /ignore (?:all |any )?(?:previous|prior|earlier) instructions?/i,
  /disregard (?:all |any )?(?:previous|prior|earlier) (?:instructions?|directions?)/i,
  /reveal (?:the )?(?:system prompt|hidden instructions?|secrets?)/i,
  /you are now (?:the|a) /i,
];

function argument(name) {
  const inline = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function requiredArgument(name) {
  const value = argument(name);
  if (!value) throw new Error(`--${name} is required.`);
  return value;
}

function runsRoot() {
  return argument("runs-root")
    ? path.resolve(argument("runs-root"))
    : path.join(packageRoot, "agent-runs");
}

function runDirectory(runId) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(runId)) {
    throw new Error("Run id must use lowercase letters, numbers, and hyphens.");
  }
  return path.join(runsRoot(), runId);
}

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const words = (value) => value.trim().split(/\s+/).filter(Boolean);
const sourceIds = (sources) => new Set([
  ...sources.websiteFacts.map((fact) => fact.id),
  ...sources.newsletterSamples.map((sample) => sample.id),
]);
const sourceTextById = (sources) => new Map([
  ...sources.websiteFacts.map((fact) => [fact.id, fact.claim]),
  ...sources.newsletterSamples.map((sample) => [sample.id, sample.content]),
]);

function containsPromptInjection(value) {
  return PROMPT_INJECTION.some((pattern) => pattern.test(value));
}

function validateSources(sources) {
  const errors = [];
  if (!sources.companyName?.trim()) errors.push("Company name is missing.");
  try {
    new URL(sources.brandUrl);
  } catch {
    errors.push("Brand URL is invalid.");
  }
  if (!Array.isArray(sources.websiteFacts) || !Array.isArray(sources.newsletterSamples)) {
    return [...errors, "Sources must include websiteFacts and newsletterSamples arrays."];
  }
  if (!sources.websiteFacts.length && !sources.newsletterSamples.length) {
    errors.push("Add website facts or newsletter samples before building a voice profile.");
  }
  if (sources.newsletterSamples.length > 5) errors.push("Use at most five newsletter samples.");
  for (const fact of sources.websiteFacts) {
    if (!fact.id?.trim() || !fact.claim?.trim() || !fact.sourceUrl?.trim()) {
      errors.push("Every website fact needs id, claim, and sourceUrl.");
      continue;
    }
    if (containsPromptInjection(fact.claim)) errors.push(`Website fact ${fact.id} looks like page instructions.`);
  }
  for (const sample of sources.newsletterSamples) {
    if (!sample.id?.trim() || !sample.label?.trim() || !sample.content?.trim()) {
      errors.push("Every newsletter sample needs id, label, and content.");
      continue;
    }
    if (words(sample.content).length < 40) errors.push(`Newsletter sample ${sample.id} is too short.`);
  }
  if (sourceIds(sources).size !== sources.websiteFacts.length + sources.newsletterSamples.length) {
    errors.push("Source ids must be unique.");
  }
  return errors;
}

function validateProfile(profile, sources) {
  const errors = [];
  const requiredStrings = [
    "companyName",
    "brandUrl",
    "voiceSummary",
    "audience",
    "confidence",
  ];
  for (const field of requiredStrings) {
    if (!profile[field]?.trim()) errors.push(`Brand profile ${field} is missing.`);
  }
  if (!["low", "medium", "high"].includes(profile.confidence)) {
    errors.push("Brand profile confidence must be low, medium, or high.");
  }
  const rules = profile.rules ?? {};
  for (const field of [
    "register",
    "sentenceRhythm",
    "paragraphShape",
    "openingStyle",
    "transitionStyle",
    "punctuation",
    "vocabulary",
    "ctaStyle",
    "formatting",
  ]) {
    if (!rules[field]?.trim()) errors.push(`Brand profile rule ${field} is missing.`);
  }
  for (const field of ["mustDo", "neverDo", "domainTerms", "signaturePhrases", "evidence"]) {
    if (!Array.isArray(profile[field])) errors.push(`Brand profile ${field} must be an array.`);
  }
  if ((profile.mustDo?.length ?? 0) < 2) errors.push("Brand profile needs at least two must-do rules.");
  if ((profile.neverDo?.length ?? 0) < 2) errors.push("Brand profile needs at least two never-do rules.");
  if ((profile.evidence?.length ?? 0) < 2) errors.push("Brand profile needs at least two evidence-backed observations.");
  const allowed = sourceIds(sources);
  const sourceText = sourceTextById(sources);
  for (const item of profile.evidence ?? []) {
    if (!allowed.has(item.sourceId)) errors.push(`Unknown voice evidence source: ${item.sourceId}.`);
    if (!item.quote?.trim() || !item.lesson?.trim()) errors.push("Voice evidence needs a quote and lesson.");
    if (
      item.quote?.trim()
      && sourceText.has(item.sourceId)
      && !sourceText.get(item.sourceId).toLowerCase().includes(item.quote.trim().toLowerCase())
    ) {
      errors.push(`Voice evidence quote was not found in source: ${item.sourceId}.`);
    }
  }
  if (sources.newsletterSamples.length >= 3 && profile.confidence === "low") {
    errors.push("A profile built from three or more samples should not have low confidence.");
  }
  if (sources.newsletterSamples.length < 3 && profile.confidence === "high") {
    errors.push("High confidence requires at least three newsletter samples.");
  }
  return errors;
}

function wordRange(targetLength) {
  if (targetLength === "short") return [100, 260];
  if (targetLength === "long") return [400, 900];
  return [180, 520];
}

function validateNewsletter(newsletter, sources, brief) {
  const errors = [];
  if (!Array.isArray(newsletter.subjectLines) || newsletter.subjectLines.length !== 3) {
    errors.push("Newsletter must contain exactly three subject lines.");
  } else {
    const normalized = new Set();
    for (const subject of newsletter.subjectLines) {
      if (!subject.text?.trim() || !subject.angle?.trim()) errors.push("Every subject line needs text and angle.");
      const length = subject.text?.trim().length ?? 0;
      if (length < 8 || length > 80) errors.push("Subject lines must be 8-80 characters.");
      normalized.add(subject.text.trim().toLowerCase());
    }
    if (normalized.size !== 3) errors.push("Subject lines must be distinct.");
  }
  const previewLength = newsletter.previewText?.trim().length ?? 0;
  if (previewLength < 30 || previewLength > 160) errors.push("Preview text must be 30-160 characters.");
  const body = newsletter.body?.trim() ?? "";
  const [minimum, maximum] = wordRange(brief.targetLength);
  const bodyWords = words(body).length;
  if (bodyWords < minimum || bodyWords > maximum) {
    errors.push(`Newsletter body must be ${minimum}-${maximum} words for ${brief.targetLength} length.`);
  }
  if (!body.toLowerCase().includes(brief.topic.trim().split(/\s+/)[0].toLowerCase())) {
    errors.push("Newsletter body does not clearly address the approved topic.");
  }
  for (const pattern of GENERIC_PATTERNS) {
    if (pattern.test(body)) errors.push(`Newsletter contains generic AI phrasing: ${pattern}.`);
  }
  if (containsPromptInjection(body)) errors.push("Newsletter contains prompt-like instructions.");
  if (!newsletter.cta?.text?.trim()) errors.push("Newsletter CTA is missing.");
  if ((newsletter.cta?.text?.trim().length ?? 0) > 140) errors.push("Newsletter CTA is too long.");
  if (newsletter.cta?.url) {
    try {
      new URL(newsletter.cta.url);
    } catch {
      errors.push("Newsletter CTA URL is invalid.");
    }
  }
  const allowed = sourceIds(sources);
  if (!Array.isArray(newsletter.factsUsed) || newsletter.factsUsed.length < 1) {
    errors.push("Newsletter must list at least one grounded fact.");
  }
  for (const fact of newsletter.factsUsed ?? []) {
    if (!fact.claim?.trim() || !allowed.has(fact.sourceId)) {
      errors.push("Every grounded fact needs a claim and valid sourceId.");
    }
  }
  if (!Array.isArray(newsletter.voiceEvidence) || newsletter.voiceEvidence.length < 2) {
    errors.push("Newsletter must cite at least two voice decisions.");
  }
  const newsletterSourceIds = new Set(sources.newsletterSamples.map((sample) => sample.id));
  for (const item of newsletter.voiceEvidence ?? []) {
    if (!item.choice?.trim() || !allowed.has(item.sourceId)) {
      errors.push("Every voice decision needs a choice and valid sourceId.");
    } else if (newsletterSourceIds.size && !newsletterSourceIds.has(item.sourceId)) {
      errors.push("Voice decisions must cite past newsletters when samples are available.");
    }
  }
  return errors;
}

function newsletterMarkdown(newsletter) {
  return [
    "# Newsletter",
    "",
    "## Subject line options",
    "",
    ...newsletter.subjectLines.map((subject, index) => `${index + 1}. ${subject.text}`),
    "",
    "## Preview text",
    "",
    newsletter.previewText,
    "",
    "## Body",
    "",
    newsletter.body,
    "",
    "## CTA",
    "",
    newsletter.cta.url ? `[${newsletter.cta.text}](${newsletter.cta.url})` : newsletter.cta.text,
    "",
  ].join("\n");
}

async function loadRun(runId) {
  const directory = runDirectory(runId);
  return {
    directory,
    sources: await readJson(path.join(directory, "sources.json")),
    state: await readJson(path.join(directory, "state.json")),
  };
}

async function writeStagePrompt(directory, stage, payload) {
  const template = await readFile(path.join(packageRoot, "prompts", `${stage}.md`), "utf8");
  const output = path.join(directory, `${stage}-prompt.txt`);
  await writeFile(output, `${template.trim()}\n\n## INPUT DATA\n\n${JSON.stringify(payload, null, 2)}\n`);
  return output;
}

async function check() {
  console.log("Step 1 of 4: Learn voice - website facts plus up to five past newsletters.");
  console.log("Step 2 of 4: Brief - the user supplies the next newsletter topic.");
  console.log("Step 3 of 4: Write - subject lines, preview text, body, and CTA.");
  console.log("Step 4 of 4: Review - one fact-and-voice revision, then deliver.");
  console.log("No image, video, voice, Replicate, NVIDIA NIM, or Wiggly generation provider is called.");
}

async function estimate() {
  console.log("Run estimate");
  console.log("- First-time voice profile: host-agent reasoning, usually 3-6 min");
  console.log("- Each newsletter: host-agent drafting and one review, usually 2-5 min");
  console.log("- Wiggly provider cost: $0");
  console.log("- Separate image, video, voice, and rendering calls: none");
}

async function init() {
  const runId = requiredArgument("run");
  const brandUrl = requiredArgument("brand-url");
  new URL(brandUrl);
  const directory = runDirectory(runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  const samplePaths = (argument("samples") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (samplePaths.length > 5) throw new Error("Use at most five newsletter samples.");
  const newsletterSamples = [];
  for (const [index, samplePath] of samplePaths.entries()) {
    newsletterSamples.push({
      id: `newsletter-${index + 1}`,
      label: path.basename(samplePath),
      content: await readFile(path.resolve(samplePath), "utf8"),
    });
  }
  await mkdir(directory, { recursive: true });
  await writeJson(path.join(directory, "sources.json"), {
    companyName: argument("company") ?? "",
    brandUrl,
    websiteFacts: [],
    newsletterSamples,
  });
  await writeJson(path.join(directory, "state.json"), {
    id: runId,
    status: "sources",
    createdAt: new Date().toISOString(),
  });
  console.log(`Step 1 of 4: Learn voice - created ${path.relative(v3Root, directory)}.`);
  console.log("Research the website, fill companyName and websiteFacts in sources.json, then build the profile prompt.");
  console.log("No provider was called.");
}

async function profilePrompt() {
  const runId = requiredArgument("run");
  const { directory, sources, state } = await loadRun(runId);
  const errors = validateSources(sources);
  if (errors.length) throw new Error(errors.join("\n"));
  const output = await writeStagePrompt(directory, "voice-profile", { sources });
  state.status = "profile-prompted";
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 1 of 4: Learn voice - wrote ${path.relative(v3Root, output)}.`);
  console.log("Use this exact prompt yourself and save the JSON response as brand-profile.json.");
}

async function validateProfileCommand() {
  const runId = requiredArgument("run");
  const { directory, sources, state } = await loadRun(runId);
  const profile = await readJson(path.join(directory, "brand-profile.json"));
  const errors = [...validateSources(sources), ...validateProfile(profile, sources)];
  if (errors.length) throw new Error(errors.join("\n"));
  state.status = "profile-ready";
  state.profileHash = hash({ sources, profile });
  delete state.draftHash;
  delete state.finalHash;
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Step 1 of 4: Learn voice - brand profile is valid.");
}

async function brief() {
  const runId = requiredArgument("run");
  const { directory, state } = await loadRun(runId);
  if (!state.profileHash) throw new Error("Validate the brand profile first.");
  const targetLength = argument("length") ?? "standard";
  if (!["short", "standard", "long"].includes(targetLength)) {
    throw new Error("--length must be short, standard, or long.");
  }
  await writeJson(path.join(directory, "brief.json"), {
    topic: requiredArgument("topic"),
    goal: argument("goal") ?? "Teach one useful idea and drive one clear action.",
    audience: argument("audience") ?? "",
    offer: argument("offer") ?? "",
    ctaUrl: argument("cta-url") ?? "",
    targetLength,
  });
  state.status = "brief-ready";
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Step 2 of 4: Brief - newsletter topic and goal are saved.");
}

async function draftPrompt() {
  const runId = requiredArgument("run");
  const { directory, sources, state } = await loadRun(runId);
  const profile = await readJson(path.join(directory, "brand-profile.json"));
  const briefData = await readJson(path.join(directory, "brief.json"));
  if (state.profileHash !== hash({ sources, profile })) throw new Error("Sources or profile changed. Validate the profile again.");
  const output = await writeStagePrompt(directory, "draft", { sources, profile, brief: briefData });
  state.status = "draft-prompted";
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 3 of 4: Write - wrote ${path.relative(v3Root, output)}.`);
  console.log("Use this exact prompt yourself and save the JSON response as draft.json.");
}

async function validateDraft() {
  const runId = requiredArgument("run");
  const { directory, sources, state } = await loadRun(runId);
  const profile = await readJson(path.join(directory, "brand-profile.json"));
  const briefData = await readJson(path.join(directory, "brief.json"));
  const draft = await readJson(path.join(directory, "draft.json"));
  const errors = validateNewsletter(draft, sources, briefData);
  if (errors.length) throw new Error(errors.join("\n"));
  state.status = "draft-ready";
  state.draftHash = hash({ sources, profile, brief: briefData, draft });
  delete state.finalHash;
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Step 3 of 4: Write - newsletter draft is valid.");
}

async function reviewPrompt() {
  const runId = requiredArgument("run");
  const { directory, sources, state } = await loadRun(runId);
  const profile = await readJson(path.join(directory, "brand-profile.json"));
  const briefData = await readJson(path.join(directory, "brief.json"));
  const draft = await readJson(path.join(directory, "draft.json"));
  if (state.draftHash !== hash({ sources, profile, brief: briefData, draft })) {
    throw new Error("Draft inputs changed. Validate the draft again.");
  }
  const output = await writeStagePrompt(directory, "review", {
    sources,
    profile,
    brief: briefData,
    draft,
  });
  state.status = "review-prompted";
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 4 of 4: Review - wrote ${path.relative(v3Root, output)}.`);
  console.log("Use this exact prompt yourself and save the JSON response as final.json.");
}

async function validateFinal() {
  const runId = requiredArgument("run");
  const { directory, sources, state } = await loadRun(runId);
  const profile = await readJson(path.join(directory, "brand-profile.json"));
  const briefData = await readJson(path.join(directory, "brief.json"));
  const draft = await readJson(path.join(directory, "draft.json"));
  const final = await readJson(path.join(directory, "final.json"));
  if (state.draftHash !== hash({ sources, profile, brief: briefData, draft })) {
    throw new Error("Draft inputs changed. Validate and review again.");
  }
  const errors = validateNewsletter(final, sources, briefData);
  if (errors.length) throw new Error(errors.join("\n"));
  await writeFile(path.join(directory, "newsletter.md"), newsletterMarkdown(final));
  state.status = "reviewed";
  state.finalHash = hash({ sources, profile, brief: briefData, draft, final });
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Step 4 of 4: Review - final newsletter is valid and newsletter.md is ready.");
}

async function finalize() {
  const runId = requiredArgument("run");
  const { directory, sources, state } = await loadRun(runId);
  if (!hasFlag("approve-final")) throw new Error("Use --approve-final only after reading newsletter.md.");
  const profile = await readJson(path.join(directory, "brand-profile.json"));
  const briefData = await readJson(path.join(directory, "brief.json"));
  const draft = await readJson(path.join(directory, "draft.json"));
  const final = await readJson(path.join(directory, "final.json"));
  if (state.status !== "reviewed" || state.finalHash !== hash({ sources, profile, brief: briefData, draft, final })) {
    throw new Error("Validate the latest final newsletter before approval.");
  }
  state.status = "finalized";
  state.finalizedAt = new Date().toISOString();
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Newsletter finalized.");
  console.log(`Deliver ${path.join(directory, "newsletter.md")}.`);
}

async function resume() {
  const runId = requiredArgument("run");
  const { directory, state } = await loadRun(runId);
  console.log(JSON.stringify({ run: runId, directory, status: state.status }, null, 2));
  const next = {
    sources: "Fill sources.json, then run profile-prompt.",
    "profile-prompted": "Save brand-profile.json, then run validate-profile.",
    "profile-ready": "Run brief with the next newsletter topic.",
    "brief-ready": "Run draft-prompt.",
    "draft-prompted": "Save draft.json, then run validate-draft.",
    "draft-ready": "Run review-prompt.",
    "review-prompted": "Save final.json, then run validate-final.",
    reviewed: "Read newsletter.md, then finalize with --approve-final.",
    finalized: "The newsletter is complete.",
  };
  console.log(`Next: ${next[state.status] ?? "Inspect the run files."}`);
}

const commands = {
  check,
  estimate,
  init,
  "profile-prompt": profilePrompt,
  "validate-profile": validateProfileCommand,
  brief,
  "draft-prompt": draftPrompt,
  "validate-draft": validateDraft,
  "review-prompt": reviewPrompt,
  "validate-final": validateFinal,
  finalize,
  resume,
};

export {
  GENERIC_PATTERNS,
  newsletterMarkdown,
  validateNewsletter,
  validateProfile,
  validateSources,
};

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const command = process.argv[2];
  if (!commands[command]) {
    console.error(`Unknown command: ${command ?? "(missing)"}`);
    console.error(`Use one of: ${Object.keys(commands).join(", ")}`);
    process.exitCode = 1;
  } else {
    await commands[command]();
  }
}
