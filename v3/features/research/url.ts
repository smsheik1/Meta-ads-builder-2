export const normalizeWebsiteUrl = (value: string): URL => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Enter a website URL.");

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw new Error("Only http and https websites can be researched.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http and https websites can be researched.");
  }

  const host = parsed.hostname.toLowerCase();
  const hostname = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  const port = parsed.port ? `:${parsed.port}` : "";
  const pathname = parsed.pathname || "/";

  return new URL(`${parsed.protocol}//${hostname}${port}${pathname}${parsed.search}`);
};

const parseIPv4 = (host: string) => {
  const parts = host.split(".");
  if (parts.length !== 4) return null;

  const numbers = parts.map((part) => {
    if (!/^\d+$/.test(part)) return Number.NaN;
    return Number.parseInt(part, 10);
  });

  if (numbers.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return null;
  return numbers;
};

export const isPrivateIPv4 = (host: string) => {
  const parts = parseIPv4(host);
  if (!parts) return false;

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
};

export const isBlockedHostname = (host: string) => {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal")
  ) {
    return true;
  }

  if (isPrivateIPv4(normalized)) return true;

  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  ) {
    return true;
  }

  return false;
};

export const assertPublicWebsiteUrl = (url: URL) => {
  if (isBlockedHostname(url.hostname)) {
    throw new Error("Local and private network websites cannot be researched.");
  }

  return url;
};

export const normalizePublicWebsiteUrl = (value: string) => assertPublicWebsiteUrl(
  normalizeWebsiteUrl(value),
);
