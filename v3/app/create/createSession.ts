const anonymousIdKey = "wiggly:v3:anonymous-id";

export const getAnonymousId = () => {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(anonymousIdKey);
  if (existing) return existing;

  const next = window.crypto.randomUUID();
  window.localStorage.setItem(anonymousIdKey, next);
  return next;
};
