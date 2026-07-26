export const savedDiscoveryStorageKey = "wiggly-discovery-saved";

export function readSavedDiscoveryIds(storage: Storage): Set<string> {
  try {
    const saved = JSON.parse(storage.getItem(savedDiscoveryStorageKey) || "[]");
    return new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function writeSavedDiscoveryIds(storage: Storage, ids: Set<string>): void {
  storage.setItem(savedDiscoveryStorageKey, JSON.stringify([...ids]));
}
