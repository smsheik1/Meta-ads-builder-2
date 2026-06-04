export const ANONYMOUS_SESSION_STORAGE_KEY = "wiggly_create_v2_session_id";

const createFallbackId = () => (
  `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
);

export const createAnonymousSessionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `anon-${crypto.randomUUID()}`;
  }

  return createFallbackId();
};

export const getOrCreateAnonymousSessionId = (
  storage: Pick<Storage, "getItem" | "setItem">,
) => {
  const existing = storage.getItem(ANONYMOUS_SESSION_STORAGE_KEY);
  if (existing?.startsWith("anon-")) return existing;

  const nextSessionId = createAnonymousSessionId();
  storage.setItem(ANONYMOUS_SESSION_STORAGE_KEY, nextSessionId);
  return nextSessionId;
};
