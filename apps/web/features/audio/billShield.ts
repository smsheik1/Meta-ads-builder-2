type AudioRoute = 'audioScripts' | 'audioGeneration';

const DAY_MS = 24 * 60 * 60 * 1000;

const routeDefaults: Record<AudioRoute, { limit: number; envLimit: string; label: string }> = {
  audioScripts: {
    limit: 12,
    envLimit: 'CREATE_AUDIO_SCRIPTS_DAILY_QUOTA',
    label: 'voice script generation',
  },
  audioGeneration: {
    limit: 4,
    envLimit: 'CREATE_AUDIO_DAILY_QUOTA',
    label: 'voice audio generation',
  },
};

const routeHits = new Map<string, { count: number; resetAt: number }>();

export class BillShieldError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(message: string, status = 429, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ''));

const readLimit = (name: string, fallback: number) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const requestKey = (route: AudioRoute, request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwardedFor || request.headers.get('x-real-ip') || 'local';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `${route}:${ip}:${userAgent.slice(0, 80)}`;
};

export const assertAudioRouteAllowed = (
  route: AudioRoute,
  request: Request,
  envFlag: string,
) => {
  if (isDisabled(process.env[envFlag])) {
    throw new BillShieldError(`${routeDefaults[route].label} is temporarily disabled.`, 503);
  }

  const config = routeDefaults[route];
  const limit = readLimit(config.envLimit, config.limit);
  const key = requestKey(route, request);
  const now = Date.now();
  const existing = routeHits.get(key);
  const bucket = existing && existing.resetAt > now
    ? existing
    : { count: 0, resetAt: now + DAY_MS };

  bucket.count += 1;
  routeHits.set(key, bucket);

  if (bucket.count > limit) {
    throw new BillShieldError(
      `Too many ${config.label} requests today. Please try again later.`,
      429,
      Math.ceil((bucket.resetAt - now) / 1000),
    );
  }
};

export const billShieldJson = (error: BillShieldError) => ({
  error: error.message,
  retryAfterSeconds: error.retryAfterSeconds,
});
