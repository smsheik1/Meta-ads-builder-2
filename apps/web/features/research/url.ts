import dns from 'node:dns/promises';
import net from 'node:net';

export type LookupAddress = {
  address: string;
  family: 4 | 6;
};

export type LookupWebsiteHost = (host: string) => Promise<LookupAddress[]>;

export const normalizeWebsiteUrl = (value: string): URL => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Enter a website URL.');

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only http and https websites can be researched.');
  }

  url.hash = '';
  url.username = '';
  url.password = '';
  url.hostname = url.hostname.toLowerCase();
  if (!url.pathname) url.pathname = '/';

  return url;
};

const isPrivateIPv4 = (address: string) => {
  const parts = address.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
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

const isPrivateIPv6 = (address: string) => {
  const normalized = address.toLowerCase();
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.')
  );
};

export const isPrivateAddress = (address: string) => {
  const family = net.isIP(address);
  if (family === 4) return isPrivateIPv4(address);
  if (family === 6) return isPrivateIPv6(address);
  return true;
};

const defaultLookup: LookupWebsiteHost = async (host) => {
  const result = await dns.lookup(host, { all: true });
  return result.map((entry) => ({
    address: entry.address,
    family: entry.family as 4 | 6,
  }));
};

export const assertPublicWebsiteUrl = async (
  url: URL,
  lookup: LookupWebsiteHost = defaultLookup,
) => {
  const host = url.hostname.toLowerCase();

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    throw new Error('Local and private network websites cannot be researched.');
  }

  const literalFamily = net.isIP(host);
  const addresses = literalFamily
    ? [{ address: host, family: literalFamily as 4 | 6 }]
    : await lookup(host);

  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error('That website resolves to a private network address.');
  }
};
