import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { DiscoveryFormatProfile } from "./types";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
const items = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
const string = (value: unknown): string =>
  typeof value === "string" ? value : "";
const strings = (value: unknown) => items(value).map(string).filter(Boolean);
const repoLabel = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());

export type RepoPackageAsset = {
  label: string;
  description: string;
  href: string;
  image: boolean;
};
export type FormatRepoPackageData = {
  services: { name: string; purpose: string; keys: string[]; model: string }[];
  tools: string[];
  notes: string[];
  assets: RepoPackageAsset[];
  workflow: {
    title: string;
    description: string;
    approval: boolean;
    provider: boolean;
  }[];
  workflowSource: string;
  quality: { title: string; checks: string[] }[];
  proof: {
    purpose: string;
    notes: string[];
    contactSheet?: string;
    examples: {
      title: string;
      role: string;
      strengths: string[];
      weaknesses: string[];
    }[];
  };
  files: { name: string; href: string; content: string }[];
};

const providerNames: Record<string, string> = {
  NVIDIA_NIM_API_KEY: "NVIDIA NIM",
  REPLICATE_API_TOKEN: "Replicate",
  FISH_STUDIO_APIKEY: "Fish Audio",
  ELEVENLABS_API_KEY: "ElevenLabs",
  GEMINI_API_KEY: "Google Gemini",
  SERPER_API_KEY: "Serper",
  DEEPGRAM_API_KEY: "Deepgram",
};

/** Presentation reads the published contracts; it never runs or rewrites a kit. */
export function getFormatRepoPackageData(
  format: DiscoveryFormatProfile,
): FormatRepoPackageData | null {
  if (!format.packagePath) return null;
  const publicRoot = path.join(process.cwd(), "public");
  const root = path.join(publicRoot, "format-repositories", path.basename(format.packagePath));
  const read = (file: string) =>
    JSON.parse(readFileSync(path.join(root, file), "utf8")) as unknown;
  const optional = (file: string) =>
    existsSync(path.join(root, file)) ? record(read(file)) : {};
  const requirements = record(read("requirements.json"));
  const quality = record(read("quality.json"));
  const pipeline = optional("pipeline.json");
  const assets = optional("assets.json");
  const goldens = optional("goldens.json");

  const environment: RecordValue[] = Array.isArray(requirements.environment)
    ? requirements.environment.map(record)
    : Object.entries(record(requirements.environment)).map(([name, value]) => ({
        ...record(value),
        name,
      }));
  const providers = items(requirements.providers).map(record);
  const services = providers.map((provider) => ({
    name: string(provider.name) || repoLabel(string(provider.id)),
    purpose:
      string(provider.purpose) || "Generate the approved media in this recipe.",
    keys: [
      string(provider.environmentVariable),
      ...strings(provider.environmentVariables),
    ].filter(Boolean),
    model: string(provider.model) || strings(provider.models).join(" · "),
  }));
  for (const env of environment) {
    const key = string(env.name);
    if (!key || services.some((service) => service.keys.includes(key)))
      continue;
    const existing = services.find(
      (service) => service.name === providerNames[key],
    );
    if (existing) existing.keys.push(key);
    else
      services.push({
        name: providerNames[key] || repoLabel(key),
        keys: [key],
        model: "",
        purpose:
          string(env.purpose) ||
          string(env.description) ||
          `Used for ${strings(env.requiredFor).join(", ")}.`,
      });
  }
  const toolNames = (value: unknown): string[] =>
    Array.isArray(value)
      ? value
          .map((tool) => string(tool) || string(record(tool).name))
          .filter(Boolean)
      : Object.keys(record(value));
  const runtime = record(requirements.runtime);
  const tools = [
    ...new Set([
      ...toolNames(requirements.localTools),
      ...toolNames(requirements.tools),
      ...(runtime.node ? [`Node.js ${string(runtime.node)}`] : []),
      ...strings(runtime.binaries),
      ...strings(runtime.commands),
    ]),
  ];

  function assetHref(relative: string): string | undefined {
    if (!relative || /^https?:/.test(relative)) return undefined;
    const absolute = path.resolve(root, relative);
    if (
      !absolute.startsWith(`${publicRoot}${path.sep}`) ||
      !existsSync(absolute)
    )
      return undefined;
    return `/${path.relative(publicRoot, absolute).split(path.sep).join("/")}`;
  }
  const included: RepoPackageAsset[] = [];
  function addAsset(relative: string, label: string, description: string) {
    const href = assetHref(relative);
    if (
      !href ||
      !statSync(path.join(publicRoot, href)).isFile() ||
      included.some((asset) => asset.href === href)
    )
      return;
    included.push({
      href,
      label,
      description,
      image: /\.(png|jpe?g|webp)$/i.test(href),
    });
  }
  for (const group of ["fixed", "characters", "backgrounds"]) {
    for (const value of items(assets[group])) {
      const asset = record(value);
      const relative = string(asset.localPath) || string(asset.path);
      addAsset(
        relative,
        string(asset.label) ||
          repoLabel(path.basename(relative, path.extname(relative))),
        string(asset.purpose) ||
          string(asset.role) ||
          `${repoLabel(group)} · packaged asset`,
      );
    }
  }
  const sourceReference = record(assets.sourceReference);
  for (const [key, label] of [
    ["nativeHero", "Creator style reference"],
    ["exampleOutput", "Creator example output"],
    ["referenceInput", "Creator reference input"],
    ["smokeInput", "Local smoke-test input"],
  ]) {
    addAsset(
      string(sourceReference[key]),
      label,
      string(sourceReference.referenceNote) ||
        string(sourceReference.verification),
    );
  }
  for (const [index, relative] of strings(
    sourceReference.carouselExamples,
  ).entries()) {
    addAsset(
      relative,
      `Creator reference ${index + 1}`,
      "Supplied creator reference—not a new Wiggly-generated result.",
    );
  }
  for (const value of items(assets.examples)) {
    const asset = record(value);
    addAsset(
      string(asset.cleanPath) || string(asset.path),
      repoLabel(string(asset.variant) || "Recipe reference"),
      "Supplied creator reference—not a new Wiggly-generated result.",
    );
  }
  // This older kit stores its five host poses directly, without an assets manifest.
  if (format.slug === "mugsy-explains") {
    for (const file of readdirSync(path.join(root, "assets/poses"))) {
      addAsset(
        `assets/poses/${file}`,
        repoLabel(path.basename(file, ".png")),
        "Packaged recurring-host pose",
      );
    }
  }

  const stages = items(pipeline.stages);
  const workflow = stages.length
    ? stages.map((value) => {
        const stage = record(value);
        return {
          title: repoLabel(string(stage.id)),
          description: string(stage.output),
          approval: stage.approvalRequired === true,
          provider:
            stage.paid === true ||
            stage.paidMedia === true ||
            stage.providerCall === true,
        };
      })
    : strings(pipeline.steps).map((step) => ({
        title: repoLabel(step),
        description: "",
        approval: /approv|review/.test(step),
        provider: false,
      }));
  const workflowSource = workflow.length ? "pipeline.json" : "SKILL.md";
  if (!workflow.length) {
    const skill = readFileSync(path.join(root, "SKILL.md"), "utf8");
    const section = skill.match(
      /## (?:Required loop|Workflow|Agent loop)[^\n]*\n([\s\S]*?)(?=\n## |$)/i,
    )?.[1];
    const steps = section
      ?.split("\n")
      .filter((line) => /^\d+\. /.test(line))
      .map((line) => line.replace(/^\d+\. /, ""));
    for (const [index, description] of (steps?.length
      ? steps
      : (format.handoff?.instructions ?? [])
    ).entries()) {
      workflow.push({
        title: `Step ${index + 1}`,
        description,
        approval: false,
        provider: false,
      });
    }
  }

  const qualityGroups = Object.entries(quality).flatMap(([title, value]) => {
    const checks = Array.isArray(value)
      ? value
          .map((check) => string(check) || string(record(check).label))
          .filter(Boolean)
      : Object.entries(record(value)).map(
          ([key, check]) =>
            `${repoLabel(key)}: ${typeof check === "object" ? JSON.stringify(check) : String(check)}`,
        );
    return checks.length ? [{ title: repoLabel(title), checks }] : [];
  });
  const files = readdirSync(root)
    .filter(
      (file) =>
        /\.(md|json)$/i.test(file) && statSync(path.join(root, file)).isFile(),
    )
    .sort((a, b) => {
      const order = [
        "README.md",
        "SKILL.md",
        "requirements.json",
        "inputs.json",
        "pipeline.json",
        "assets.json",
        "quality.json",
        "goldens.json",
      ];
      return (
        (order.includes(a) ? order.indexOf(a) : 99) -
          (order.includes(b) ? order.indexOf(b) : 99) || a.localeCompare(b)
      );
    })
    .map((name) => ({
      name,
      href: `/${format.packagePath}/${name}`,
      content: readFileSync(path.join(root, name), "utf8"),
    }));
  if (
    !services.every((service) => service.name) ||
    !workflow.length ||
    !qualityGroups.length ||
    !files.some((file) => file.name === "SKILL.md")
  ) {
    throw new Error(`${format.slug} is missing rich Repo-page contract data.`);
  }
  return {
    services,
    tools,
    notes: [...strings(requirements.notes), string(requirements.note)].filter(
      Boolean,
    ),
    assets: included,
    workflow,
    workflowSource,
    quality: qualityGroups,
    files,
    proof: {
      purpose: string(goldens.purpose),
      notes: [
        string(sourceReference.verification),
        string(sourceReference.referenceNote),
      ].filter(Boolean),
      contactSheet: assetHref(
        string(goldens.canonicalContactSheet) || string(goldens.contactSheet),
      ),
      examples: items(goldens.examples).map((value) => {
        const example = record(value);
        return {
          title:
            string(example.title) ||
            string(example.brand) ||
            repoLabel(string(example.id)),
          role: string(example.role),
          strengths: strings(example.whyItWorks),
          weaknesses: strings(example.knownWeaknesses),
        };
      }),
    },
  };
}
