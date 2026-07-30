import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
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
  /\bin conclusion\b/i,
  /\bat the end of the day\b/i,
];

const PROMPT_INJECTION = [
  /reveal (?:the )?(?:system prompt|hidden instructions?|secrets?)/i,
  /you are now (?:the|a) /i,
  /(?:^|\n)\s*(?:system|developer|assistant)\s+(?:message|prompt|instructions?)\s*:/im,
  /\b(?:upload|send|transmit|exfiltrate)\b[^.\n]{0,100}\b(?:input data|source data|system prompt|hidden instructions?|secrets?)\b/i,
  /\b(?:ignore|override|disregard)\b[^.\n]{0,60}\b(?:instructions?|prompt|rules?)\b/i,
];

const TOPIC_STOP_WORDS = new Set(
  "about after and company different from have make that the their this what when where which with".split(" "),
);

const FACT_SIGNAL_PATTERN = /\b(?:\d[\d,.]*%?|guarantee(?:d|s)?|overnight|same[- ]day|next[- ]day|free shipping|award(?:ed)?|certified|fastest|cheapest)\b/gi;
const FACT_STOP_WORDS = new Set(
  "about after also and are because been before brand can company every for from have into its more that the their them this today was were when where which with would your".split(" "),
);

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

async function contentHashesInDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const hashes = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return contentHashesInDirectory(entryPath);
    if (entry.isFile()) return [contentHash(await readFile(entryPath))];
    return [];
  }));
  return hashes.flat();
}

async function assertCustomerSample(samplePath, content) {
  const testDirectories = ["fixtures", "goldens", "comparisons"]
    .map((name) => path.join(packageRoot, name));
  if (testDirectories.some((directory) => {
    const relative = path.relative(directory, samplePath);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  })) {
    throw new Error(
      "Bundled fixtures, goldens, and comparisons are test-only. Ask the user for their newsletter files.",
    );
  }
  const bundledTestHashes = new Set(
    (await Promise.all(testDirectories.map(contentHashesInDirectory))).flat(),
  );
  if (bundledTestHashes.has(contentHash(content))) {
    throw new Error(
      "Bundled fixtures, goldens, and comparisons are test-only. Ask the user for their newsletter files.",
    );
  }
}

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const contentHash = (value) => createHash("sha256").update(value).digest("hex");
const words = (value) => value.trim().split(/\s+/).filter(Boolean);
const normalizedTerms = (value) => value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
const websiteVoiceSamples = (sources) => sources.websiteVoiceSamples ?? [];
const sourceIds = (sources) => new Set([
  ...sources.websiteFacts.map((fact) => fact.id),
  ...websiteVoiceSamples(sources).map((sample) => sample.id),
  ...sources.newsletterSamples.map((sample) => sample.id),
]);
const sourceTextById = (sources) => new Map([
  ...sources.websiteFacts.map((fact) => [fact.id, fact.claim]),
  ...websiteVoiceSamples(sources).map((sample) => [sample.id, sample.content]),
  ...sources.newsletterSamples.map((sample) => [sample.id, sample.content]),
]);

function voiceSources(sources) {
  if (sources.newsletterSamples.length) {
    return {
      basis: "newsletter-samples",
      items: sources.newsletterSamples,
    };
  }
  if (websiteVoiceSamples(sources).length) {
    return {
      basis: "website-language",
      items: websiteVoiceSamples(sources),
    };
  }
  return {
    basis: "facts-only",
    items: sources.websiteFacts,
  };
}

function containsPromptInjection(value) {
  return PROMPT_INJECTION.some((pattern) => pattern.test(value));
}

function addressesTopic(body, topic) {
  const bodyTerms = new Set(normalizedTerms(body));
  const allTopicTerms = normalizedTerms(topic);
  const usefulTopicTerms = allTopicTerms.filter(
    (term) => term.length >= 4 && !TOPIC_STOP_WORDS.has(term),
  );
  const topicTerms = usefulTopicTerms.length ? usefulTopicTerms : allTopicTerms;
  const requiredMatches = Math.min(2, topicTerms.length);
  return requiredMatches > 0
    && topicTerms.filter((term) => bodyTerms.has(term)).length >= requiredMatches;
}

function sensitiveFactSignals(value) {
  return (value.match(FACT_SIGNAL_PATTERN) ?? [])
    .map((signal) => signal.toLowerCase().replace(/[-,\s]/g, ""));
}

function meaningfulTerms(value) {
  return normalizedTerms(value).filter(
    (term) => term.length >= 4 && !FACT_STOP_WORDS.has(term),
  );
}

function unsupportedFactSignals(paragraph, citedClaims) {
  const paragraphTerms = new Set(meaningfulTerms(paragraph));
  return sensitiveFactSignals(paragraph).filter((signal) => !citedClaims.some((claim) => {
    const normalizedClaim = claim.toLowerCase().replace(/[-,\s]/g, "");
    if (!normalizedClaim.includes(signal)) return false;
    const sharedTerms = meaningfulTerms(claim).filter((term) => paragraphTerms.has(term));
    return sharedTerms.length >= 2;
  }));
}

function validateSources(sources) {
  const errors = [];
  if (!sources.companyName?.trim()) errors.push("Company name is missing.");
  try {
    new URL(sources.brandUrl);
  } catch {
    errors.push("Brand URL is invalid.");
  }
  if (
    !Array.isArray(sources.websiteFacts)
    || !Array.isArray(sources.newsletterSamples)
    || (sources.websiteVoiceSamples !== undefined && !Array.isArray(sources.websiteVoiceSamples))
  ) {
    return [...errors, "Sources must include websiteFacts and newsletterSamples arrays; websiteVoiceSamples is optional."];
  }
  if (!sources.websiteFacts.length && !websiteVoiceSamples(sources).length && !sources.newsletterSamples.length) {
    errors.push("Add website facts, website language, or newsletter samples before building a voice profile.");
  }
  if (sources.newsletterSamples.length > 5) errors.push("Use at most five newsletter samples.");
  for (const fact of sources.websiteFacts) {
    if (!fact.id?.trim() || !fact.claim?.trim() || !fact.sourceUrl?.trim()) {
      errors.push("Every website fact needs id, claim, and sourceUrl.");
      continue;
    }
    if (containsPromptInjection(fact.claim)) errors.push(`Website fact ${fact.id} looks like page instructions.`);
  }
  for (const sample of websiteVoiceSamples(sources)) {
    if (!sample.id?.trim() || !sample.label?.trim() || !sample.content?.trim() || !sample.sourceUrl?.trim()) {
      errors.push("Every website voice sample needs id, label, content, and sourceUrl.");
      continue;
    }
    if (containsPromptInjection(sample.content)) {
      errors.push(`Website voice sample ${sample.id} looks like page instructions.`);
    }
  }
  for (const sample of sources.newsletterSamples) {
    if (!sample.id?.trim() || !sample.label?.trim() || !sample.content?.trim() || !sample.sha256?.trim()) {
      errors.push("Every newsletter sample needs id, label, content, and sha256.");
      continue;
    }
    if (words(sample.content).length < 40) errors.push(`Newsletter sample ${sample.id} is too short.`);
    if (sample.sha256 !== contentHash(sample.content)) {
      errors.push(`Newsletter sample ${sample.id} does not match its sha256 provenance hash.`);
    }
    if (containsPromptInjection(sample.content)) {
      errors.push(`Newsletter sample ${sample.id} looks like embedded instructions.`);
    }
  }
  if (
    sourceIds(sources).size
    !== sources.websiteFacts.length + websiteVoiceSamples(sources).length + sources.newsletterSamples.length
  ) {
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
    "voiceBasis",
  ];
  for (const field of requiredStrings) {
    if (!profile[field]?.trim()) errors.push(`Brand profile ${field} is missing.`);
  }
  if (!["low", "medium", "high"].includes(profile.confidence)) {
    errors.push("Brand profile confidence must be low, medium, or high.");
  }
  const expectedVoice = voiceSources(sources);
  if (profile.voiceBasis !== expectedVoice.basis) {
    errors.push(`Brand profile voiceBasis must be ${expectedVoice.basis}.`);
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
  const allowed = new Set(expectedVoice.items.map((item) => item.id));
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
  for (const phrase of profile.signaturePhrases ?? []) {
    if (
      phrase?.trim()
      && !expectedVoice.items.some((item) => (
        sourceText.get(item.id)?.toLowerCase().includes(phrase.trim().toLowerCase())
      ))
    ) {
      errors.push(`Signature phrase was not found in allowed voice evidence: ${phrase}.`);
    }
  }
  if (!sources.newsletterSamples.length && profile.confidence !== "low") {
    errors.push("A profile without past newsletters must use low confidence.");
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
  if (targetLength === "short") return [50, 240];
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
  if (!addressesTopic(body, brief.topic)) {
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
  const sourceText = sourceTextById(sources);
  if (!Array.isArray(newsletter.factsUsed) || newsletter.factsUsed.length < 1) {
    errors.push("Newsletter must list at least one grounded fact.");
  }
  for (const fact of newsletter.factsUsed ?? []) {
    if (!fact.claim?.trim() || !allowed.has(fact.sourceId)) {
      errors.push("Every grounded fact needs a claim and valid sourceId.");
    } else {
      const citedText = sourceText.get(fact.sourceId)?.toLowerCase() ?? "";
      const claim = fact.claim.trim().toLowerCase();
      const websiteFact = sources.websiteFacts.find((item) => item.id === fact.sourceId);
      if (websiteFact ? claim !== citedText : !citedText.includes(claim)) {
        errors.push(`Grounded fact must preserve the exact cited evidence snapshot: ${fact.sourceId}.`);
      }
    }
  }
  const citedClaims = (newsletter.factsUsed ?? [])
    .map((fact) => fact.claim?.trim())
    .filter(Boolean);
  for (const paragraph of body.split(/\n{2,}/)) {
    const unsupported = unsupportedFactSignals(paragraph, citedClaims);
    if (unsupported.length) {
      errors.push(`Sensitive factual claim is not supported by cited facts: ${unsupported.join(", ")}.`);
    }
  }
  if (!Array.isArray(newsletter.voiceEvidence) || newsletter.voiceEvidence.length < 2) {
    errors.push("Newsletter must cite at least two voice decisions.");
  }
  const expectedVoice = voiceSources(sources);
  const voiceSourceIds = new Set(expectedVoice.items.map((sample) => sample.id));
  for (const item of newsletter.voiceEvidence ?? []) {
    if (!item.choice?.trim() || !allowed.has(item.sourceId)) {
      errors.push("Every voice decision needs a choice and valid sourceId.");
    } else if (!voiceSourceIds.has(item.sourceId)) {
      errors.push(`Voice decisions must cite ${expectedVoice.basis} evidence.`);
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
  const brandUrl = argument("brand-url") ?? "customer-provided://no-website";
  new URL(brandUrl);
  const directory = runDirectory(runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  const samplePaths = (argument("samples") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (samplePaths.length > 5) throw new Error("Use at most five newsletter samples.");
  const newsletterSamples = [];
  for (const [index, samplePath] of samplePaths.entries()) {
    const resolvedSamplePath = await realpath(path.resolve(samplePath));
    const content = await readFile(resolvedSamplePath, "utf8");
    await assertCustomerSample(resolvedSamplePath, content);
    newsletterSamples.push({
      id: `newsletter-${index + 1}`,
      label: path.basename(samplePath),
      content,
    });
    newsletterSamples.at(-1).sha256 = contentHash(newsletterSamples.at(-1).content);
  }
  await mkdir(directory, { recursive: true });
  await writeJson(path.join(directory, "sources.json"), {
    companyName: argument("company") ?? "",
    brandUrl,
    websiteFacts: [],
    websiteVoiceSamples: [],
    newsletterSamples,
  });
  await writeJson(path.join(directory, "state.json"), {
    id: runId,
    status: "sources",
    createdAt: new Date().toISOString(),
  });
  console.log(`Step 1 of 4: Learn voice - created ${path.relative(v3Root, directory)}.`);
  console.log("Fill companyName and grounded facts in sources.json, then build the profile prompt.");
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
    "profile-ready": "Ask what this newsletter should be about, capture the complete current brief, then run brief.",
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
