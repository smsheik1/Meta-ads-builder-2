import { assertFormatDraft, assertFormatVersion, createFormatVersion, type FormatDraft, type FormatVersion } from "./model";

const draftsKey = "wiggly:maker:drafts:v1";
const versionsKey = "wiggly:maker:versions:v1";

function readMap<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) || "{}") as Record<string, T>;
  } catch {
    return {};
  }
}

function writeMap<T>(key: string, value: Record<string, T>) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function saveLocalDraft(draft: FormatDraft) {
  const drafts = readMap<FormatDraft>(draftsKey);
  drafts[draft.id] = draft;
  writeMap(draftsKey, drafts);
  return draft;
}

export function loadLocalDraft(draftId: string) {
  const value = readMap<unknown>(draftsKey)[draftId];
  return value ? assertFormatDraft(value) : null;
}

export function loadLocalVersion(versionId: string) {
  const value = readMap<unknown>(versionsKey)[versionId];
  return value ? assertFormatVersion(value) : null;
}

export function publishLocalDraft(draft: FormatDraft) {
  const versions = readMap<FormatVersion>(versionsKey);
  const nextVersion = Object.values(versions)
    .filter((version) => version.draftId === draft.id)
    .reduce((latest, version) => Math.max(latest, version.version), 0) + 1;
  const version = createFormatVersion(draft, nextVersion);
  versions[version.id] = version;
  writeMap(versionsKey, versions);
  const publishedDraft: FormatDraft = {
    ...draft,
    status: "published",
    publishedVersionId: version.id,
    updatedAt: version.publishedAt,
  };
  saveLocalDraft(publishedDraft);
  return { draft: publishedDraft, version };
}
