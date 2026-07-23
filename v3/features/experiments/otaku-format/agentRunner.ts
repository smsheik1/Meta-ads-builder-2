import { createHash } from "node:crypto";
import type { OtakuScene } from "../../../public/format-repositories/otaku-explainer-v1/renderer/OtakuFormatRenderer";

export const lessonRoles = ["learner", "guide", "challenger"] as const;
export const calloutThemes = ["neutral", "question", "warm", "cool", "violet", "gold"] as const;
export const maxRenderAttempts = 3;

export type LessonRole = (typeof lessonRoles)[number];
export type CalloutTheme = (typeof calloutThemes)[number];

export type OtakuWorldPack = {
  id: string;
  label: string;
  roles: Record<LessonRole, {
    character: string;
    voice: string;
    behavior: string;
  }>;
  backgrounds: string[];
  lore: string[];
  avoid: string[];
};

export type OtakuLayoutManifest = {
  layouts: Record<string, Array<{
    x: number;
    bottom: number;
    width: number;
    rotate?: number;
  }>>;
};

export type OtakuAuthoredScene = {
  id: string;
  speakerRole: LessonRole;
  visibleRoles: LessonRole[];
  layout: string;
  dialogue: string;
  background: string;
  estimatedDurationMs: number;
  callout?: {
    label: string;
    theme: CalloutTheme;
  };
};

export type OtakuScenePlan = {
  id: string;
  title: string;
  input: {
    topic: string;
    storyWorld: string;
  };
  scenes: OtakuAuthoredScene[];
};

export type OtakuQualityReport = {
  attempt: number;
  automaticChecks: Record<string, boolean>;
  creativeReview: {
    lessonAccurate: boolean;
    dialogueNatural: boolean;
    charactersGrounded: boolean;
    textFits: boolean;
    audioClear: boolean;
    analogyMakesSense: boolean;
  };
  problems: string[];
  status: "pass" | "fail";
};

export type OtakuRequirementManifest = {
  environment: Array<{ name: string; requiredFor: string[]; description: string }>;
  localTools: Array<{ name: string; requiredFor: string[] }>;
};

export function evaluateRequirements({
  command,
  environment,
  manifest,
  needsNewAssets = false,
  tools,
}: {
  command: string;
  environment: Record<string, string | undefined>;
  manifest: OtakuRequirementManifest;
  needsNewAssets?: boolean;
  tools: Record<string, boolean>;
}) {
  const missingEnvironment = manifest.environment
    .filter((requirement) => requirement.requiredFor.includes(command)
      || (needsNewAssets && requirement.requiredFor.includes("new-story-world-assets")))
    .filter((requirement) => !environment[requirement.name])
    .map((requirement) => requirement.name);
  const missingTools = manifest.localTools
    .filter((requirement) => requirement.requiredFor.includes(command))
    .filter((requirement) => !tools[requirement.name])
    .map((requirement) => requirement.name);
  return { missingEnvironment, missingTools, ok: missingEnvironment.length === 0 && missingTools.length === 0 };
}

export function validateScenePlan(
  plan: OtakuScenePlan,
  world: OtakuWorldPack,
  layoutManifest: OtakuLayoutManifest,
) {
  const errors: string[] = [];
  if (!plan.id.trim()) errors.push("Run id is required.");
  if (!plan.title.trim()) errors.push("Run title is required.");
  if (!plan.input.topic.trim()) errors.push("Topic is required.");
  if (plan.input.storyWorld !== world.id) errors.push(`Story world must be ${world.id}.`);
  if (plan.scenes.length < 12 || plan.scenes.length > 18) errors.push("A run must contain 12 to 18 scenes.");

  const ids = new Set<string>();
  for (const [index, scene] of plan.scenes.entries()) {
    const label = scene.id || `scene ${index + 1}`;
    if (!scene.id.trim()) errors.push(`Scene ${index + 1} needs an id.`);
    if (ids.has(scene.id)) errors.push(`Scene id ${scene.id} is duplicated.`);
    ids.add(scene.id);
    if (!lessonRoles.includes(scene.speakerRole)) errors.push(`${label} has an invalid speaker role.`);
    if (scene.visibleRoles.length < 2 || scene.visibleRoles.length > 3) errors.push(`${label} must show two or three roles.`);
    if (new Set(scene.visibleRoles).size !== scene.visibleRoles.length) errors.push(`${label} repeats a visible role.`);
    if (!scene.visibleRoles.includes(scene.speakerRole)) errors.push(`${label} must show its speaker.`);
    if (scene.visibleRoles.some((role) => !lessonRoles.includes(role))) errors.push(`${label} has an invalid visible role.`);
    const layout = layoutManifest.layouts[scene.layout];
    if (!layout) errors.push(`${label} uses unknown layout ${scene.layout}.`);
    else if (layout.length !== scene.visibleRoles.length) errors.push(`${label} layout ${scene.layout} needs ${layout.length} visible roles.`);
    if (!world.backgrounds.includes(scene.background)) errors.push(`${label} uses a background outside the ${world.label} pack.`);
    if (!scene.dialogue.trim()) errors.push(`${label} needs dialogue.`);
    if (scene.dialogue.length > 100) errors.push(`${label} dialogue exceeds 100 characters.`);
    if (scene.estimatedDurationMs < 2_000 || scene.estimatedDurationMs > 8_000) errors.push(`${label} duration must be 2,000 to 8,000 ms.`);
    if (scene.callout) {
      if (!scene.callout.label.trim()) errors.push(`${label} callout label cannot be empty.`);
      if (scene.callout.label.length > 14) errors.push(`${label} callout label exceeds 14 characters.`);
      if (!calloutThemes.includes(scene.callout.theme)) errors.push(`${label} has an invalid callout theme.`);
    }
  }
  return errors;
}

export function materializeScenePlan(
  plan: OtakuScenePlan,
  world: OtakuWorldPack,
  layoutManifest: OtakuLayoutManifest,
): OtakuScene[] {
  const errors = validateScenePlan(plan, world, layoutManifest);
  if (errors.length) throw new Error(errors.join("\n"));
  return plan.scenes.map((scene) => {
    const layout = layoutManifest.layouts[scene.layout];
    return {
      id: scene.id,
      speaker: world.roles[scene.speakerRole].character,
      dialogue: scene.dialogue,
      background: scene.background,
      estimatedDurationMs: scene.estimatedDurationMs,
      characters: scene.visibleRoles.map((role, index) => {
        return { asset: world.roles[role].character, ...layout[index] };
      }),
      callout: scene.callout,
    };
  });
}

export function scenePlanHash(plan: OtakuScenePlan) {
  return createHash("sha256").update(JSON.stringify(plan)).digest("hex");
}

export function assertRenderAllowed(attempts: number, approved: boolean) {
  if (!approved) throw new Error("Render loop approval is required before the first media call.");
  if (attempts >= maxRenderAttempts) throw new Error(`This run already used its ${maxRenderAttempts} allowed render attempts.`);
}

export function canFinalize(report: OtakuQualityReport) {
  return report.status === "pass"
    && report.problems.length === 0
    && Object.values(report.automaticChecks).every(Boolean)
    && Object.values(report.creativeReview).every(Boolean);
}

export function buildProvenance(plan: OtakuScenePlan, formatVersion: string) {
  return {
    createdBy: "agent",
    format: "otaku-explainer",
    formatVersion,
    runnerVersion: "otaku-agent-runner@1.0.0-experiment",
    sourcePlan: "scene-plan.json",
    sourcePlanSha256: scenePlanHash(plan),
    worldPack: `worlds/${plan.input.storyWorld}.json`,
    layouts: "layouts.json",
  } as const;
}
