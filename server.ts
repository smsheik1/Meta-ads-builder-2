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
const PINNED_TTS_MODEL = 'gemini-3.1-flash-tts-preview';
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
import { buildHeadlineVariationsPrompt, type ConversationAdLine, type GeneratedAdFormat, type HeadlineVariation } from './src/lib/prompts/headline-variations';
import { normalizeAdAngles } from './src/lib/prompts/ad-angles';
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
  normalizeBrandBrain,
  normalizeBrandReceipts,
  normalizeResearchUrl,
  normalizeStringArray,
  parseJsonResponse,
  researchBrandWebsite,
  withTimeout,
  type BrandAssets,
  type BrandBrain,
  type BrandReceipts,
} from './src/server/brand-research';

const HEADLINE_VARIATION_MODEL = 'gemini-3.1-flash-lite';
const GROQ_DIALOGUE_MODELS = [
  'llama-3.3-70b-versatile',
  'qwen/qwen3-32b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.1-8b-instant',
];
const OPENROUTER_PREMIUM_DIALOGUE_MODELS = [
  'moonshotai/kimi-k2.6',
  'moonshotai/kimi-k2.6:free',
];
const OPENROUTER_FREE_DIALOGUE_MODELS = [
  'liquid/lfm-2.5-1.2b-instruct:free',
  'openai/gpt-oss-20b:free',
  'openrouter/auto:free',
];
const DIALOGUE_PROVIDER_TIMEOUT_MS = 25000;
const GEMINI_DIALOGUE_MODEL = 'gemini-3-flash-preview';
const DIALOGUE_MODEL_OPTIONS = new Set([
  'auto',
  'local',
  `gemini:${GEMINI_DIALOGUE_MODEL}`,
  ...GROQ_DIALOGUE_MODELS.map((model) => `groq:${model}`),
  ...OPENROUTER_PREMIUM_DIALOGUE_MODELS.map((model) => `openrouter:${model}`),
  ...OPENROUTER_FREE_DIALOGUE_MODELS.map((model) => `openrouter:${model}`),
]);
const HEADLINE_MODEL_OPTIONS = new Set([
  'auto',
  'local',
  `gemini:${HEADLINE_VARIATION_MODEL}`,
  ...GROQ_DIALOGUE_MODELS.map((model) => `groq:${model}`),
  ...OPENROUTER_FREE_DIALOGUE_MODELS.map((model) => `openrouter:${model}`),
]);
const HEADLINE_VARIATION_TIMEOUT_MS = 20000;
const normalizeHeadline = (value: unknown) => cleanTextField(value, 96)
  .replace(/["“”]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const headlineWordCount = (headline: string) => headline.split(/\s+/).filter(Boolean).length;

const isUsableHeadline = (headline: string, brandBrain: BrandBrain, previous: Set<string>) => {
  const words = headlineWordCount(headline);
  if (words < 4 || words > 12) return false;
  const lower = headline.toLowerCase();
  if (previous.has(lower)) return false;
  if (/\bwiggly\b/i.test(headline)) return false;
  if (/^why\s+(people|customers|clients|shoppers|buyers)\s+choose\b/i.test(headline)) return false;
  if (/^what\s+makes\b.+\bworth\s+(noticing|choosing|trying)\b/i.test(headline)) return false;
  if (/\b(one\s+clear\s+reason|useful\s+part\s+of|should\s+be\s+easy\s+to\s+understand)\b/i.test(headline)) return false;
  if (/\b(before\s+they\s+scroll|reason\s+to\s+stop\s+scrolling|first\s+frame|the\s+hook)\b/i.test(headline)) return false;
  if (/^(show|make|turn|lead\s+with|start\s+with|give)\b/i.test(headline) && /\b(ad|offer|proof|pitch|hook|first frame|reason|decision)\b/i.test(headline)) return false;
  if (/\b(they|people|buyers|shoppers|customers|clients|patients)\s+need\s+a\s+clear\b/i.test(headline)) return false;
  if (/\bneed\s+a\s+clear\s+is\b/i.test(headline)) return false;
  if (/\b[a-z]+\s+is\s+getting expensive$/i.test(headline) && words < 6) return false;
  if (/\b(hijack|hack|steal|trick|game|exploit|dominate)\b/i.test(headline)) return false;
  return !(brandBrain.bannedGenericPhrases || []).some((phrase) => phrase && lower.includes(phrase.toLowerCase()));
};

const normalizeFormatMix = (value: unknown): GeneratedAdFormat[] => {
  if (!Array.isArray(value)) return ['visualizer'];
  const allowed: GeneratedAdFormat[] = ['visualizer', 'conversation'];
  const formats = value
    .map((item) => String(item || '').trim())
    .filter((item): item is GeneratedAdFormat => allowed.includes(item as GeneratedAdFormat))
    .filter((item, index, list) => list.indexOf(item) === index);
  return formats.length ? formats : ['visualizer'];
};

const pickGeneratedAdFormat = (formats: GeneratedAdFormat[], index: number): GeneratedAdFormat => {
  if (formats.length === 1) return formats[0];
  if (formats.includes('conversation') && formats.includes('visualizer')) {
    return index % 3 === 1 ? 'conversation' : 'visualizer';
  }
  return formats[index % formats.length] || 'visualizer';
};

const shortConversationPhrase = (value: unknown, fallback: string) => {
  const phrase = cleanTextField(value, 140)
    .replace(/[^\w\s$%'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return phrase.split(/\s+/).filter(Boolean).slice(0, 10).join(' ') || fallback;
};

const buildConversationLines = (brandBrain: BrandBrain, headline: string, angle: string, index: number): ConversationAdLine[] => {
  const pain = shortConversationPhrase(brandBrain.pain, 'this problem keeps showing up');
  const offer = shortConversationPhrase(brandBrain.offer, 'the better option');
  const result = shortConversationPhrase(brandBrain.promisedResult, 'the outcome people want');
  const differentiator = shortConversationPhrase(brandBrain.differentiator, 'the part that makes it easier');
  const audience = shortConversationPhrase(brandBrain.audience, 'the people this is for');
  const proof = (brandBrain.proof || []).map((item) => shortConversationPhrase(item, '')).filter(Boolean);
  const proofLine = proof[index % Math.max(proof.length, 1)] || differentiator;
  const starters = [
    `I keep seeing ${pain}.`,
    `${audience} are tired of ${pain}.`,
    `This is the part people usually ignore.`,
  ];
  const reveals = [
    `${offer} makes ${result} feel easier.`,
    `The hook is simple, ${proofLine}.`,
    `${differentiator} is the thing worth showing first.`,
  ];
  const followUps = [
    `So the ad should say ${headline.toLowerCase()}?`,
    `That is more specific than another generic product claim.`,
    `That gives people a reason to stop scrolling.`,
  ];
  const closers = [
    `Exactly. Make the angle obvious before they scroll.`,
    `Yes. Show the useful part, then let the voice carry it.`,
    `Right. The finished ad should feel ready to test.`,
  ];

  return [
    { speaker: 'Alex', text: starters[index % starters.length] },
    { speaker: 'Jordan', text: reveals[index % reveals.length] },
    { speaker: 'Alex', text: followUps[index % followUps.length] },
    { speaker: 'Jordan', text: closers[index % closers.length] },
  ];
};

const fallbackHeadlines = (brandBrain: BrandBrain, count: number, previous: Set<string>): HeadlineVariation[] => {
  const angles = normalizeAdAngles(brandBrain);
  const seen = new Set(previous);
  const shortPhrase = (value: unknown, maxWords: number, fallback: string) => {
    const phrase = cleanTextField(value, 90)
      .replace(/[^\w\s$%'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = phrase.split(/\s+/).filter(Boolean);
    const clipped = words.slice(0, maxWords).join(' ');
    if (/^(they|people|buyers|shoppers|customers|clients|patients)\s+need\s+a\s+clear\b/i.test(clipped)) return fallback;
    if (/\bneed\s+a\s+clear$/i.test(clipped)) return fallback;
    return clipped || fallback;
  };
  const proof = (brandBrain.proof || []).map((item) => shortPhrase(item, 5, '')).filter(Boolean).slice(0, 8);
  const brandName = (cleanTextField(brandBrain.businessName, 42) || 'Your brand').split(':')[0]?.trim() || 'Your brand';
  const briefText = `${brandName} ${brandBrain.offer} ${brandBrain.audience} ${brandBrain.pain} ${brandBrain.differentiator}`.toLowerCase();
  const isMedspa = /\b(medspa|skin|laser|aesthetic|rejuvenation|botox|facial|acne)\b/.test(briefText);
  const isFood = /\b(cookie|cookies|bakery|baked|dessert|cheesecake|cake|cakes|brownie|brownies|gift|gifting|delivery|snack|sweet)\b/.test(briefText);
  const isAthleticWear = /\b(nike|athlete|athletes|sport|sports|training|running|runner|basketball|workout|gym|activewear|apparel|footwear|shoe|shoes|sneaker|sneakers|gear)\b/.test(briefText);
  const isPublicConversation = /\b(public conversation|global town square|breaking news|news sharing|real-time|real time|world leaders|creators|journalists|culture|markets)\b/.test(briefText);
  const categoryTemplates = isPublicConversation ? [
    'News before it becomes news',
    'The conversation starts before the recap',
    'Where culture moves in real time',
    'Public conversation while it is still moving',
    'A front row seat to live events',
    'Hear it from the people involved',
    'The room where the internet reacts first',
    'Breaking context without the delay',
    'Follow the signal before the summary',
    'The feed where markets feel it first',
    'Real-time reactions before the headlines',
    'The town square never waits',
    'Creators watch the room here',
    'The update before the article',
    'Conversation before the media cycle',
    `${brandName} shows the room in real time`,
    `${brandName} moves before the recap`,
    `${brandName} is where culture reacts`,
    `${brandName} makes public conversation instant`,
  ] : isMedspa ? [
    'Know your skin treatment before you book',
    'Premium skin care should feel clear',
    'Choose the treatment your skin actually needs',
    'Smoother skin starts with the right plan',
    'Laser care without the guessing',
    'Make your next skin visit feel obvious',
    `${brandName} makes skin care feel guided`,
    `Book ${brandName} with more confidence`,
    'The right medspa choice starts here',
    'Stop guessing which treatment fits',
    'Skin goals deserve a clearer plan',
    'Feel confident before your appointment',
    'A better skin consult starts here',
    'Make the next treatment choice simple',
    'Premium laser care without the confusion',
    'Turn skin goals into a clearer plan',
    'The medspa visit should feel guided',
    'Know what to book before you book',
    'Clearer skin decisions start here',
    'Show the treatment before the pitch',
    'Your skin plan should feel personal',
    'A premium skin visit starts with clarity',
    'Make the consultation feel easy',
    'Give skin goals a smarter next step',
  ] : isFood ? [
    'Cookies that arrive ready to impress',
    'Send dessert without overthinking it',
    'The gift that actually gets opened',
    'Fresh cookies beat another boring gift',
    'Make the dessert table disappear first',
    'Warm cookie energy without the baking',
    'Give them cookies they remember',
    'Skip the card and send cookies',
    'Cookie delivery for the sweet tooth',
    'A better gift starts with dessert',
    'Dessert delivery should feel this easy',
    'The cookie box everyone notices',
    'Bring the bakery feeling home',
    'Make the thank you taste better',
    'Cookies make the occasion easier',
    'A sweeter way to show up',
    'Send the treat they actually want',
    'The easiest yes is dessert',
    'Make cookie delivery feel special',
    `${brandName} delivers the good part`,
    `${brandName} makes gifting sweeter`,
    `${brandName} brings dessert to them`,
    `${brandName} turns delivery into dessert`,
    `${brandName} makes cookies giftable`,
  ] : isAthleticWear ? [
    'Gear that keeps up with your pace',
    'Train like the outfit is ready',
    'The run starts before the first step',
    'Built for the days you show up',
    'Performance gear with everyday style',
    'Move better in gear that works',
    'Your workout deserves better gear',
    'From warmup to whatever comes next',
    'Shoes that make movement feel easier',
    'Athletic style that earns the miles',
    'Ready for the run and the rest',
    'Dress like the workout already started',
    'The gear should never slow you down',
    'Made for motion, worn all day',
    'Feel ready before you start moving',
    'The next workout starts with gear',
    `${brandName} gear built for movement`,
    `${brandName} makes training feel ready`,
    `${brandName} brings performance into everyday style`,
    `${brandName} keeps pace with the work`,
    `${brandName} turns gear into momentum`,
  ] : [
    `Choose ${brandName} with more confidence`,
    `A sharper reason to try ${brandName}`,
    `${brandName} makes the next step easier`,
    `${brandName} turns confusion into clarity`,
    `${brandName} helps people choose faster`,
    `${brandName} gives the problem a cleaner answer`,
    `${brandName} makes the old way feel outdated`,
  ];
  const templates = [
    ...categoryTemplates,
    `Make ${brandName} easy to trust`,
    `Make the next step feel simple`,
    `The old workaround is expensive`,
    `Make the hard part visible`,
  ];

  proof.forEach((proofPoint) => {
    templates.push(`${proofPoint} makes the choice easier`);
    templates.push(`${proofPoint} is worth remembering`);
  });
  angles.forEach((angle) => {
    const clippedAngle = shortPhrase(angle, 5, '');
    if (!clippedAngle) return;
    templates.push(`Make ${clippedAngle} feel obvious`);
  });

  const fallbacks: HeadlineVariation[] = [];
  const addHeadline = (value: string) => {
    if (fallbacks.length >= count) return;
    const headline = normalizeHeadline(value);
    if (!isUsableHeadline(headline, brandBrain, seen)) return;
    seen.add(headline.toLowerCase());
    fallbacks.push({
      id: `fallback-${fallbacks.length + 1}`,
      angle: angles[fallbacks.length % Math.max(angles.length, 1)] || 'core promise',
      headline,
    });
  };

  templates.forEach(addHeadline);
  let safety = 1;
  while (fallbacks.length < count && safety <= count * 3) {
    addHeadline(`A sharper reason to stop scrolling ${safety}`);
    safety += 1;
  }

  return fallbacks.slice(0, count);
};

const normalizeHeadlineModelChoice = (value: unknown) => {
  const choice = String(value || 'auto').trim();
  return HEADLINE_MODEL_OPTIONS.has(choice) ? choice : 'auto';
};

const getHeadlineModelProvider = (choice: string) => {
  if (choice === 'local') return 'local';
  if (choice.startsWith('groq:')) return 'groq';
  if (choice.startsWith('openrouter:')) return 'openrouter';
  if (choice.startsWith('gemini:')) return 'gemini';
  return 'auto';
};

const getHeadlineModelName = (choice: string) => choice.split(':').slice(1).join(':');

const normalizeHeadlineVariations = (value: any) => {
  const parsed = Array.isArray(value) ? value : value?.variations || [];
  return Array.isArray(parsed) ? parsed : [];
};

const generateHeadlineVariationsWithGroq = async (brandBrain: BrandBrain, count: number, modelChoices = GROQ_DIALOGUE_MODELS) => {
  const key = process.env.GROQ_API_KEY;
  if (!key || isDisabled(process.env.GROQ_ENABLED)) return { variations: [], model: '' };
  const prompt = buildHeadlineVariationsPrompt({ brandBrain, count });

  for (const model of modelChoices) {
    let timeout: NodeJS.Timeout | undefined;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), HEADLINE_VARIATION_TIMEOUT_MS);
      const response = await withTimeout(
        fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_completion_tokens: 3000,
          }),
          signal: controller.signal,
        }),
        HEADLINE_VARIATION_TIMEOUT_MS,
        `Groq headline generation (${model})`,
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.warn('Groq headline model failed:', model, response.status, String(payload?.error?.message || '').slice(0, 180));
        continue;
      }

      const text = String(payload?.choices?.[0]?.message?.content || '{"variations":[]}');
      const variations = normalizeHeadlineVariations(parseJsonResponse(text));
      if (variations.length) {
        console.info('Groq headline generation succeeded:', model);
        return { variations, model };
      }
    } catch (error: any) {
      console.warn('Groq headline generation error:', model, String(error?.message || error).slice(0, 180));
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  return { variations: [], model: '' };
};

const generateHeadlineVariationsWithOpenRouter = async (brandBrain: BrandBrain, count: number, modelChoices = OPENROUTER_FREE_DIALOGUE_MODELS) => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || isDisabled(process.env.OPENROUTER_ENABLED)) return { variations: [], model: '' };
  const prompt = buildHeadlineVariationsPrompt({ brandBrain, count });

  for (const model of modelChoices) {
    if (!model.endsWith(':free')) continue;
    let timeout: NodeJS.Timeout | undefined;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), HEADLINE_VARIATION_TIMEOUT_MS);
      const response = await withTimeout(
        fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'Wiggly',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 3000,
          }),
          signal: controller.signal,
        }),
        HEADLINE_VARIATION_TIMEOUT_MS,
        `OpenRouter headline generation (${model})`,
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.warn('OpenRouter headline model failed:', model, response.status, String(payload?.error?.message || '').slice(0, 180));
        continue;
      }

      const text = String(payload?.choices?.[0]?.message?.content || '{"variations":[]}');
      const variations = normalizeHeadlineVariations(parseJsonResponse(text));
      if (variations.length) {
        console.info('OpenRouter headline generation succeeded:', model);
        return { variations, model };
      }
    } catch (error: any) {
      console.warn('OpenRouter headline generation error:', model, String(error?.message || error).slice(0, 180));
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  return { variations: [], model: '' };
};

const generateHeadlineVariationsWithGemini = async (brandBrain: BrandBrain, count: number) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || isDisabled(process.env.GEMINI_ENABLED)) throw new Error('GEMINI_API_KEY is not set.');
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await withTimeout(ai.models.generateContent({
    model: HEADLINE_VARIATION_MODEL,
    contents: buildHeadlineVariationsPrompt({ brandBrain, count }),
    config: {
      responseMimeType: 'application/json',
    },
  }), HEADLINE_VARIATION_TIMEOUT_MS, 'Headline generation');
  const parsed = parseJsonResponse(response.text || '{"variations": []}');
  return {
    variations: normalizeHeadlineVariations(parsed),
    model: HEADLINE_VARIATION_MODEL,
  };
};

const generateHeadlineVariations = async (brandBrain: BrandBrain, count: number, modelChoice = 'auto') => {
  const selectedModel = normalizeHeadlineModelChoice(modelChoice);
  const selectedProvider = getHeadlineModelProvider(selectedModel);
  const selectedModelName = getHeadlineModelName(selectedModel);

  if (selectedProvider === 'local') {
    return { variations: [], provider: 'local', model: 'local', selectedModel, fallback: true };
  }

  if (selectedProvider === 'groq' || selectedProvider === 'auto') {
    const result = await generateHeadlineVariationsWithGroq(
      brandBrain,
      count,
      selectedProvider === 'groq' ? [selectedModelName] : GROQ_DIALOGUE_MODELS,
    );
    if (result.variations.length) {
      return { variations: result.variations, provider: 'groq-free', model: result.model, selectedModel };
    }
    if (selectedProvider === 'groq') {
      return { variations: [], provider: 'local', model: 'local', selectedModel, fallback: true };
    }
  }

  if (selectedProvider === 'openrouter' || selectedProvider === 'auto') {
    const result = await generateHeadlineVariationsWithOpenRouter(
      brandBrain,
      count,
      selectedProvider === 'openrouter' ? [selectedModelName] : OPENROUTER_FREE_DIALOGUE_MODELS,
    );
    if (result.variations.length) {
      return { variations: result.variations, provider: 'openrouter-free', model: result.model, selectedModel };
    }
    if (selectedProvider === 'openrouter') {
      return { variations: [], provider: 'local', model: 'local', selectedModel, fallback: true };
    }
  }

  if (selectedProvider === 'gemini' && selectedModelName !== HEADLINE_VARIATION_MODEL) {
    return { variations: [], provider: 'local', model: 'local', selectedModel, fallback: true };
  }

  if (selectedProvider === 'gemini' || selectedProvider === 'auto') {
    const result = await generateHeadlineVariationsWithGemini(brandBrain, count);
    if (result.variations.length) {
      return { variations: result.variations, provider: 'gemini', model: result.model, selectedModel };
    }
  }

  return { variations: [], provider: 'local', model: 'local', selectedModel, fallback: true };
};

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
    const rawBrandBrain = req.body?.brandBrain;
    if (!rawBrandBrain || typeof rawBrandBrain !== 'object') {
      return res.status(400).json({ error: 'brandBrain is required.' });
    }

    const websiteUrl = cleanTextField(rawBrandBrain.websiteUrl, 240) || 'https://example.com';
    const brandBrain = normalizeBrandBrain(rawBrandBrain, websiteUrl, cleanTextField(rawBrandBrain.brandLogoUrl, 500));
    const totalCount = Math.min(50, Math.max(10, Number(req.body?.count) || 50));
    const formatMix = normalizeFormatMix(req.body?.formatMix);
    const selectedModel = normalizeHeadlineModelChoice(req.body?.model);
    const used = new Set<string>();
    const variations: HeadlineVariation[] = [];
    let provider = '';
    let model = '';

    let rawVariations: any[] = [];
    try {
      const generation = await generateHeadlineVariations(brandBrain, totalCount, selectedModel);
      rawVariations = generation.variations;
      provider = generation.provider;
      model = generation.model;
      if (generation.fallback) {
        return res.status(503).json({
          error: 'Ad writing failed before usable AI headlines were created. Try another model or try again in a moment.',
        });
      }
    } catch (error) {
      console.warn('[ad-stream] headline_generation_failed', error instanceof Error ? error.message : error);
      return res.status(503).json({
        error: 'Ad writing failed before usable AI headlines were created. Try another model or try again in a moment.',
      });
    }

    rawVariations.forEach((item) => {
      const headline = normalizeHeadline(item?.headline ?? item?.text ?? item);
      if (!isUsableHeadline(headline, brandBrain, used)) return;
      used.add(headline.toLowerCase());
      const format = pickGeneratedAdFormat(formatMix, variations.length);
      variations.push({
        id: `variation-${variations.length + 1}`,
        angle: cleanTextField(item?.angle, 160) || normalizeAdAngles(brandBrain)[variations.length % normalizeAdAngles(brandBrain).length] || 'core promise',
        headline,
        format,
        conversationLines: format === 'conversation'
          ? buildConversationLines(
            brandBrain,
            headline,
            cleanTextField(item?.angle, 160) || normalizeAdAngles(brandBrain)[variations.length % normalizeAdAngles(brandBrain).length] || 'core promise',
            variations.length
          )
          : undefined,
      });
    });

    if (variations.length < totalCount) {
      fallbackHeadlines(brandBrain, totalCount - variations.length, used).forEach((item) => {
        const headline = normalizeHeadline(item.headline);
        if (!isUsableHeadline(headline, brandBrain, used)) return;
        used.add(headline.toLowerCase());
        const format = pickGeneratedAdFormat(formatMix, variations.length);
        variations.push({
          ...item,
          id: `variation-${variations.length + 1}`,
          headline,
          format,
          conversationLines: format === 'conversation'
            ? buildConversationLines(brandBrain, headline, item.angle, variations.length)
            : undefined,
        });
      });
    }

    if (!variations.length) {
      return res.status(503).json({
        error: 'Ad writing returned no usable headlines. Try another model or try again in a moment.',
      });
    }

    return res.json({
      brandBrain,
      variations: variations.slice(0, totalCount),
      provider,
      model,
      selectedModel,
      fallback: false,
    });
  } catch (error: any) {
    console.error('Generate ad stream error:', error);
    return sendServerError(res, 'Could not generate ad variations.');
  }
});

const gibberishPattern = /\b(?:[bcdfghjklmnpqrstvwxyz]{4,}|(?:asdf|sdfg|qwer|zxcv|hjkl|lorem|ipsum)[a-z]*)\b/i;
const forcedNegationPattern = /\b(?:not this|not that|not because|not more|not another|it'?s not|this isn'?t|don'?t just|stop (?:trying|doing|using|making))\b/i;
const staccatoPattern = /(?:^|[.!?]\s+)(?:[A-Z][a-z]{2,12}\. ){2,}/;
const copiedDialogueExamplePattern = /\b(?:q4 ad invoice|fourteen grand|meta auction|we stopped trying to win every|where are the buyers coming from|recommendation searches|three good booking requests|that is the leak|best leads arrive|busy hours into booked slots|catch those moments and book|serum sold out|sensitive skin|glossy product claim|friend explaining it|d2c operators texting|local service owner and employee|skincare founder and friend)\b/i;
const bannedAdBuzzwordPattern = /\b(?:game[- ]changer|revolutionary|cutting[- ]edge|unlock your potential|take it to the next level|transform your business)\b/i;
const bannedDialogueShapePattern = /\b(?:this tool|is it working|will that really make a difference|i'?m worried|i don'?t understand|how did you do it\??|how does it work\??|what kind of results did you see\??|what'?s your secret|what'?s a better way|what'?s the best way)\b/i;

const cleanHumanDialogueText = (value: unknown) => String(value || '')
  .replace(/[—–]/g, ', ')
  .replace(/\s+/g, ' ')
  .trim();

const hasGarbageText = (value: unknown) => {
  const text = String(value || '').trim();
  return (
    !text ||
    gibberishPattern.test(text) ||
    /\bwiggly\b/i.test(text) ||
    /[—–]/.test(text) ||
    forcedNegationPattern.test(text) ||
    staccatoPattern.test(text) ||
    copiedDialogueExamplePattern.test(text) ||
    bannedAdBuzzwordPattern.test(text) ||
    bannedDialogueShapePattern.test(text)
  );
};

const normalizeDialogueScripts = (payload: any, count: number) => {
  const rawScripts = Array.isArray(payload?.scripts) ? payload.scripts : [];

  return rawScripts
    .map((script: any) => {
      const lines = Array.isArray(script?.lines)
        ? script.lines
            .map((line: any, index: number) => ({
              speaker: String(line?.speaker || (index % 2 === 0 ? 'Ava' : 'Sam')).trim(),
              tone: String(line?.tone || 'natural').trim(),
              text: cleanHumanDialogueText(line?.text),
            }))
            .filter((line: any) => {
              const words = line.text.split(/\s+/).filter(Boolean);
              return words.length >= 3 && words.length <= 28 && !hasGarbageText(line.text);
            })
        : [];

      return {
        title: cleanHumanDialogueText(script?.title || 'Conversation option'),
        angle: cleanHumanDialogueText(script?.angle || 'Problem and solution'),
        lines,
      };
    })
    .filter((script: any) => {
      const combined = [
        script.title,
        script.angle,
        ...script.lines.map((line: any) => line.text),
      ].join(' ');
      const repeatsSpeaker = script.lines.some((line: any, index: number) => (
        index > 0 && line.speaker.toLowerCase() === script.lines[index - 1].speaker.toLowerCase()
      ));
      return script.lines.length >= 4 && !repeatsSpeaker && !hasGarbageText(combined);
    })
    .slice(0, count);
};

const asBriefString = (brief: any, key: string, fallback = '') => {
  const value = typeof brief === 'object' && brief ? brief[key] : '';
  return String(value || fallback).replace(/\s+/g, ' ').trim();
};

const getBriefReceipts = (brief: any): BrandReceipts => normalizeBrandReceipts(
  typeof brief === 'object' && brief ? brief.receipts : undefined
);

const formatReceiptArrayForPrompt = (label: string, values: string[]) => {
  if (!values.length) return `${label}: []`;
  return `${label}:\n${values.map((value) => `- ${value}`).join('\n')}`;
};

const formatDialogueReceiptsForPrompt = (creativeBrief: any) => {
  const receipts = getBriefReceipts(creativeBrief);
  return [
    formatReceiptArrayForPrompt('specificClaims', receipts.specificClaims),
    formatReceiptArrayForPrompt('buyerMoments', receipts.buyerMoments),
    formatReceiptArrayForPrompt('exactSiteLanguage', receipts.exactSiteLanguage),
    formatReceiptArrayForPrompt('namedProof', receipts.namedProof),
  ].join('\n');
};

const DIALOGUE_SCRIPT_CREATIVE_PROCESS = `BEFORE writing each script, decide:
- Setting: where are they? texting, car, hallway, Slack DM, front counter, voice note, or another real place
- Relationship: who are they? co-founder/co-founder, boss/employee, two operators, friend/friend, founder/customer
- Pain: ONE specific buyerMoment from RECEIPTS
- Proof: ONE specific claim or namedProof from RECEIPTS

The proof must land like a casual receipt dropped in conversation, not a pitch.`;

const DIALOGUE_SCRIPT_SHAPE_RULES = `BANNED SHAPE. Do not produce:
- A: vague worry
- B: pitches the tool
- A: "is it working?" or "how does it work?"
- B: receipt
That is an infomercial structure. Real overheard conversations do not work that way.

REQUIRED SHAPE:
- Line 1: A drops a specific moment, number, time, place, tab, meeting, metric, or customer quote. Not a feeling.
  Bad: "I'm worried we're losing sales."
  Good: "Just checked GA. Organic is down 40% this month."
- Line 2: B reacts like a friend or operator. Do not pitch yet.
  Bad: "We're using this tool to fix that."
  Good: "Yeah, we were there in March. Brutal."
- Line 3: A asks what changed, asks for the link, calls BS, or asks what they did next. No robotic "is it working?"
- Line 4: B drops the proof casually, then names the brand or mechanism only if it sounds natural.

Banned phrases:
- "this tool"
- "is it working"
- "will that really make a difference"
- "I'm worried"
- "I don't understand"
- "how does it work"
- "how did you do it"
- "what's your secret"
- "what's the best way"`;

const DIALOGUE_SCRIPT_EXAMPLES = `STUDY THESE EXAMPLES. Copy the rhythm, not the specifics. Never copy names, settings, industries, numbers, phrases, titles, or lines from these examples. Your only source material is THIS brief and RECEIPTS.

Example 1, D2C operators texting about search visibility:
Ava (tired): "Just got the Q4 ad invoice. Fourteen grand for leads we used to get for six."
Sam (calm): "We stopped trying to win every Meta auction."
Ava: "Then where are the buyers coming from."
Sam: "The recommendation searches. We show up before they even hit a site."
Ava: "How fast did that happen."
Sam: "First ranking in two weeks. Tracked revenue followed."

Example 2, local service owner and employee after a busy day:
Ava (frustrated): "We had three good booking requests sit unanswered while I was on jobs."
Sam (practical): "That is the leak. Not demand, response time."
Ava: "I hate that the best leads arrive when nobody can reply."
Sam: "The new setup catches those moments and books the next step."
Ava: "So fewer people drift to whoever answers first."
Sam: "Exactly. It turns the busy hours into booked slots."

Example 3, skincare founder and friend after a product drop:
Ava (excited): "The serum sold out again, but the comments are all asking if it works for sensitive skin."
Sam (warm): "Then say that first. That is the hesitation."
Ava: "Not another glossy product claim."
Sam: "Right. Lead with the real concern, then the proof from the people using it."
Ava: "So it feels like a friend explaining it."
Sam: "That is why people stop scrolling."`;

const fallbackDialogueScripts = (count: number, creativeBrief: any = {}) => {
  const offer = asBriefString(creativeBrief, 'offer', 'this offer');
  const buyer = asBriefString(creativeBrief, 'buyer', 'people who need this');
  const pain = asBriefString(creativeBrief, 'pain', 'they are not sure what to choose');
  const differentiator = asBriefString(creativeBrief, 'differentiator', 'the guidance feels clearer than the usual options');
  const cta = asBriefString(creativeBrief, 'cta', 'Learn more.');
  const brandName = offer.match(/^(.+?)\s+(?:offers|provides|sells|helps|makes)\b/i)?.[1]?.trim() || 'this brand';
  const category = offer
    .replace(new RegExp(`^${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i'), '')
    .replace(/^(offers|provides|sells|makes|helps with)\s+/i, '')
    .replace(/\s+for\s+people.*$/i, '')
    .trim() || 'the right option';
  const categoryPhrase = /\bservices\b/i.test(category) ? `${category} can help` : `${category} helps`;
  const shortBuyer = buyer.replace(/^people\s+/i, 'people ').slice(0, 72).trim();
  const shortPain = pain
    .replace(/^they\s+want/i, 'you want')
    .replace(/^they\s+are/i, 'you are')
    .replace(/^they\s+/i, 'you ')
    .replace(/\s+but\s+do\s+not\s+/i, ' and you do not ')
    .slice(0, 82)
    .trim();
  const sentencePain = shortPain ? `${shortPain.charAt(0).toUpperCase()}${shortPain.slice(1).replace(/[.]+$/g, '')}` : 'The choice feels unclear';
  const trustReason = /\bguid/i.test(differentiator)
    ? 'the guidance feels personal and clear'
    : 'the value is easy to understand';
  const simpleCta = cta.replace(/[.]+$/g, '').toLowerCase();

  const scripts = [
    {
      title: 'Clear Next Step',
      angle: 'A buyer needs confidence before choosing.',
      lines: [
        { speaker: 'Ava', tone: 'unsure', text: `I keep looking at options, but ${shortPain.toLowerCase()}.` },
        { speaker: 'Sam', tone: 'calm', text: `${brandName} makes ${category.toLowerCase()} feel easier to choose.` },
        { speaker: 'Ava', tone: 'curious', text: `So it helps ${shortBuyer.toLowerCase()} know what actually fits?` },
        { speaker: 'Sam', tone: 'assured', text: `Yes. The next step is simple, ${simpleCta}.` },
      ],
    },
    {
      title: 'Review Spiral',
      angle: 'The old research path is not enough.',
      lines: [
        { speaker: 'Ava', tone: 'frustrated', text: `I keep comparing options and still feel unsure.` },
        { speaker: 'Sam', tone: 'practical', text: `${brandName} should make the choice feel clear right away.` },
        { speaker: 'Ava', tone: 'thoughtful', text: `So the ad should make the choice feel less risky?` },
        { speaker: 'Sam', tone: 'confident', text: `Exactly. Show that ${trustReason}.` },
      ],
    },
    {
      title: 'Trust Before Action',
      angle: 'The customer needs a reason to trust the choice.',
      lines: [
        { speaker: 'Ava', tone: 'careful', text: `I would book, but I want to know I am choosing the right place.` },
        { speaker: 'Sam', tone: 'warm', text: `${brandName} should make that feel easier to understand.` },
        { speaker: 'Ava', tone: 'interested', text: `Because ${shortBuyer.toLowerCase()} need more than a generic promise?` },
        { speaker: 'Sam', tone: 'steady', text: `Right. Lead with the result, then ask them to ${simpleCta}.` },
      ],
    },
    {
      title: 'Simple Explanation',
      angle: 'Make the offer easy to repeat.',
      lines: [
        { speaker: 'Ava', tone: 'curious', text: `How would you explain this without making it sound complicated?` },
        { speaker: 'Sam', tone: 'clear', text: `${brandName} helps when ${shortPain.toLowerCase()}.` },
        { speaker: 'Ava', tone: 'relieved', text: `That sounds easier than trying to figure it out alone.` },
        { speaker: 'Sam', tone: 'friendly', text: `That is the point. Make the next step feel obvious.` },
      ],
    },
    {
      title: 'Before They Scroll',
      angle: 'The first line names the hidden hesitation.',
      lines: [
        { speaker: 'Ava', tone: 'honest', text: `Most ads do not answer the thing I am actually worried about.` },
        { speaker: 'Sam', tone: 'direct', text: `Then say it plainly. ${sentencePain}.` },
        { speaker: 'Ava', tone: 'curious', text: `And then show how ${categoryPhrase.toLowerCase()}?` },
        { speaker: 'Sam', tone: 'assured', text: `Yes. Keep it human, specific, and easy to act on.` },
      ],
    },
  ];

  return normalizeDialogueScripts({ scripts }, count);
};

const buildDialogueScriptsPrompt = ({
  creativeBrief,
  persona,
  count,
}: {
  creativeBrief: any;
  persona: string;
  count: number;
}) => {
  const briefText = typeof creativeBrief === 'object'
    ? Object.entries(creativeBrief)
      .filter(([label]) => label !== 'receipts')
      .map(([label, value]) => `${label}: ${value}`)
      .join('\n')
    : String(creativeBrief || '');
  const receiptsText = formatDialogueReceiptsForPrompt(creativeBrief);

  return `You are a direct-response creative strategist for Wiggly, a visual ad creator.

Create ${count} short two-person dialogue ad scripts for this brief.
Return exactly ${count} scripts. Do not stop after one option.

Brief:
${briefText}

RECEIPTS:
Use these exact extracted artifacts as source material. Do not summarize them before writing.
${receiptsText}

${DIALOGUE_SCRIPT_CREATIVE_PROCESS}

${DIALOGUE_SCRIPT_SHAPE_RULES}

${DIALOGUE_SCRIPT_EXAMPLES}

Persona: ${persona}

The ad should feel like a real-life overheard conversation, not a sales pitch.
One person has the problem. The other casually reveals the solution.
Each script must reference one specific claim or named proof from RECEIPTS when available.
Each script must reference one concrete buyer moment from RECEIPTS when available.
Use exactSiteLanguage as a voice cue when it fits naturally.
If a receipts field is empty, ignore that field. Do not invent replacement proof, fake stats, or fake testimonials.
Keep each script 14-26 seconds when read aloud.
No hype. No buzzwords. No testimonials. No fake stats.
No em dashes or en dashes. Use commas or periods only.
No forced negation structure like "not this, but that", "it is not X, it is Y", or "stop doing X".
No staccato sentence stacking. Do not write choppy fragments like "Missed calls. Lost patients. Empty chairs."
Use normal conversational sentences that sound like people talking naturally.
Do not include placeholder text, keyboard-mash text, filler words, lorem ipsum, or nonsensical tokens.
Do not copy any sentence, title, number, setting, or industry from STUDY THESE EXAMPLES.
Every line must be fluent English that could be read aloud in the ad.
Never mention Wiggly. Wiggly is the internal builder, not the product being advertised.
Use the offer and CTA from the brief. If the brand name is unknown, refer to it as "the tool", "this thing", or "the brand" instead of inventing one.

Return ONLY valid JSON:
{
  "scripts": [
    {
      "title": "short option title",
      "angle": "short strategy angle",
      "lines": [
        {"speaker": "Ava", "tone": "frustrated", "text": "line"},
        {"speaker": "Sam", "tone": "calm", "text": "line"}
      ]
    }
  ]
}`;
};

const buildOpenRouterDialogueScriptsPrompt = ({
  creativeBrief,
  persona,
  count,
}: {
  creativeBrief: any;
  persona: string;
  count: number;
}) => {
  const offer = asBriefString(creativeBrief, 'offer', 'the offer');
  const buyer = asBriefString(creativeBrief, 'buyer', persona);
  const pain = asBriefString(creativeBrief, 'pain', 'the buyer is unsure what to choose');
  const result = asBriefString(creativeBrief, 'promisedResult', 'feel confident about the next step');
  const differentiator = asBriefString(creativeBrief, 'differentiator', 'the choice feels clearer and more guided');
  const cta = asBriefString(creativeBrief, 'cta', 'Learn more.');
  const receiptsText = formatDialogueReceiptsForPrompt(creativeBrief);

  return `Return ONLY valid JSON. Create ${count} short two-person dialogue ad scripts.
Return exactly ${count} scripts. Do not stop after one option.
Offer: ${offer}
Buyer: ${buyer}
Pain: ${pain}
Result: ${result}
Why this brand: ${differentiator}
CTA: ${cta}
RECEIPTS:
${receiptsText}

${DIALOGUE_SCRIPT_CREATIVE_PROCESS}

${DIALOGUE_SCRIPT_SHAPE_RULES}

Rules: natural spoken English, no hype, no fake stats, no em dash, never mention Wiggly.
Use one specific claim or named proof from RECEIPTS when available, plus one concrete buyer moment from RECEIPTS when available. If a receipt field is empty, ignore it and do not invent replacement proof.
If the brand name is unknown, refer to it as "the tool", "this thing", or "the brand" instead of inventing one.
Each script needs title, angle, and exactly 4 lines alternating Ava and Sam.
Schema: {"scripts":[{"title":"short","angle":"short","lines":[{"speaker":"Ava","tone":"curious","text":"fluent line"},{"speaker":"Sam","tone":"calm","text":"fluent line"},{"speaker":"Ava","tone":"curious","text":"fluent line"},{"speaker":"Sam","tone":"assured","text":"fluent line"}]}]}`;
};

const normalizeDialogueModelChoice = (value: unknown) => {
  const choice = String(value || 'auto').trim();
  return DIALOGUE_MODEL_OPTIONS.has(choice) ? choice : 'auto';
};

const getDialogueModelProvider = (choice: string) => {
  if (choice === 'local') return 'local';
  if (choice.startsWith('groq:')) return 'groq';
  if (choice.startsWith('openrouter:')) return 'openrouter';
  if (choice.startsWith('gemini:')) return 'gemini';
  return 'auto';
};

const getDialogueModelName = (choice: string) => choice.split(':').slice(1).join(':');

const generateDialogueScriptsWithOpenRouter = async (prompt: string, count: number, modelChoices = OPENROUTER_FREE_DIALOGUE_MODELS, options: { requireFree?: boolean } = {}) => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || isDisabled(process.env.OPENROUTER_ENABLED)) return { scripts: [], model: '' };

  for (const model of modelChoices) {
    if (options.requireFree && !model.endsWith(':free')) continue;
    let timeout: NodeJS.Timeout | undefined;
    try {
      let bestScripts: any[] = [];
      for (let attempt = 0; attempt < 2 && bestScripts.length < count; attempt += 1) {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), DIALOGUE_PROVIDER_TIMEOUT_MS);
        const response = await withTimeout(
          fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.PUBLIC_APP_URL || 'http://localhost:3000',
              'X-Title': 'Wiggly',
            },
            body: JSON.stringify({
              model,
              messages: [{
                role: 'user',
                content: attempt === 0
                  ? prompt
                  : `${prompt}\n\nYour previous output returned only ${bestScripts.length} usable scripts. Return exactly ${count} fresh, non-duplicative scripts. Do not reuse weak generic lines.`,
              }],
              response_format: { type: 'json_object' },
              temperature: 0.7,
              max_tokens: 3000,
            }),
            signal: controller.signal,
          }),
          DIALOGUE_PROVIDER_TIMEOUT_MS,
          `OpenRouter dialogue generation (${model})`,
        );
        if (timeout) clearTimeout(timeout);

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.warn('OpenRouter dialogue model failed:', model, response.status, String(payload?.error?.message || '').slice(0, 180));
          break;
        }

        const text = String(payload?.choices?.[0]?.message?.content || '{"scripts":[]}');
        const scripts = normalizeDialogueScripts(parseJsonResponse(text), count);
        if (scripts.length > bestScripts.length) bestScripts = scripts;
      }
      if (bestScripts.length) {
        console.info('OpenRouter dialogue fallback succeeded:', model);
        return { scripts: bestScripts, model };
      }
    } catch (error: any) {
      console.warn('OpenRouter dialogue fallback error:', model, String(error?.message || error).slice(0, 180));
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  return { scripts: [], model: '' };
};

const generateDialogueScriptsWithGroq = async (prompt: string, count: number, modelChoices = GROQ_DIALOGUE_MODELS) => {
  const key = process.env.GROQ_API_KEY;
  if (!key || isDisabled(process.env.GROQ_ENABLED)) return { scripts: [], model: '' };

  for (const model of modelChoices) {
    let timeout: NodeJS.Timeout | undefined;
    try {
      let bestScripts: any[] = [];
      for (let attempt = 0; attempt < 2 && bestScripts.length < count; attempt += 1) {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), DIALOGUE_PROVIDER_TIMEOUT_MS);
        const response = await withTimeout(
          fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [{
                role: 'user',
                content: attempt === 0
                  ? prompt
                  : `${prompt}\n\nYour previous output returned only ${bestScripts.length} usable scripts. Return exactly ${count} fresh, non-duplicative scripts. Do not reuse weak generic lines.`,
              }],
              response_format: { type: 'json_object' },
              temperature: 0.7,
              max_completion_tokens: 3000,
            }),
            signal: controller.signal,
          }),
          DIALOGUE_PROVIDER_TIMEOUT_MS,
          `Groq dialogue generation (${model})`,
        );
        if (timeout) clearTimeout(timeout);

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.warn('Groq dialogue model failed:', model, response.status, String(payload?.error?.message || '').slice(0, 180));
          break;
        }

        const text = String(payload?.choices?.[0]?.message?.content || '{"scripts":[]}');
        const scripts = normalizeDialogueScripts(parseJsonResponse(text), count);
        if (scripts.length > bestScripts.length) bestScripts = scripts;
      }
      if (bestScripts.length) {
        console.info('Groq dialogue fallback succeeded:', model);
        return { scripts: bestScripts, model };
      }
    } catch (error: any) {
      console.warn('Groq dialogue fallback error:', model, String(error?.message || error).slice(0, 180));
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  return { scripts: [], model: '' };
};

const fillDialogueScripts = (scripts: any[], count: number, creativeBrief: any = {}) => {
  const fallbacks = fallbackDialogueScripts(count, creativeBrief);
  const combined = [...scripts];
  for (const fallback of fallbacks) {
    if (combined.length >= count) break;
    if (!combined.some((script) => script.title === fallback.title)) {
      combined.push(fallback);
    }
  }
  return combined.slice(0, count);
};

const pcmBase64ToWavBase64 = (pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16) => {
  const pcm = Buffer.from(pcmBase64, 'base64');
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]).toString('base64');
};

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
  const { creativeBrief, persona = 'Dental practice owner', count = 5 } = req.body;
  const requestedCount = Math.min(5, Math.max(1, Number(count) || 5));
  const generationCount = Math.min(8, requestedCount + 3);
  const selectedModel = normalizeDialogueModelChoice(req.body?.model);
  const selectedProvider = getDialogueModelProvider(selectedModel);
  const selectedModelName = getDialogueModelName(selectedModel);
  const prompt = buildDialogueScriptsPrompt({ creativeBrief, persona, count: generationCount });
  const sendDialogueFailure = (message: string, status = 503) => res.status(status).json({ error: message, selectedModel });

  try {
    if (selectedProvider === 'local') {
      return res.json({
        scripts: fillDialogueScripts([], requestedCount, creativeBrief),
        fallback: true,
        provider: 'local',
        model: 'local',
        selectedModel,
        warning: 'Using local script options by request.',
      });
    }

    if (selectedProvider === 'auto') {
      const kimiResult = await generateDialogueScriptsWithOpenRouter(
        prompt,
        requestedCount,
        OPENROUTER_PREMIUM_DIALOGUE_MODELS,
      );
      if (kimiResult.scripts.length) {
        return res.json({
          scripts: kimiResult.scripts,
          provider: 'openrouter',
          model: kimiResult.model,
          selectedModel,
        });
      }
    }

    if (selectedProvider === 'groq' || selectedProvider === 'auto') {
      const groqResult = await generateDialogueScriptsWithGroq(
        prompt,
        requestedCount,
        selectedProvider === 'groq' ? [selectedModelName] : GROQ_DIALOGUE_MODELS,
      );
      if (groqResult.scripts.length) {
        return res.json({
          scripts: groqResult.scripts,
          provider: 'groq-free',
          model: groqResult.model,
          selectedModel,
        });
      }
      if (selectedProvider === 'groq') {
        return sendDialogueFailure(`Selected Groq model (${selectedModelName}) did not return usable scripts. Try another model or try again in a moment.`);
      }
    }

    if (selectedProvider === 'openrouter' || selectedProvider === 'auto') {
      const openRouterResult = await generateDialogueScriptsWithOpenRouter(
        prompt,
        requestedCount,
        selectedProvider === 'openrouter' ? [selectedModelName] : OPENROUTER_FREE_DIALOGUE_MODELS,
        { requireFree: selectedProvider !== 'openrouter' },
      );
      if (openRouterResult.scripts.length) {
        return res.json({
          scripts: openRouterResult.scripts,
          provider: 'openrouter-free',
          model: openRouterResult.model,
          selectedModel,
        });
      }
      if (selectedProvider === 'openrouter') {
        return sendDialogueFailure(`Selected OpenRouter model (${selectedModelName}) did not return usable scripts. Try another model or try again in a moment.`);
      }
    }

    if (selectedProvider === 'gemini' && selectedModelName !== GEMINI_DIALOGUE_MODEL) {
      return sendDialogueFailure(`Selected Gemini model (${selectedModelName}) is not configured for dialogue scripts.`);
    }

    if (selectedProvider === 'gemini' || selectedProvider === 'auto') {
      const key = process.env.GEMINI_API_KEY;
      if (!key || isDisabled(process.env.GEMINI_ENABLED)) {
        console.warn('Generate dialogue scripts using provider fallback: GEMINI_API_KEY is not set.');
        return sendDialogueFailure('AI script generation is not configured.');
      }

      const ai = new GoogleGenAI({ apiKey: key });

      let scripts: any[] = [];

      for (let attempt = 0; attempt < 2 && scripts.length === 0; attempt += 1) {
        const response = await withTimeout(
          ai.models.generateContent({
            model: GEMINI_DIALOGUE_MODEL,
            contents: attempt === 0
              ? prompt
              : `${prompt}\n\nYour previous output failed quality checks. Return clean, fluent English only. Absolutely no em dashes, forced negation, staccato fragments, placeholder text, or keyboard-mash text.`,
            config: {
              responseMimeType: 'application/json',
            },
          }),
          DIALOGUE_PROVIDER_TIMEOUT_MS,
          'Gemini dialogue generation',
        );

        const text = response.text || '{"scripts":[]}';
        scripts = normalizeDialogueScripts(parseJsonResponse(text), requestedCount);
      }

      return res.json({
        scripts,
        provider: 'gemini',
        model: GEMINI_DIALOGUE_MODEL,
        selectedModel,
      });
    }

    return sendDialogueFailure('AI script generation is not configured.');
  } catch (error: any) {
    console.error("Generate dialogue scripts error:", error);
    const status = Number(error?.status || error?.code || 0);
    const providerUnavailable = status === 403 || status === 429 || status === 503 || /timed out|UNAVAILABLE|high demand/i.test(String(error?.message || ''));
    if (providerUnavailable) {
      return sendDialogueFailure('AI script generation is temporarily unavailable. Try again in a moment.');
    }
    sendServerError(res, 'Error generating dialogue scripts.');
  }
});

app.post('/api/generate-dialogue-audio', aiGenerationLimiter, billShield('dialogueAudio', 'TTS_ENABLED'), async (req, res) => {
  try {
    const { script } = req.body;

    if (!script?.lines?.length) {
      return res.status(400).json({ error: 'No script lines provided.' });
    }

    const speakers = Array.from(new Set(script.lines.map((line: any) => String(line.speaker || 'Speaker').trim()).filter(Boolean))).slice(0, 2) as string[];
    while (speakers.length < 2) speakers.push(`Speaker ${speakers.length + 1}`);
    const cleanedLines = script.lines.map((line: any) => ({
      ...line,
      text: cleanHumanDialogueText(line.text),
    }));
    const ttsText = `Read this as a natural, subtle, two-person conversation for a Meta ad. Keep it conversational and not salesy. Do not add em dashes, choppy dramatic pauses, forced contrast phrasing, or robotic cadence.\n\n${cleanedLines.map((line: any) => `${line.speaker}: [${line.tone || 'natural'}] ${line.text}`).join('\n')}`;
    const baseFilename = `${(script.title || 'conversation-ad').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'conversation-ad'}`;

    const key = process.env.GEMINI_API_KEY;
    if (!key || isDisabled(process.env.GEMINI_ENABLED)) {
      return res.status(503).json({
        error: 'Gemini 3.1 Flash TTS is not configured. Add GEMINI_API_KEY and set TTS_ENABLED=true.',
      });
    }
    if ((process.env.TTS_MODEL || PINNED_TTS_MODEL) !== PINNED_TTS_MODEL) {
      return res.status(503).json({
        error: `Speech generation is pinned to ${PINNED_TTS_MODEL}. Remove the TTS_MODEL override or set it to ${PINNED_TTS_MODEL}.`,
      });
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: PINNED_TTS_MODEL,
      contents: [{ parts: [{ text: ttsText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: speakers[0],
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                },
              },
              {
                speaker: speakers[1],
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Puck' },
                },
              },
            ],
          },
        },
      },
    } as any);

    const part = response.candidates?.[0]?.content?.parts?.find((candidatePart: any) => candidatePart.inlineData);
    const inlineData = part?.inlineData;
    if (!inlineData?.data) {
      return res.status(500).json({ error: 'No audio returned from Gemini TTS.' });
    }

    const mimeType = inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000';
    const normalizedMimeType = mimeType.toLowerCase();
    const sampleRateMatch = normalizedMimeType.match(/rate=(\d+)/);
    const sampleRate = sampleRateMatch ? Number(sampleRateMatch[1]) : 24000;
    const channelsMatch = normalizedMimeType.match(/channels=(\d+)/);
    const channels = channelsMatch ? Number(channelsMatch[1]) : 1;
    const isPcm = normalizedMimeType.includes('audio/l16') || normalizedMimeType.includes('pcm');
    const audioBase64 = isPcm ? pcmBase64ToWavBase64(inlineData.data, sampleRate, channels) : inlineData.data;

    res.json({
      audioBase64,
      mimeType: isPcm ? 'audio/wav' : mimeType,
      filename: `${baseFilename}.wav`,
      provider: 'gemini',
      model: PINNED_TTS_MODEL,
    });
  } catch (error: any) {
    console.error("Generate dialogue audio error:", error);
    sendServerError(res, 'Error generating dialogue audio.', error);
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
