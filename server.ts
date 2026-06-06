import 'dotenv/config';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { createClient } from '@supabase/supabase-js';
import { ConvexHttpClient } from 'convex/browser';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import { EXPORT_FPS, getExportDimensions, type ExportSnapshot, type RenderSnapshot } from './src/lib/export-snapshot';
import type { AdScene } from './apps/web/features/engine/scene';
import { api } from './apps/web/convex/_generated/api';
import { getPublicRenderErrorMessage } from './apps/web/features/export/renderErrors';
import { renderAdSceneToMp4 } from './apps/web/features/export/renderScene';
import {
  createRenderSceneTicket,
  deleteRenderSceneTicket,
  readRenderSceneTicket,
} from './apps/web/features/export/renderSceneTicketStore';
import { createRenderSnapshot } from './apps/web/features/render/adSceneRender';

const app = express();
const isProd = process.env.NODE_ENV === 'production';
// Using port 3001 for Express so Vite can bind to 3000 as required in development.
// Hosts like Render provide PORT in production.
const port = Number(process.env.PORT) || (isProd ? 3000 : 3001);

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const isDisabled = (value: string | undefined) => ['0', 'false', 'off', 'no'].includes(String(value || '').trim().toLowerCase());

const sessionCookieName = 'wiggly_session';
const billShieldSecret = process.env.AI_BILL_SHIELD_SECRET || process.env.SESSION_SECRET || (isProd ? '' : 'wiggly-dev-bill-shield');
const quotaWindowMs = 24 * 60 * 60 * 1000;
const readQuota = (name: string, prodDefault: number, devDefault: number) => (
  Number(process.env[name] || (isProd ? prodDefault : devDefault))
);
const quotaBuckets = {
  brandResearch: { limit: readQuota('BRAND_RESEARCH_DAILY_QUOTA', 5, 500), label: 'brand research' },
  adStream: { limit: readQuota('AD_STREAM_DAILY_QUOTA', 10, 500), label: 'ad generation' },
  dialogueScripts: { limit: readQuota('DIALOGUE_SCRIPTS_DAILY_QUOTA', 10, 1000), label: 'voice script generation' },
  dialogueAudio: { limit: readQuota('DIALOGUE_AUDIO_DAILY_QUOTA', 3, 200), label: 'voice audio generation' },
  headlines: { limit: readQuota('HEADLINES_DAILY_QUOTA', 10, 500), label: 'headline generation' },
  copy: { limit: readQuota('COPY_DAILY_QUOTA', 10, 500), label: 'copy generation' },
  transcription: { limit: readQuota('TRANSCRIPTION_DAILY_QUOTA', 5, 500), label: 'transcription' },
} as const;
type QuotaBucket = keyof typeof quotaBuckets;
const quotaCounts = new Map<string, { count: number; resetAt: number }>();
const ipCounts = new Map<string, { count: number; resetAt: number }>();

const parseCookies = (header = '') => Object.fromEntries(
  header.split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf('=');
      if (index === -1) return [part, ''];
      return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
    }),
);

const signSessionId = (sessionId: string) => crypto
  .createHmac('sha256', billShieldSecret || 'missing-secret')
  .update(sessionId)
  .digest('base64url');

const readSignedSessionId = (rawCookie: string | undefined) => {
  if (!rawCookie || !billShieldSecret) return null;
  const [sessionId, signature] = rawCookie.split('.');
  if (!sessionId || !signature) return null;
  const expected = signSessionId(sessionId);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? sessionId : null;
  } catch {
    return null;
  }
};

const getOrSetAnonymousSessionId = (req: express.Request, res: express.Response) => {
  const cookies = parseCookies(req.headers.cookie);
  const existingSessionId = readSignedSessionId(cookies[sessionCookieName]);
  if (existingSessionId) return existingSessionId;

  const sessionId = crypto.randomUUID();
  const signedCookie = `${sessionId}.${signSessionId(sessionId)}`;
  res.cookie(sessionCookieName, signedCookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: quotaWindowMs,
  });
  return sessionId;
};

const consumeQuota = (store: Map<string, { count: number; resetAt: number }>, key: string, limit: number) => {
  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + quotaWindowMs });
    return { ok: true, remaining: Math.max(0, limit - 1), resetAt: now + quotaWindowMs };
  }
  if (current.count >= limit) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }
  current.count += 1;
  return { ok: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
};

const billShield = (bucket: QuotaBucket, featureFlag = 'AI_GENERATION_ENABLED'): express.RequestHandler => (req, res, next) => {
  if (!billShieldSecret) {
    return res.status(503).json({ error: 'AI bill shield is not configured.' });
  }
  if (isDisabled(process.env.AI_GENERATION_ENABLED) || isDisabled(process.env[featureFlag])) {
    return res.status(503).json({ error: 'This AI feature is temporarily disabled.' });
  }

  const sessionId = getOrSetAnonymousSessionId(req, res);
  const bucketConfig = quotaBuckets[bucket];
  const ipLimit = readQuota('AI_IP_DAILY_QUOTA', 30, 5000);
  const ipKey = crypto.createHash('sha256').update(String(req.ip || req.socket.remoteAddress || 'unknown')).digest('hex').slice(0, 24);
  const ipQuota = consumeQuota(ipCounts, `ip:${ipKey}`, ipLimit);
  if (!ipQuota.ok) {
    return res.status(429).json({
      error: 'Too many AI requests from this network today. Please try again later.',
      retryAfterSeconds: Math.ceil((ipQuota.resetAt - Date.now()) / 1000),
    });
  }

  const sessionQuota = consumeQuota(quotaCounts, `${bucket}:${sessionId}`, bucketConfig.limit);
  res.setHeader('X-Wiggly-Quota-Remaining', String(sessionQuota.remaining));
  if (!sessionQuota.ok) {
    return res.status(429).json({
      error: `Too many ${bucketConfig.label} requests today. Please try again later.`,
      retryAfterSeconds: Math.ceil((sessionQuota.resetAt - Date.now()) / 1000),
    });
  }
  console.info(`[ai-usage] bucket=${bucket} session=${sessionId.slice(0, 8)} ip=${ipKey} remaining=${sessionQuota.remaining}`);
  next();
};

app.post('/api/dev/reset-ai-quotas', (req, res) => {
  if (isProd) return res.status(404).json({ error: 'Not found' });
  quotaCounts.clear();
  ipCounts.clear();
  res.json({ ok: true });
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 120 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a bit and try again.' },
});

const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 10 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait and try again later.' },
});

const brandResearchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many brand research attempts. Please wait and try again later.' },
});

const adStreamLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 15 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many ad streams made. Please wait and try again later.' },
});

const videoExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 30 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many video exports. Please wait and try again later.' },
});

const publishingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many publishing requests. Please wait and try again later.' },
});

const criticalApiPaths = new Set([
  '/api/render-remotion',
  '/api/render-scene-ticket',
  '/api/share-pages',
  '/api/transcribe',
  '/api/research-brand',
  '/api/generate-ad-stream',
  '/api/generate-headlines',
  '/api/generate-copy',
  '/api/generate-dialogue-scripts',
  '/api/generate-dialogue-audio',
]);
app.use((req, res, next) => {
  if (!criticalApiPaths.has(req.path)) {
    next();
    return;
  }

  const startedAt = Date.now();
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      console.warn(`[critical-api-error] method=${req.method} path=${req.path} status=${res.statusCode} duration_ms=${Date.now() - startedAt}`);
    }
  });
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    aiGenerationEnabled: !isDisabled(process.env.AI_GENERATION_ENABLED),
    brandResearchEnabled: !isDisabled(process.env.BRAND_RESEARCH_ENABLED),
    transcriptionEnabled: !isDisabled(process.env.TRANSCRIPTION_ENABLED),
    ttsEnabled: !isDisabled(process.env.TTS_ENABLED),
    deepgramConfigured: Boolean(process.env.DEEPGRAM_API_KEY),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    openrouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    firecrawlConfigured: Boolean(process.env.FIRECRAWL_API_KEY),
  });
});

app.use('/api', apiLimiter);

const memoryStorage = multer.memoryStorage();
const uploadMem = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const filename = file.originalname.toLowerCase();
    const allowedExtension = /\.(mp3|m4a|wav|aac|ogg|oga|flac|webm|mp4)$/i.test(filename);
    const allowed = file.mimetype.startsWith('audio/') ||
      file.mimetype === 'video/mp4' ||
      file.mimetype === 'video/webm' ||
      (file.mimetype === 'application/octet-stream' && allowedExtension);
    if (!allowed) {
      cb(new Error('Unsupported audio file type.'));
      return;
    }
    cb(null, true);
  },
});

const uploadRemotion = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 300 * 1024 * 1024,
    files: 12,
  },
});

const uploadShareVideo = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 80 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = file.mimetype === 'video/mp4' || file.originalname.toLowerCase().endsWith('.mp4');
    if (!allowed) {
      cb(new Error('Share videos must be MP4 files.'));
      return;
    }
    cb(null, true);
  },
});

const sendServerError = (res: express.Response, fallbackMessage: string, error?: unknown) => {
  const statusCode = Number((error as any)?.status || (error as any)?.code || 500);
  const raw = error as any;
  const nested = raw?.error;
  const message = (() => {
    if (typeof raw?.message === 'string' && raw.message.trim().length) return raw.message;
    if (typeof nested === 'string' && nested.trim().length) return nested;
    if (nested && typeof nested === 'object') {
      if (typeof nested.message === 'string' && nested.message.trim().length) return nested.message;
      if (typeof nested.status === 'string' && nested.status.trim().length) return nested.status;
      return JSON.stringify(nested);
    }
    return fallbackMessage;
  })();

  res.status(Number.isFinite(statusCode) && statusCode > 0 ? statusCode : 500).json({
    error: message || fallbackMessage,
    fallback: fallbackMessage,
  });
};

const getServerSupabaseConfig = () => {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return { url, serviceRoleKey };
};

const isValidHexColor = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

const trimField = (value: unknown, maxLength: number) => String(value || '').trim().slice(0, maxLength);

const createShareSlug = (headline: string) => {
  const base = headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 42) || 'wiggly-ad';
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
};

const normalizeShareUrl = (value: unknown) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).href;
};

const parseShareSceneBody = (value: unknown): AdScene | null => {
  if (!value) return null;
  try {
    const scene = typeof value === 'string' ? JSON.parse(value) : value;
    if (!scene || typeof scene !== 'object') return null;
    const candidate = scene as AdScene;
    if (!candidate.id || !candidate.brand?.name || !candidate.creative?.headline) return null;
    return candidate;
  } catch {
    return null;
  }
};

const getConvexUrl = () => (
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  process.env.CONVEX_URL ||
  ''
).trim();

const saveShareSceneSnapshot = async (scene: AdScene | null, slug: string) => {
  if (!scene) return false;
  const convexUrl = getConvexUrl();
  if (!convexUrl) return false;

  const client = new ConvexHttpClient(convexUrl);
  const record = {
    ...createRenderSnapshot(scene),
    slug,
    createdAt: Date.now(),
  };

  await client.mutation(api.shareScenes.save, { record });
  return true;
};

const getRequestOrigin = (req: express.Request) => {
  const appUrl = process.env.APP_URL?.trim().replace(/\/+$/, '');
  if (appUrl) return appUrl;
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = req.get('host') || `localhost:${port}`;
  return `${proto}://${host}`;
};

const transcriptionBackoffMs = 60 * 1000;
let transcriptionRateLimitUntil = 0;

const remotionAssetsRoot = path.join(process.cwd(), 'tmp', 'remotion-assets');
app.use('/api/remotion-assets', express.static(remotionAssetsRoot, {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
}));

app.post('/api/share-pages', publishingLimiter, uploadShareVideo.single('video'), async (req, res) => {
  try {
    const { url, serviceRoleKey } = getServerSupabaseConfig();
    if (!url || !serviceRoleKey) {
      return res.status(503).json({ error: 'Hosted sharing is not configured on this server.', code: 'SHARE_HOSTING_NOT_CONFIGURED' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Add an MP4 video before creating a share link.' });
    }
    if (req.file.mimetype !== 'video/mp4') {
      return res.status(400).json({ error: 'Share videos must be MP4 files.' });
    }

    const shareScene = parseShareSceneBody(req.body.scene);
    const sceneBrand = shareScene?.brand;
    const sceneCreative = shareScene?.creative;
    const headline = trimField(sceneCreative?.headline || req.body.headline, 180);
    const subhead = trimField(sceneCreative?.subheadline || req.body.subhead, 500);
    const ctaText = trimField(sceneCreative?.ctaText || req.body.cta_text, 80) || 'Learn More';
    const businessName = trimField(sceneBrand?.name || req.body.business_name, 120) || 'Wiggly';
    const brandName = trimField(sceneBrand?.name || req.body.brand_name, 120) || businessName;
    const brandLogoUrl = trimField(sceneBrand?.logoUrl || sceneBrand?.faviconUrl || req.body.brand_logo_url, 5000);
    const accentColor = trimField(sceneCreative?.accentColor || req.body.accent_color, 7) || '#00D6B8';
    const backgroundColor = trimField(sceneCreative?.backgroundColor || req.body.background_color, 7) || '#FAFAF7';
    const requestedPlatform = trimField(shareScene?.platform || req.body.platform, 40);
    const platform = ['facebook-feed', 'instagram-feed', 'feed', 'reels', 'stories', 'vertical', 'youtube'].includes(requestedPlatform)
      ? requestedPlatform
      : 'instagram-feed';
    let ctaUrl = '';

    if (!headline) {
      return res.status(400).json({ error: 'Share links need a headline.' });
    }
    if (!isValidHexColor(accentColor) || !isValidHexColor(backgroundColor)) {
      return res.status(400).json({ error: 'Share colors must be six-digit hex values.' });
    }
    try {
      ctaUrl = normalizeShareUrl(sceneCreative?.ctaUrl || sceneBrand?.websiteUrl || req.body.cta_url);
    } catch {
      return res.status(400).json({ error: 'Button link must be a valid URL.' });
    }
    if (ctaUrl.length > 500) {
      return res.status(400).json({ error: 'Button link is too long.' });
    }

    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const slug = createShareSlug(headline);
    const videoPath = `ad-shares/${slug}.mp4`;
    const upload = await supabase.storage
      .from('ad-shares')
      .upload(videoPath, req.file.buffer, {
        contentType: 'video/mp4',
        upsert: false,
      });
    if (upload.error) throw upload.error;

    const baseShareRow = {
      slug,
      video_path: videoPath,
      headline,
      subhead,
      cta_text: ctaText,
      cta_url: ctaUrl,
      business_name: businessName,
      brand_name: brandName,
      accent_color: accentColor,
      background_color: backgroundColor,
    };
    const enhancedShareRow = {
      ...baseShareRow,
      brand_logo_url: brandLogoUrl || null,
      platform,
    };
    const insertShareRow = async (row: typeof baseShareRow | typeof enhancedShareRow) => supabase
      .from('ad_shares')
      .insert(row)
      .select('id, created_at')
      .single();

    let insert = await insertShareRow(enhancedShareRow);
    if (insert.error && String(insert.error.message || '').includes('schema cache')) {
      console.warn('[share-pages] ad_shares schema is missing optional share columns; retrying with base row only.');
      insert = await insertShareRow(baseShareRow);
    }

    if (insert.error) {
      await supabase.storage.from('ad-shares').remove([videoPath]);
      throw insert.error;
    }

    const publicUrl = supabase.storage.from('ad-shares').getPublicUrl(videoPath).data.publicUrl;
    let sceneStored = false;
    try {
      sceneStored = await saveShareSceneSnapshot(shareScene, slug);
    } catch (error) {
      console.warn('[share-pages] could not save Convex share scene snapshot:', error);
    }

    res.json({
      id: insert.data?.id,
      createdAt: insert.data?.created_at,
      slug,
      videoPath,
      videoUrl: publicUrl,
      sceneStored,
      shareUrl: `${getRequestOrigin(req)}/s/${slug}`,
    });
  } catch (error: any) {
    console.error('Create share page error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Could not create share link.' });
  }
});

let remotionBundlePromise: Promise<string> | null = null;
const getRemotionBundle = () => {
  if (!isProd) {
    return bundle({
      entryPoint: path.join(process.cwd(), 'src', 'remotion', 'index.ts'),
    });
  }

  if (!remotionBundlePromise) {
    remotionBundlePromise = bundle({
      entryPoint: path.join(process.cwd(), 'src', 'remotion', 'index.ts'),
    });
  }
  return remotionBundlePromise;
};

const replaceMediaUrl = (snapshot: RenderSnapshot, field: string, url: string) => {
  if (field === 'audio') {
    snapshot.settings.audioUrl = url;
    return;
  }
  if (field === 'introImage') snapshot.settings.introImage = url;
  if (field === 'bgMedia' && snapshot.settings.bgMedia) snapshot.settings.bgMedia.url = url;
  if (field.startsWith('elementImage:')) {
    const id = field.split(':')[1];
    const element = snapshot.elements.find(candidate => candidate.id === id);
    if (element) element.imageUrl = url;
  }
};

const getImageMimeType = (filePathOrUrl: string) => {
  const lower = filePathOrUrl.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/png';
};

const inlineIntroImageForFrameZero = async (snapshot: ExportSnapshot) => {
  const introImage = snapshot.settings.introImage;
  if (!introImage || introImage.startsWith('data:')) return;

  try {
    let buffer: Buffer | null = null;
    let mimeType = getImageMimeType(introImage);

    const url = new URL(introImage, 'http://localhost');
    const publicPath = path.join(process.cwd(), 'public', decodeURIComponent(url.pathname.replace(/^\/+/, '')));

    if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && fs.existsSync(publicPath)) {
      buffer = await fs.promises.readFile(publicPath);
      mimeType = getImageMimeType(publicPath);
    } else {
      const response = await fetch(introImage);
      if (!response.ok) return;
      const contentType = response.headers.get('content-type');
      if (contentType?.startsWith('image/')) mimeType = contentType;
      buffer = Buffer.from(await response.arrayBuffer());
    }

    if (buffer) {
      snapshot.settings.introImage = `data:${mimeType};base64,${buffer.toString('base64')}`;
    }
  } catch (error) {
    console.warn('Could not inline intro image for frame zero:', error);
  }
};

type AudioAnalysis = {
  levels: number[];
  bands: number[][];
};

const percentile = (values: number[], amount: number) => {
  if (values.length === 0) return 0;
  return values[Math.min(values.length - 1, Math.max(0, Math.floor(values.length * amount)))] || 0;
};

const extractAudioAnalysis = (input: string | null | undefined, durationSeconds: number, smoothing = 0.8) => new Promise<AudioAnalysis | null>((resolve) => {
  if (!input || !ffmpegPath) {
    resolve(null);
    return;
  }

  const sampleRate = 16000;
  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-t', String(Math.max(1, durationSeconds)),
    '-i', input,
    '-vn',
    '-ac', '1',
    '-ar', String(sampleRate),
    '-f', 's16le',
    'pipe:1',
  ];
  const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const chunks: Buffer[] = [];

  child.stdout.on('data', chunk => chunks.push(chunk));
  child.on('error', () => resolve(null));
  child.on('close', (code) => {
    if (code !== 0 || chunks.length === 0) {
      resolve(null);
      return;
    }

    const buffer = Buffer.concat(chunks);
    const sampleCount = Math.floor(buffer.length / 2);
    const samples = new Float32Array(sampleCount);
    for (let sampleIndex = 0, offset = 0; sampleIndex < sampleCount; sampleIndex += 1, offset += 2) {
      samples[sampleIndex] = buffer.readInt16LE(offset) / 32768;
    }

    const frameCount = Math.max(1, Math.ceil(durationSeconds * EXPORT_FPS));
    const sums = new Array(frameCount).fill(0);
    const counts = new Array(frameCount).fill(0);

    for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
      const frameIndex = Math.min(frameCount - 1, Math.floor((sampleIndex / sampleRate) * EXPORT_FPS));
      const sample = samples[sampleIndex];
      sums[frameIndex] += sample * sample;
      counts[frameIndex] += 1;
    }

    const rms = sums.map((sum, index) => Math.sqrt(sum / Math.max(1, counts[index])));
    const sorted = [...rms].sort((a, b) => a - b);
    const noiseFloor = sorted[Math.floor(sorted.length * 0.12)] || 0;
    const peak = sorted[Math.floor(sorted.length * 0.96)] || Math.max(...rms, 0.001);
    const dynamicRange = Math.max(0.001, peak - noiseFloor);

    const smoothingAmount = Math.min(0.7, Math.max(0.12, smoothing * 0.55));
    let previous = 0;
    const levels = rms.map((value) => {
      const gated = Math.max(0, value - noiseFloor);
      const level = Math.min(1, gated / dynamicRange);
      const compressed = Math.pow(level, 0.55);
      const smoothed = previous * smoothingAmount + compressed * (1 - smoothingAmount);
      previous = smoothed;
      return Number(smoothed.toFixed(4));
    });

    const fftSize = 256;
    const focusedBinCount = 52;
    const rawBands: number[][] = Array.from({ length: frameCount }, () => new Array(focusedBinCount).fill(0));
    const flatBands: number[] = [];
    const windowValues = Array.from({ length: fftSize }, (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, fftSize - 1)));

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const centerSample = Math.floor((frameIndex / EXPORT_FPS) * sampleRate);
      const startSample = centerSample - Math.floor(fftSize / 2);

      for (let binIndex = 0; binIndex < focusedBinCount; binIndex += 1) {
        const fftBin = binIndex + 1;
        const coeff = 2 * Math.cos((2 * Math.PI * fftBin) / fftSize);
        let s1 = 0;
        let s2 = 0;

        for (let sampleOffset = 0; sampleOffset < fftSize; sampleOffset += 1) {
          const sample = samples[startSample + sampleOffset] || 0;
          const s0 = sample * windowValues[sampleOffset] + coeff * s1 - s2;
          s2 = s1;
          s1 = s0;
        }

        const power = Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2);
        const magnitude = Math.sqrt(power) / fftSize;
        rawBands[frameIndex][binIndex] = magnitude;
        flatBands.push(magnitude);
      }
    }

    const sortedBands = flatBands.sort((a, b) => a - b);
    const bandFloor = percentile(sortedBands, 0.1);
    const bandPeak = Math.max(bandFloor + 0.0001, percentile(sortedBands, 0.965));
    const bandRange = bandPeak - bandFloor;
    const bands = rawBands.map((frameBands, frameIndex) => {
      const rawFrameLevel = Math.min(1, Math.max(0, (rms[frameIndex] - noiseFloor) / dynamicRange));
      const gate = Math.pow(rawFrameLevel, 0.35);
      return frameBands.map((value) => {
        const normalizedBand = Math.min(1, Math.max(0, (value - bandFloor) / bandRange));
        const compressed = Math.pow(normalizedBand, 0.55) * gate;
        return Number(compressed.toFixed(4));
      });
    });

    resolve({ levels, bands });
  });
});

const parseAdSceneBody = (body: Record<string, unknown>): AdScene | null => {
  const rawScene = body.scene;
  if (typeof rawScene === 'string') {
    try {
      return JSON.parse(rawScene) as AdScene;
    } catch {
      return null;
    }
  }

  return rawScene && typeof rawScene === 'object' ? rawScene as AdScene : null;
};

const isCompleteAdScene = (scene: AdScene | null): scene is AdScene => Boolean(
  scene?.id &&
  scene?.brand?.name &&
  scene?.creative?.headline,
);

const writeAdSceneRenderAssets = (
  scene: AdScene,
  files: Express.Multer.File[],
  renderId: string,
  assetDir: string,
) => {
  for (const file of files) {
    const safeName = `${file.fieldname.replace(/[^a-zA-Z0-9_-]/g, '-')}-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '-')}`;
    const filePath = path.join(assetDir, safeName);
    fs.writeFileSync(filePath, file.buffer);
    const assetUrl = `http://127.0.0.1:${port}/api/remotion-assets/${renderId}/${safeName}`;

    if (file.fieldname === 'audio' && scene.audio) {
      scene.audio = {
        ...scene.audio,
        url: assetUrl,
        mimeType: scene.audio.mimeType || file.mimetype || null,
        sourceSceneId: scene.id,
      };
    }

    if (file.fieldname === 'brandLogo') {
      scene.brand = { ...scene.brand, logoUrl: assetUrl };
    }

    if (file.fieldname === 'brandFavicon') {
      scene.brand = { ...scene.brand, faviconUrl: assetUrl };
    }
  }
};

app.post('/api/render-scene-ticket', videoExportLimiter, uploadRemotion.any(), async (req, res) => {
  const renderId = `scene-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const assetDir = path.join(remotionAssetsRoot, renderId);
  fs.mkdirSync(assetDir, { recursive: true });

  try {
    const scene = parseAdSceneBody(req.body as Record<string, unknown>);
    if (!isCompleteAdScene(scene)) {
      return res.status(400).json({ error: 'A complete ad scene is required before rendering video.' });
    }

    const files = Array.isArray(req.files) ? req.files as Express.Multer.File[] : [];
    writeAdSceneRenderAssets(scene, files, renderId, assetDir);

    const render = await renderAdSceneToMp4(scene, { timeoutMs: 105_000 });
    const ticket = await createRenderSceneTicket(render.snapshot.scene, render.file);

    res.json({
      ticketId: ticket.id,
      filename: ticket.filename,
      downloadUrl: `/api/render-scene/${ticket.id}`,
    });
  } catch (error) {
    console.error('[legacy create render-scene-ticket]', error);
    res.status(500).json({
      error: getPublicRenderErrorMessage(error, 'Could not prepare video download. Try again in a moment.'),
    });
  } finally {
    fs.rm(assetDir, { recursive: true, force: true }, () => {});
  }
});

app.get('/api/render-scene/:ticketId', videoExportLimiter, async (req, res) => {
  const ticket = await readRenderSceneTicket(req.params.ticketId);

  if (!ticket) {
    return res.status(404).json({ error: 'That video download link expired. Try Download video again.' });
  }

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="${ticket.filename}"`);
  res.setHeader('X-Wiggly-Render-Platform', ticket.scene.platform);
  res.download(ticket.filePath, ticket.filename, (error) => {
    void deleteRenderSceneTicket(ticket.id);
    if (error && !res.headersSent) {
      res.status(500).json({ error: 'Prepared video file is not available. Try Download video again.' });
    }
  });
});

app.post('/api/render-remotion', videoExportLimiter, uploadRemotion.any(), async (req, res) => {
  const renderId = `render-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const assetDir = path.join(remotionAssetsRoot, renderId);
  fs.mkdirSync(assetDir, { recursive: true });

  try {
    const snapshotRaw = typeof req.body.snapshot === 'string' ? req.body.snapshot : '';
    if (!snapshotRaw) {
      fs.rm(assetDir, { recursive: true, force: true }, () => {});
      return res.status(400).json({ error: 'Missing render snapshot.' });
    }

    const snapshot = JSON.parse(snapshotRaw) as RenderSnapshot & { durationSeconds?: number };
    const files = Array.isArray(req.files) ? req.files as Express.Multer.File[] : [];
    let audioAnalysisInput: string | null = null;

    for (const file of files) {
      const safeName = `${file.fieldname.replace(/[^a-zA-Z0-9_-]/g, '-')}-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '-')}`;
      const filePath = path.join(assetDir, safeName);
      fs.writeFileSync(filePath, file.buffer);
      if (file.fieldname === 'audio') {
        audioAnalysisInput = filePath;
      }
      const remotionAssetUrl = file.fieldname === 'introImage'
        ? `data:${file.mimetype || 'image/png'};base64,${file.buffer.toString('base64')}`
        : `http://127.0.0.1:${port}/api/remotion-assets/${renderId}/${safeName}`;
      replaceMediaUrl(snapshot, file.fieldname, remotionAssetUrl);
    }

    await inlineIntroImageForFrameZero(snapshot);

    const dimensions = getExportDimensions(snapshot.settings.platform);
    const durationCap = snapshot.settings.renderDurationCap === 'full' ? 180 : Number(snapshot.settings.renderDurationCap || 30);
    const durationSeconds = Math.max(1, Math.min(Number(snapshot.durationSeconds || 30), durationCap));
    const visualizerElement = snapshot.elements.find(element => element.type === 'visualizer');
    const cachedAudioAnalysis = snapshot.audioAnalysis?.levels?.length
      ? snapshot.audioAnalysis
      : null;
    const audioAnalysis = cachedAudioAnalysis || await extractAudioAnalysis(audioAnalysisInput || snapshot.settings.audioUrl, durationSeconds, visualizerElement?.visualizerSmoothing ?? 0.8);
    snapshot.audioAnalysis = null;
    const inputProps = {
      snapshot,
      width: dimensions.width,
      height: dimensions.height,
      durationSeconds,
      audioLevels: audioAnalysis?.levels,
      audioBands: audioAnalysis?.bands,
    };

    const serveUrl = await getRemotionBundle();
    const compositions = await getCompositions(serveUrl, { inputProps });
    const composition = compositions.find(candidate => candidate.id === 'AdRender');
    if (!composition) {
      throw new Error('Remotion composition not found.');
    }

    const outputPath = path.join(assetDir, 'render.mp4');
    await renderMedia({
      composition: {
        ...composition,
        width: dimensions.width,
        height: dimensions.height,
        fps: EXPORT_FPS,
        durationInFrames: Math.max(1, Math.ceil(durationSeconds * EXPORT_FPS)),
      },
      serveUrl,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      overwrite: true,
    });

    res.setHeader('Content-Type', 'video/mp4');
    res.download(outputPath, 'video.mp4', () => {
      fs.rm(assetDir, { recursive: true, force: true }, () => {});
    });
  } catch (error) {
    console.error('Remotion render error:', error);
    fs.rm(assetDir, { recursive: true, force: true }, () => {});
    if (!res.headersSent) {
      res.status(500).json({ error: 'Remotion render failed.' });
    }
  }
});

app.post('/api/transcribe', aiGenerationLimiter, billShield('transcription', 'TRANSCRIPTION_ENABLED'), uploadMem.single('audio'), async (req, res) => {
  if (Date.now() < transcriptionRateLimitUntil) {
    return res.status(429).json({ error: 'AI temporarily at capacity, try again in 1 min.', retryAfterSeconds: Math.ceil((transcriptionRateLimitUntil - Date.now()) / 1000) });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  if (!process.env.DEEPGRAM_API_KEY || isDisabled(process.env.DEEPGRAM_ENABLED)) {
    return res.status(500).json({ error: 'DEEPGRAM_API_KEY is not configured on the server.' });
  }

  try {
    const response = await fetch('https://api.deepgram.com/v1/listen?smart_format=true&punctuate=true&utterances=true&diarize=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': req.file.mimetype || 'audio/wav',
      },
      body: req.file.buffer
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn('Deepgram transcription rejected request:', response.status, text.slice(0, 500));
      if (response.status === 429) {
        transcriptionRateLimitUntil = Date.now() + transcriptionBackoffMs;
        return res.status(429).json({ error: 'AI temporarily at capacity, try again in 1 min.', retryAfterSeconds: 60 });
      }
      return res.status(response.status).json({ error: 'Transcription service rejected the request.' });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('Transcription error:', error);
    return sendServerError(res, 'Transcription failed. Please try again.');
  }
});



import { GoogleGenAI } from '@google/genai';
import { getMasterPrompt } from './src/lib/prompts/headline-master';
import { buildFallbackBrandBrain } from './src/lib/prompts/brand-brain';
import { hasReadableWebsiteResearch } from './src/lib/research-readability';
import {
  BRAND_BRAIN_CACHE_VERSION,
  BRAND_RESEARCH_CACHE_TTL_MS,
  addBrandBrainCache,
  brandBrainNeedsFallback,
  buildBrandReceipts,
  buildHeuristicBrandBrain,
  cleanTextField,
  generateBrandBrain,
  getBrandBrainCache,
  normalizeResearchUrl,
  normalizeStringArray,
  researchBrandWebsite,
  type BrandAssets,
  type BrandBrain,
} from './src/server/brand-research';

import { AdGenerationError, generateAdStreamResponse } from './src/server/ad-generation';
import {
  DialogueGenerationError,
  generateDialogueAudioResponse,
  generateDialogueScriptsResponse,
} from './src/server/dialogue-generation';

app.post('/api/research-brand', brandResearchLimiter, billShield('brandResearch', 'BRAND_RESEARCH_ENABLED'), async (req, res) => {
  try {
    const websiteUrl = normalizeResearchUrl(req.body?.websiteUrl);
    const fallbackAnswers = Array.isArray(req.body?.fallbackAnswers)
      ? req.body.fallbackAnswers.map((answer: unknown) => cleanTextField(answer, 240)).filter(Boolean).slice(0, 3)
      : [];
    const brainCacheKey = `${BRAND_BRAIN_CACHE_VERSION}::${websiteUrl.href}::${fallbackAnswers.join('|').toLowerCase()}`;
    const cachedBrain = getBrandBrainCache(brainCacheKey);
    if (cachedBrain?.brandBrain.brandAssets) {
      return res.json({ needsFallback: false, brandBrain: cachedBrain.brandBrain });
    }

    let researchText = '';
    let brandLogoUrl = '';
    let brandAssets: BrandAssets | undefined;
    try {
      const research = await researchBrandWebsite(websiteUrl);
      researchText = research.researchText;
      brandLogoUrl = research.logoUrl || '';
      brandAssets = research.brandAssets;
      if (!hasReadableWebsiteResearch(research) && fallbackAnswers.length < 3) {
        return res.status(422).json({
          error: 'Wiggly could not find enough readable words on that website to make brand-based ads. Try a public marketing page or a more specific page from the same brand.',
        });
      }
    } catch (error) {
      console.warn('[brand-research] scrape_failed', websiteUrl.href, error instanceof Error ? error.message : error);
      return res.status(502).json({
        error: 'Wiggly could not read that website clearly enough to make ads. Try again, or use a different page from the same brand.',
      });
    }

    if (!researchText && fallbackAnswers.length >= 3) {
      const fallbackBrandBrain = buildFallbackBrandBrain({ websiteUrl: websiteUrl.href, answers: fallbackAnswers });
      const fallbackWithAssets = brandAssets
        ? { ...fallbackBrandBrain, brandAssets, brandLogoUrl: brandAssets.images.logo || undefined }
        : fallbackBrandBrain;
      return res.json({
        needsFallback: false,
        brandBrain: { ...fallbackWithAssets, receipts: buildBrandReceipts(fallbackWithAssets) },
      });
    }

    let brandBrain: BrandBrain;
    try {
      brandBrain = await generateBrandBrain(websiteUrl.href, researchText, fallbackAnswers, brandLogoUrl);
      if (brandAssets) {
        brandBrain = {
          ...brandBrain,
          brandAssets,
          brandLogoUrl: brandBrain.brandLogoUrl || brandAssets.images.logo || brandLogoUrl || undefined,
        };
      }
      brandBrain = { ...brandBrain, receipts: buildBrandReceipts(brandBrain) };
      if (brandBrainNeedsFallback(brandBrain)) {
        console.warn('[brand-research] brain_low_confidence_using_heuristic', websiteUrl.href);
        brandBrain = buildHeuristicBrandBrain({
          websiteUrl,
          researchText,
          brandAssets,
          brandLogoUrl,
        });
        brandBrain = { ...brandBrain, receipts: buildBrandReceipts(brandBrain) };
      }
    } catch (error) {
      console.warn('[brand-research] brain_failed', websiteUrl.href, error instanceof Error ? error.message : error);
      brandBrain = buildHeuristicBrandBrain({
        websiteUrl,
        researchText,
        brandAssets,
        brandLogoUrl,
      });
      brandBrain = { ...brandBrain, receipts: buildBrandReceipts(brandBrain) };
    }

    if (brandBrainNeedsFallback(brandBrain)) {
      return res.status(422).json({
        error: 'Wiggly read the website, but could not confidently identify the offer, audience, and ad angles. Try a more specific page from the same brand.',
      });
    }

    addBrandBrainCache(brainCacheKey, {
      expiresAt: Date.now() + BRAND_RESEARCH_CACHE_TTL_MS,
      brandBrain,
    });
    return res.json({ needsFallback: false, brandBrain });
  } catch (error: any) {
    console.error('Research brand error:', error);
    return res.status(400).json({ error: error?.message || 'Could not research that website.' });
  }
});

app.post('/api/generate-ad-stream', adStreamLimiter, billShield('adStream'), async (req, res) => {
  try {
    return res.json(await generateAdStreamResponse(req.body));
  } catch (error: any) {
    if (error instanceof AdGenerationError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Generate ad stream error:', error);
    return sendServerError(res, 'Could not generate ad variations.');
  }
});

app.post('/api/generate-headlines', aiGenerationLimiter, billShield('headlines'), async (req, res) => {
  try {
    const { niche } = req.body;
    const count = Math.min(20, Math.max(1, Number(req.body?.count) || 20));

    const key = process.env.GEMINI_API_KEY;
    if (!key || isDisabled(process.env.GEMINI_ENABLED)) {
      throw new Error("GEMINI_API_KEY is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: key });

    const prompt = `${getMasterPrompt(niche)}

Generate ${count} headlines mixed across frameworks A-J. 
Return ONLY a JSON array: [{"text": "...", "framework": "A"}, ...]
No prose. No explanation. Just the JSON array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '[]';
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Generate headlines error:", error);
    sendServerError(res, 'Error generating headlines.');
  }
});

app.post('/api/generate-copy', aiGenerationLimiter, billShield('copy'), async (req, res) => {
  try {
    const { businessContext } = req.body;
    
    const key = process.env.GEMINI_API_KEY;
    if (!key || isDisabled(process.env.GEMINI_ENABLED)) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    
    // Fallback to fetch if required or let SDK handle it.
    const ai = new GoogleGenAI({ apiKey: key });
    
    const prompt = `# DENTAL HEADLINE GENERATOR

## ROLE
Direct-response copywriter. 10,000+ winning Meta ad headlines for dental clinic owners. Write like Schwartz, Ogilvy, Goff. Pain-aware, specific, scroll-stopping.

## THE READER
Dr. Michael Carter, 42. Owns his practice. Makes $450k/year, feels stuck. On his couch at 9pm Tuesday, scrolling Instagram, tired, just lost 3 patients to missed calls today.

**His real pain:**
- Front desk is the bottleneck, can't fix it
- Hired more, paid more, trained more — nothing sticks
- Watching competitors grow while he's stuck
- Doesn't want more leads — wants to stop bleeding the ones he has

**Already tried (don't pitch):** more receptionists, call centers, marketing agencies, software.

**Secret beliefs (break or weaponize one):**
- "More leads will fix it"
- "I just need better staff"
- "AI will sound robotic"
- "Growth requires more employees"

## THE OFFER
AI front desk. 24/7. Answers, books, follows up. Sounds human. Fixes the $10k-50k/month silent revenue leak.

## RULES
1. **Hit the pain in the first 5 words.** No setup.
2. **Specific numbers, not vague claims.** "$14,000/month" beats "lose fewer calls."
3. **Name the enemy, not the solution.**
4. **Speak the inner monologue, not the surface complaint.**
5. **Break a belief in the headline itself.**
6. **Contrast/curiosity, not hype.** No "revolutionary."
7. **Max 12 words.**
8. **Sell removal of pain, not the AI.**

## HOOK FRAMEWORKS (Pick one for the headline)
**A. Math Bomb** — "3 missed calls a day = $147,000/year gone."
**B. Calling-Out** — "You don't have a marketing problem. You have a front desk problem."
**C. Belief-Break** — "Hiring another receptionist won't fix this. Here's why."
**D. Comparison-Shame** — "The dentist across town isn't smarter. He just answers his phone."
**E. Specific-Day Pain** — "Every Tuesday at 4:47pm, you lose a $3,200 case."
**F. Whisper-Doubt** — "You know your front desk is the bottleneck. You don't know what to do."
**G. Identity Reframe** — "Smart dentists stopped hiring receptionists in 2026."
**H. Reverse-Promise** — "Not for dentists who think more marketing fixes everything."
**I. Status-Quo Cost** — "Every month you wait, you lose another $12k."
**J. Specific-Win** — "Dr. Patel added $61k last month. Here's how."

## NEVER
- "Revolutionary," "game-changing," "cutting-edge"
- "Are you a dentist who..." / "Are you tired of..."
- "Boost your practice" / "grow your business"
- Make him feel stupid for not solving this yet

## THE TEST
Before outputting: "Would Dr. Carter, scrolling at 9:47pm Tuesday after a $3k loss day, stop his thumb?" If no, rewrite.

## OUTPUT FORMAT
Generate a single headline using one of the Hook Frameworks, and a matching sub-headline. Use the business context to flavor the copy.
Business Context:
"${businessContext}"

Return valid JSON with the following structure:
{
  "headline": "<your chosen headline, max 12 words>",
  "subhead": "<a compelling sub-headline expanding on the headline, max 15 words>"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: "OBJECT",
          properties: {
            headline: { type: "STRING" },
            subhead: { type: "STRING" },
          },
          required: ["headline", "subhead"],
        },
      }
    });

    if (!response.text) {
      return res.status(500).json({ error: "No text returned from Gemini." });
    }

    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error("Generate error:", error);
    sendServerError(res, 'Error generating copy.');
  }
});

app.post('/api/generate-dialogue-scripts', aiGenerationLimiter, billShield('dialogueScripts'), async (req, res) => {
  try {
    return res.json(await generateDialogueScriptsResponse(req.body));
  } catch (error: any) {
    if (error instanceof DialogueGenerationError) {
      return res.status(error.status).json(error.toResponseBody());
    }
    console.error("Generate dialogue scripts error:", error);
    return sendServerError(res, 'Error generating dialogue scripts.');
  }
});

app.post('/api/generate-dialogue-audio', aiGenerationLimiter, billShield('dialogueAudio', 'TTS_ENABLED'), async (req, res) => {
  try {
    return res.json(await generateDialogueAudioResponse(req.body));
  } catch (error: any) {
    if (error instanceof DialogueGenerationError) {
      return res.status(error.status).json(error.toResponseBody());
    }
    console.error("Generate dialogue audio error:", error);
    return sendServerError(res, 'Error generating dialogue audio.', error);
  }
});

if (isProd) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Request error:', err);

  if (res.headersSent) return;

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Uploaded file is too large.'
      : 'File upload failed.';
    res.status(400).json({ error: message });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Invalid JSON request body.' });
    return;
  }

  res.status(400).json({ error: 'Request could not be processed.' });
};

app.use(errorHandler);

app.listen(port, '0.0.0.0', () => {
  console.log(`Express server running on port ${port}`);
});
