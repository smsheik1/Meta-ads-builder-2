import 'dotenv/config';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { createClient } from '@supabase/supabase-js';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import { EXPORT_FPS, getExportDimensions, isPhoneCallSnapshot, PHONE_CALL_EXPORT_DIMENSIONS, type ExportSnapshot, type RenderSnapshot } from './src/lib/export-snapshot';

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

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
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
  limit: 30,
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

const criticalApiPaths = new Set(['/api/render-remotion', '/api/share-pages', '/api/transcribe', '/api/research-brand', '/api/generate-ad-stream']);
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
    deepgramConfigured: Boolean(process.env.DEEPGRAM_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    firecrawlConfigured: Boolean(process.env.FIRECRAWL_API_KEY),
    postizConfigured: Boolean(process.env.POSTIZ_API_KEY),
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
    const allowed = file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4' || file.mimetype === 'video/webm';
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

const uploadPostiz = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 300 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = file.mimetype === 'video/mp4' || file.originalname.toLowerCase().endsWith('.mp4');
    if (!allowed) {
      cb(new Error('Unsupported MP4 file type.'));
      return;
    }
    cb(null, true);
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

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }
    cb(null, tmpDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '.webm');
  }
});
const uploadDisk = multer({
  storage: diskStorage,
  limits: {
    fileSize: 300 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = file.mimetype === 'video/webm' || file.originalname.toLowerCase().endsWith('.webm');
    if (!allowed) {
      cb(new Error('Unsupported video file type.'));
      return;
    }
    cb(null, true);
  },
});

const sendServerError = (res: express.Response, fallbackMessage: string) => {
  res.status(500).json({ error: fallbackMessage });
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

const getRequestOrigin = (req: express.Request) => {
  const appUrl = process.env.APP_URL?.trim().replace(/\/+$/, '');
  if (appUrl) return appUrl;
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = req.get('host') || `localhost:${port}`;
  return `${proto}://${host}`;
};

const transcriptionBackoffMs = 60 * 1000;
let transcriptionRateLimitUntil = 0;

const getPostizConfig = () => {
  const apiKey = process.env.POSTIZ_API_KEY?.trim();
  const baseUrl = (process.env.POSTIZ_API_BASE_URL || 'https://api.postiz.com/public/v1').trim().replace(/\/+$/, '');
  const appUrl = process.env.POSTIZ_APP_URL?.trim() || null;
  return { apiKey, baseUrl, appUrl };
};

const postizRequest = async (pathName: string, init: RequestInit = {}) => {
  const { apiKey, baseUrl } = getPostizConfig();
  if (!apiKey) {
    const error = new Error('Postiz is not configured. Add POSTIZ_API_KEY to the server environment.');
    (error as any).status = 400;
    throw error;
  }

  const response = await fetch(`${baseUrl}${pathName}`, {
    ...init,
    headers: {
      Authorization: apiKey,
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || `Postiz request failed with ${response.status}.`);
    (error as any).status = response.status;
    throw error;
  }
  return payload;
};

const getPostizSettings = (identifier: string, title: string, platform?: string) => {
  const settings: Record<string, any> = { __type: identifier };

  if (identifier === 'instagram' || identifier === 'instagram-standalone') {
    settings.post_type = platform === 'instagram-feed' || platform === 'facebook-feed' ? 'post' : 'reel';
  }

  if (identifier === 'youtube') {
    settings.title = title || 'Wiggly ad';
    settings.type = platform === 'youtube' ? 'video' : 'short';
    settings.selfDeclaredMadeForKids = false;
    settings.tags = [];
  }

  if (identifier === 'tiktok') {
    settings.privacy_level = 'PUBLIC_TO_EVERYONE';
    settings.duet = false;
    settings.stitch = false;
    settings.comment = true;
    settings.autoAddMusic = false;
    settings.brand_content_toggle = false;
    settings.brand_organic_toggle = false;
    settings.content_posting_method = 'DIRECT_POST';
  }

  return settings;
};

const remotionAssetsRoot = path.join(process.cwd(), 'tmp', 'remotion-assets');
app.use('/api/remotion-assets', express.static(remotionAssetsRoot, {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
}));

app.post('/api/postiz/integrations', async (_req, res) => {
  try {
    const integrations = await postizRequest('/integrations');
    res.json({ integrations: Array.isArray(integrations) ? integrations : [] });
  } catch (error: any) {
    console.error('Postiz integrations error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Could not load Postiz integrations.' });
  }
});

app.post('/api/postiz/upload', publishingLimiter, uploadPostiz.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No MP4 file provided.' });
    }

    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer as any], { type: req.file.mimetype || 'video/mp4' }), req.file.originalname || 'wiggly-ad.mp4');
    const upload = await postizRequest('/upload', {
      method: 'POST',
      body: formData,
    });

    res.json({ upload });
  } catch (error: any) {
    console.error('Postiz upload error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Could not upload MP4 to Postiz.' });
  }
});

app.post('/api/postiz/create-draft', publishingLimiter, async (req, res) => {
  try {
    const { integrationId, integrationIdentifier, content, media, title, platform } = req.body || {};
    if (!integrationId || !integrationIdentifier) {
      return res.status(400).json({ error: 'Choose a Postiz channel before creating a draft.' });
    }
    if (!media?.id || !media?.path) {
      return res.status(400).json({ error: 'Upload the MP4 before creating a Postiz draft.' });
    }

    const draftPayload = {
      type: 'draft',
      date: new Date().toISOString(),
      shortLink: false,
      tags: [],
      posts: [
        {
          integration: { id: String(integrationId) },
          value: [
            {
              content: String(content || '').trim() || 'Created with Wiggly.',
              image: [
                {
                  id: String(media.id),
                  path: String(media.path),
                },
              ],
            },
          ],
          settings: getPostizSettings(String(integrationIdentifier), String(title || 'Wiggly ad'), String(platform || '')),
        },
      ],
    };

    const draft = await postizRequest('/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftPayload),
    });

    res.json({ draft, appUrl: getPostizConfig().appUrl });
  } catch (error: any) {
    console.error('Postiz draft error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Could not create Postiz draft.' });
  }
});

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

    const headline = trimField(req.body.headline, 180);
    const subhead = trimField(req.body.subhead, 500);
    const ctaText = trimField(req.body.cta_text, 80) || 'Learn More';
    const businessName = trimField(req.body.business_name, 120) || 'Wiggly';
    const brandName = trimField(req.body.brand_name, 120) || businessName;
    const accentColor = trimField(req.body.accent_color, 7) || '#00D6B8';
    const backgroundColor = trimField(req.body.background_color, 7) || '#FAFAF7';
    let ctaUrl = '';

    if (!headline) {
      return res.status(400).json({ error: 'Share links need a headline.' });
    }
    if (!isValidHexColor(accentColor) || !isValidHexColor(backgroundColor)) {
      return res.status(400).json({ error: 'Share colors must be six-digit hex values.' });
    }
    try {
      ctaUrl = normalizeShareUrl(req.body.cta_url);
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

    const insert = await supabase
      .from('ad_shares')
      .insert({
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
      })
      .select('id, created_at')
      .single();

    if (insert.error) {
      await supabase.storage.from('ad-shares').remove([videoPath]);
      throw insert.error;
    }

    const publicUrl = supabase.storage.from('ad-shares').getPublicUrl(videoPath).data.publicUrl;
    res.json({
      id: insert.data?.id,
      createdAt: insert.data?.created_at,
      slug,
      videoPath,
      videoUrl: publicUrl,
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
  if (isPhoneCallSnapshot(snapshot)) return;
  if (field === 'introImage') snapshot.settings.introImage = url;
  if (field === 'bgMedia' && snapshot.settings.bgMedia) snapshot.settings.bgMedia.url = url;
  if (field.startsWith('elementImage:')) {
    const id = field.split(':')[1];
    const element = snapshot.elements.find(candidate => candidate.id === id);
    if (element) element.imageUrl = url;
  }
};

const createRingToneWav = async (outputPath: string, durationSeconds: number) => {
  const sampleRate = 44100;
  const channelCount = 1;
  const bytesPerSample = 2;
  const sampleCount = Math.max(1, Math.ceil(durationSeconds * sampleRate));
  const dataSize = sampleCount * channelCount * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28);
  buffer.writeUInt16LE(channelCount * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const cycleTime = time % 6;
    const toneOn = cycleTime < 2;
    const fade = toneOn ? Math.min(1, cycleTime / 0.015, (2 - cycleTime) / 0.015) : 0;
    const sample = toneOn
      ? (Math.sin(2 * Math.PI * 440 * time) + Math.sin(2 * Math.PI * 480 * time)) * 0.14 * Math.max(0, fade)
      : 0;
    buffer.writeInt16LE(Math.max(-1, Math.min(1, sample)) * 32767, 44 + index * 2);
  }

  await fs.promises.writeFile(outputPath, buffer);
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

    if (!isPhoneCallSnapshot(snapshot)) {
      await inlineIntroImageForFrameZero(snapshot);
    }

    if (isPhoneCallSnapshot(snapshot)) {
      if (snapshot.settings.ringDurationSeconds > 0) {
        const ringPath = path.join(assetDir, 'ring-tone.wav');
        await createRingToneWav(ringPath, snapshot.settings.ringDurationSeconds);
        snapshot.settings.ringAudioUrl = `http://127.0.0.1:${port}/api/remotion-assets/${renderId}/ring-tone.wav`;
      } else {
        snapshot.settings.ringAudioUrl = null;
      }
    }

    const dimensions = isPhoneCallSnapshot(snapshot) ? PHONE_CALL_EXPORT_DIMENSIONS : getExportDimensions(snapshot.settings.platform);
    const durationCap = isPhoneCallSnapshot(snapshot) ? 180 : snapshot.settings.renderDurationCap === 'full' ? 180 : Number(snapshot.settings.renderDurationCap || 30);
    const durationSeconds = Math.max(1, Math.min(Number(snapshot.durationSeconds || 30), durationCap));
    const visualizerElement = isPhoneCallSnapshot(snapshot) ? null : snapshot.elements.find(element => element.type === 'visualizer');
    const cachedAudioAnalysis = !isPhoneCallSnapshot(snapshot) && snapshot.audioAnalysis?.levels?.length
      ? snapshot.audioAnalysis
      : null;
    const audioAnalysis = isPhoneCallSnapshot(snapshot)
      ? null
      : cachedAudioAnalysis || await extractAudioAnalysis(audioAnalysisInput || snapshot.settings.audioUrl, durationSeconds, visualizerElement?.visualizerSmoothing ?? 0.8);
    if (!isPhoneCallSnapshot(snapshot)) {
      snapshot.audioAnalysis = null;
    }
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
    const compositionId = isPhoneCallSnapshot(snapshot) ? 'PhoneCallRender' : 'AdRender';
    const composition = compositions.find(candidate => candidate.id === compositionId);
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

app.post('/api/convert-to-mp4', videoExportLimiter, uploadDisk.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  const inputPath = req.file.path;
  ffmpeg.setFfmpegPath(ffmpegPath!);

  const outputPath = inputPath.replace('.webm', '.mp4');
  
  ffmpeg(inputPath)
    .outputOptions([
      '-y',
      '-c:v libx264',
      '-preset ultrafast',
      '-profile:v main',
      '-pix_fmt yuv420p',
      '-c:a aac',
      '-b:a 128k',
      '-r 60'
    ])
    .outputFormat('mp4')
    .on('start', (commandLine) => {
      console.log('Spawned FFmpeg with command: ' + commandLine);
    })
    .on('stderr', (stderrLine) => {
      console.log('FFmpeg stderr: ' + stderrLine); // Don't suppress, helpful for debugging
    })
    .on('end', () => {
      fs.unlink(inputPath, () => {});
      res.setHeader('Content-Type', 'video/mp4');
      res.download(outputPath, 'video.mp4', () => {
         fs.unlink(outputPath, () => {});
      });
    })
    .on('error', (err) => {
      console.error('FFmpeg error:', err.message);
      fs.unlink(inputPath, () => {});
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to convert video' });
      }
    })
    .save(outputPath);
});

app.post('/api/transcribe', aiGenerationLimiter, uploadMem.single('audio'), async (req, res) => {
  if (Date.now() < transcriptionRateLimitUntil) {
    return res.status(429).json({ error: 'AI temporarily at capacity, try again in 1 min.', retryAfterSeconds: Math.ceil((transcriptionRateLimitUntil - Date.now()) / 1000) });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  if (!process.env.DEEPGRAM_API_KEY) {
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
import { buildBrandBrainPrompt, buildFallbackBrandBrain, type BrandAssets, type BrandBrain, type BrandFontSignal } from './src/lib/prompts/brand-brain';
import { buildHeadlineVariationsPrompt, type ConversationAdLine, type GeneratedAdFormat, type HeadlineVariation } from './src/lib/prompts/headline-variations';
import { normalizeAdAngles } from './src/lib/prompts/ad-angles';

const parseJsonResponse = (text: string) => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = (fenced ? fenced[1] : trimmed)
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
  return JSON.parse(jsonText);
};

const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v2/scrape';
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
const BRAND_RESEARCH_MODEL = 'gemini-3-flash-preview';
const HEADLINE_VARIATION_MODEL = 'gemini-3.1-flash-lite';
const BRAND_RESEARCH_CACHE_TTL_MS = 15 * 60 * 1000;
const BRAND_RESEARCH_CACHE_LIMIT = 100;
const MAX_RESEARCH_PAGES = 1;
const MAX_RESEARCH_CHARS = 56000;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const FIRECRAWL_TIMEOUT_MS = 12000;
const TAVILY_TIMEOUT_MS = 9000;
const BRAND_BRAIN_TIMEOUT_MS = 18000;
const HEADLINE_VARIATION_TIMEOUT_MS = 20000;
const BRAND_BRAIN_CACHE_VERSION = 'brand-assets-v2';

type ScrapedPage = {
  url: string;
  title: string;
  description: string;
  markdown: string;
  links: string[];
  colors: string[];
  logoUrl?: string;
  brandAssets: BrandAssets;
};

type BrandResearchCacheEntry = {
  expiresAt: number;
  pages: ScrapedPage[];
  researchText: string;
  logoUrl?: string;
  brandAssets: BrandAssets;
};

type BrandBrainCacheEntry = {
  expiresAt: number;
  brandBrain: BrandBrain;
};

const brandResearchCache = new Map<string, BrandResearchCacheEntry>();
const brandBrainCache = new Map<string, BrandBrainCacheEntry>();

const blockedHostnames = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

const isPrivateIpv4 = (hostname: string) => {
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
};

const isPrivateIpv6 = (hostname: string) => {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80');
};

const normalizeResearchUrl = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Website URL is required.');
  const withProtocol = raw.includes('://') ? raw : `https://${raw}`;
  const url = new URL(withProtocol);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Website must start with http or https.');
  url.hash = '';
  url.username = '';
  url.password = '';
  const hostname = url.hostname.toLowerCase();
  const ipVersion = net.isIP(hostname);
  if (
    blockedHostnames.has(hostname) ||
    hostname.endsWith('.local') ||
    (ipVersion === 4 && isPrivateIpv4(hostname)) ||
    (ipVersion === 6 && isPrivateIpv6(hostname))
  ) {
    throw new Error('That website URL cannot be researched.');
  }
  return url;
};

const sameOriginUrl = (value: string, baseUrl: URL) => {
  try {
    const nextUrl = new URL(value, baseUrl.href);
    nextUrl.hash = '';
    nextUrl.username = '';
    nextUrl.password = '';
    if (!['http:', 'https:'].includes(nextUrl.protocol)) return null;
    if (nextUrl.hostname.replace(/^www\./, '') !== baseUrl.hostname.replace(/^www\./, '')) return null;
    if (/\.(pdf|zip|png|jpe?g|gif|webp|svg|mp4|mp3|wav|m4a|mov)$/i.test(nextUrl.pathname)) return null;
    return nextUrl.href;
  } catch {
    return null;
  }
};

const addBrandResearchCache = (key: string, entry: BrandResearchCacheEntry) => {
  brandResearchCache.set(key, entry);
  while (brandResearchCache.size > BRAND_RESEARCH_CACHE_LIMIT) {
    const firstKey = brandResearchCache.keys().next().value;
    if (!firstKey) break;
    brandResearchCache.delete(firstKey);
  }
};

const getBrandResearchCache = (key: string) => {
  const cached = brandResearchCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt < Date.now() || !cached.brandAssets) {
    brandResearchCache.delete(key);
    return null;
  }
  return cached;
};

const addBrandBrainCache = (key: string, entry: BrandBrainCacheEntry) => {
  brandBrainCache.set(key, entry);
  while (brandBrainCache.size > BRAND_RESEARCH_CACHE_LIMIT) {
    const firstKey = brandBrainCache.keys().next().value;
    if (!firstKey) break;
    brandBrainCache.delete(firstKey);
  }
};

const getBrandBrainCache = (key: string) => {
  const cached = brandBrainCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    brandBrainCache.delete(key);
    return null;
  }
  return cached;
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out.`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const normalizePublicAssetUrl = (value: unknown, baseUrl: string) => {
  const raw = String(value || '').trim();
  if (!raw || raw.startsWith('data:')) return '';
  try {
    const url = new URL(raw, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.href;
  } catch {
    return '';
  }
};

const normalizeImageAssetUrl = (value: unknown, baseUrl: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);/i.test(raw)) {
    return raw.length <= 20000 ? raw : '';
  }
  return normalizePublicAssetUrl(raw, baseUrl);
};

const isLikelyFaviconAsset = (value: unknown) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || raw.startsWith('data:')) return false;
  return /(?:^|\/)(?:favicon|apple-touch-icon|mstile|site-icon|android-chrome|icon[-_]\d|icon\.)/i.test(raw)
    || /\.(?:ico)(?:$|[?#])/i.test(raw);
};

const firstPublicAssetUrl = (values: unknown[], baseUrl: string) => {
  for (const value of values) {
    const normalized = normalizeImageAssetUrl(value, baseUrl);
    if (normalized) return normalized;
  }
  return '';
};

const cleanTextField = (value: unknown, maxLength: number) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

const clipJsonValue = (value: unknown, depth = 0): unknown => {
  if (value == null) return value;
  if (typeof value === 'string') return value.slice(0, 800);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth >= 4) return Array.isArray(value) ? '[array]' : '[object]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => clipJsonValue(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, item]) => [key.slice(0, 80), clipJsonValue(item, depth + 1)])
    );
  }
  return String(value).slice(0, 800);
};

const collectPublicAssetUrls = (value: unknown, baseUrl: string, urls = new Set<string>()) => {
  if (!value) return urls;
  if (typeof value === 'string') {
    const normalized = normalizeImageAssetUrl(value, baseUrl);
    if (normalized) urls.add(normalized);
    return urls;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectPublicAssetUrls(item, baseUrl, urls));
    return urls;
  }
  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => collectPublicAssetUrls(item, baseUrl, urls));
  }
  return urls;
};

const normalizeStringRecord = (value: unknown, maxEntries = 40, maxValueLength = 300) => {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
      .slice(0, maxEntries)
      .map(([key, item]) => [key.slice(0, 80), String(item).replace(/\s+/g, ' ').trim().slice(0, maxValueLength)])
      .filter(([, item]) => item)
  );
};

const extractFonts = (value: unknown): BrandFontSignal[] => {
  const fonts = Array.isArray(value) ? value : [];
  return fonts
    .map((font): BrandFontSignal | null => {
      if (typeof font === 'string') return { family: cleanTextField(font, 80) };
      if (!font || typeof font !== 'object') return null;
      const record = font as Record<string, unknown>;
      const family = cleanTextField(record.family || record.name || record.fontFamily, 80);
      if (!family) return null;
      return {
        family,
        role: cleanTextField(record.role || record.type || record.usage, 40) || undefined,
      };
    })
    .filter((font): font is BrandFontSignal => Boolean(font))
    .filter((font, index, fonts) => fonts.findIndex((candidate) => candidate.family.toLowerCase() === font.family.toLowerCase() && candidate.role === font.role) === index)
    .slice(0, 12);
};

const extractSocialLinks = (links: string[], baseUrl: string) => {
  const socialPattern = /\b(?:instagram|linkedin|facebook|twitter|x\.com|youtube|tiktok|threads|pinterest)\.com\b/i;
  return links
    .map((link) => normalizePublicAssetUrl(link, baseUrl))
    .filter((link) => link && socialPattern.test(link))
    .filter((link, index, links) => links.indexOf(link) === index)
    .slice(0, 20);
};

const buildPageBrandAssets = ({
  url,
  data,
  colors,
  logoUrl,
  markdown,
  links,
}: {
  url: string;
  data: any;
  colors: string[];
  logoUrl: string;
  markdown: string;
  links: string[];
}): BrandAssets => {
  const metadata = data.metadata || {};
  const branding = data.branding || {};
  const brandingImages = branding.images || {};
  const allImageUrls = Array.from(collectPublicAssetUrls({
    ...brandingImages,
    ogImage: metadata.ogImage || metadata['og:image'] || metadata['twitter:image'],
  }, url)).slice(0, 24);
  const imageUrlSet = new Set(allImageUrls);
  const favicon = firstPublicAssetUrl([brandingImages.favicon, metadata.icon, metadata.favicon], url);
  const ogImage = firstPublicAssetUrl([brandingImages.ogImage, metadata.ogImage, metadata['og:image'], metadata['twitter:image']], url);
  [logoUrl, favicon, ogImage].filter(Boolean).forEach((image) => imageUrlSet.add(image));

  return {
    images: {
      logo: logoUrl || undefined,
      favicon: favicon || undefined,
      ogImage: ogImage || undefined,
      heroImages: allImageUrls.filter((image) => image !== logoUrl && image !== favicon).slice(0, 8),
      allImages: Array.from(imageUrlSet).slice(0, 24),
    },
    colors: {
      ...normalizeStringRecord(branding.colors, 16, 24),
      ...Object.fromEntries(colors.map((color, index) => [`detected${index + 1}`, color])),
    },
    fonts: extractFonts(branding.fonts),
    componentStyles: (clipJsonValue(branding.components || {}, 0) || {}) as Record<string, unknown>,
    personality: clipJsonValue(branding.personality),
    designSystem: clipJsonValue(branding.designSystem),
    metadata: normalizeStringRecord(metadata, 40, 360),
    socialLinks: extractSocialLinks(links, url),
    pages: [{
      url,
      title: cleanTextField(metadata.title || metadata.ogTitle || '', 160),
      description: cleanTextField(metadata.description || metadata.ogDescription || '', 260),
      colors,
      logoUrl: logoUrl || undefined,
      markdownPreview: markdown.slice(0, 2400),
    }],
    rawBranding: (clipJsonValue(branding, 0) || {}) as Record<string, unknown>,
  };
};

const mergeBrandAssets = (pages: ScrapedPage[]): BrandAssets => {
  const mergedColors: Record<string, string> = {};
  const fonts: BrandFontSignal[] = [];
  const socialLinks = new Set<string>();
  const allImages = new Set<string>();
  let logo = '';
  let favicon = '';
  let ogImage = '';
  const firstAssets = pages[0]?.brandAssets;

  pages.forEach((page) => {
    const assets = page.brandAssets;
    Object.entries(assets.colors || {}).forEach(([key, value]) => {
      if (HEX_COLOR_PATTERN.test(value) && Object.values(mergedColors).indexOf(value) === -1) {
        mergedColors[key] = value;
      }
    });
    assets.fonts.forEach((font) => {
      if (!fonts.some((candidate) => candidate.family.toLowerCase() === font.family.toLowerCase() && candidate.role === font.role)) {
        fonts.push(font);
      }
    });
    assets.socialLinks.forEach((link) => socialLinks.add(link));
    assets.images.allImages.forEach((image) => allImages.add(image));
    logo ||= assets.images.logo || '';
    favicon ||= assets.images.favicon || '';
    ogImage ||= assets.images.ogImage || '';
  });

  return {
    images: {
      logo: logo || undefined,
      favicon: favicon || undefined,
      ogImage: ogImage || undefined,
      heroImages: Array.from(allImages).filter((image) => image !== logo && image !== favicon).slice(0, 10),
      allImages: Array.from(allImages).slice(0, 28),
    },
    colors: mergedColors,
    fonts: fonts.slice(0, 12),
    componentStyles: firstAssets?.componentStyles || {},
    personality: firstAssets?.personality,
    designSystem: firstAssets?.designSystem,
    metadata: firstAssets?.metadata || {},
    socialLinks: Array.from(socialLinks).slice(0, 20),
    pages: pages.map((page) => page.brandAssets.pages[0]).filter(Boolean),
    externalResearch: firstAssets?.externalResearch,
    rawBranding: firstAssets?.rawBranding,
  };
};

const normalizeExternalResearch = (value: unknown, baseUrl: string): BrandAssets['externalResearch'] | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Record<string, unknown>;
  const sources = (Array.isArray(input.sources) ? input.sources : [])
    .slice(0, 16)
    .map((source): BrandAssets['externalResearch']['sources'][number] | null => {
      if (!source || typeof source !== 'object') return null;
      const record = source as Record<string, unknown>;
      const url = normalizePublicAssetUrl(record.url, baseUrl);
      const title = cleanTextField(record.title, 180);
      const content = cleanTextField(record.content, 500);
      if (!url || (!title && !content)) return null;
      const score = Number(record.score);
      return {
        title: title || new URL(url).hostname,
        url,
        content,
        score: Number.isFinite(score) ? Math.round(score * 1000) / 1000 : undefined,
      };
    })
    .filter((source): source is BrandAssets['externalResearch']['sources'][number] => Boolean(source));
  if (sources.length === 0) return undefined;

  return {
    provider: 'tavily',
    queries: normalizeStringArray(input.queries, 6, 180),
    answers: normalizeStringArray(input.answers, 6, 900),
    sources,
    socialLinks: normalizeStringArray(input.socialLinks, 20, 500)
      .map((link) => normalizePublicAssetUrl(link, baseUrl))
      .filter(Boolean),
    raw: clipJsonValue(input.raw),
  };
};

const researchBrandEverywhere = async (websiteUrl: URL, pages: ScrapedPage[]): Promise<BrandAssets['externalResearch'] | undefined> => {
  if (process.env.ENABLE_TAVILY_RESEARCH !== 'true') return undefined;
  const key = process.env.TAVILY_API_KEY;
  if (!key) return undefined;

  const page = pages[0];
  const domain = websiteUrl.hostname.replace(/^www\./, '');
  const brandName = (page?.title || domain)
    .replace(/\s*[|–-].*$/, '')
    .replace(/\bofficial\b/ig, '')
    .replace(/\bonline store\b/ig, '')
    .trim() || domain;
  const queries = [
    `"${brandName}" "${domain}" official products category proof points`,
    `"${brandName}" official social profiles Instagram TikTok LinkedIn YouTube ${domain}`,
  ];
  const responses: any[] = [];

  for (const query of queries) {
    try {
      const response = await fetchWithTimeout(TAVILY_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: key,
          query,
          search_depth: 'basic',
          include_answer: true,
          include_raw_content: false,
          max_results: 6,
        }),
      }, TAVILY_TIMEOUT_MS);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Tavily search failed (${response.status}): ${body.slice(0, 180)}`);
      }
      responses.push(await response.json());
    } catch (error) {
      console.warn('[brand-research] tavily_failed', query, error instanceof Error ? error.message : error);
    }
  }

  const sourceMap = new Map<string, BrandAssets['externalResearch']['sources'][number]>();
  const answers: string[] = [];
  responses.forEach((payload) => {
    const answer = cleanTextField(payload?.answer, 900);
    if (answer) answers.push(answer);
    (Array.isArray(payload?.results) ? payload.results : []).forEach((result: any) => {
      const url = normalizePublicAssetUrl(result?.url, websiteUrl.href);
      if (!url || sourceMap.has(url)) return;
      sourceMap.set(url, {
        title: cleanTextField(result?.title, 180) || new URL(url).hostname,
        url,
        content: cleanTextField(result?.content, 500),
        score: Number.isFinite(Number(result?.score)) ? Math.round(Number(result.score) * 1000) / 1000 : undefined,
      });
    });
  });

  const sources = Array.from(sourceMap.values()).slice(0, 16);
  if (sources.length === 0 && answers.length === 0) return undefined;
  const socialLinks = extractSocialLinks(sources.map((source) => source.url), websiteUrl.href);
  return {
    provider: 'tavily',
    queries,
    answers: answers.filter((answer, index, list) => list.indexOf(answer) === index).slice(0, 4),
    sources,
    socialLinks,
    raw: clipJsonValue(responses, 0),
  };
};

const firecrawlScrape = async (url: string, includeLinks: boolean): Promise<ScrapedPage> => {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error('FIRECRAWL_API_KEY is not set.');

  const response = await fetchWithTimeout(FIRECRAWL_SCRAPE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: includeLinks ? ['markdown', 'links', 'branding'] : ['markdown', 'branding'],
      onlyMainContent: true,
      removeBase64Images: true,
      blockAds: true,
      timeout: FIRECRAWL_TIMEOUT_MS,
      maxAge: BRAND_RESEARCH_CACHE_TTL_MS,
    }),
  }, FIRECRAWL_TIMEOUT_MS + 3000);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firecrawl scrape failed (${response.status}): ${body.slice(0, 240)}`);
  }

  const payload: any = await response.json();
  if (!payload?.success || !payload?.data) {
    throw new Error('Firecrawl returned an empty scrape.');
  }

  const data = payload.data;
  const metadata = data.metadata || {};
  const brandingColors = data.branding?.colors || {};
  const brandingImages = data.branding?.images || {};
  const colors = Object.values(brandingColors).filter((color): color is string => (
    typeof color === 'string' && HEX_COLOR_PATTERN.test(color)
  ));
  const logoUrl = firstPublicAssetUrl([
    brandingImages.logo,
    metadata.logo,
  ].filter((asset) => !isLikelyFaviconAsset(asset)), url);
  const markdown = String(data.markdown || '').slice(0, 18000);
  const links = Array.isArray(data.links) ? data.links.map(String) : [];
  const brandAssets = buildPageBrandAssets({
    url,
    data,
    colors,
    logoUrl,
    markdown,
    links,
  });

  return {
    url: String(metadata.sourceURL || metadata.url || url),
    title: String(metadata.title || ''),
    description: String(metadata.description || ''),
    markdown,
    links,
    colors,
    logoUrl: logoUrl || undefined,
    brandAssets,
  };
};

const decodeHtmlEntities = (value: string) => value
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

const extractHtmlMeta = (html: string, key: string) => {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escapedKey}["'][^>]*>`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim());
  }
  return '';
};

const fallbackHtmlScrape = async (url: string): Promise<ScrapedPage> => {
  const response = await fetchWithTimeout(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; WigglyBrandResearch/1.0)',
      accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  }, FIRECRAWL_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(`Fallback HTML scrape failed (${response.status}).`);
  }

  const finalUrl = response.url || url;
  const html = await response.text();
  const title = decodeHtmlEntities(html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.replace(/\s+/g, ' ').trim() || '');
  const description = extractHtmlMeta(html, 'description') || extractHtmlMeta(html, 'og:description');
  const metadata = {
    title,
    description,
    ogTitle: extractHtmlMeta(html, 'og:title'),
    ogDescription: extractHtmlMeta(html, 'og:description'),
    ogImage: extractHtmlMeta(html, 'og:image') || extractHtmlMeta(html, 'twitter:image'),
    icon: html.match(/<link[^>]+rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] || '',
  };
  const links = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)).map((match) => match[1]).slice(0, 120);
  const brandAssets = buildPageBrandAssets({
    url: finalUrl,
    data: { metadata, branding: { images: { favicon: metadata.icon, ogImage: metadata.ogImage } } },
    colors: [],
    logoUrl: '',
    markdown: [
      title,
      description,
      metadata.ogTitle,
      metadata.ogDescription,
    ].filter(Boolean).join('\n'),
    links,
  });

  return {
    url: finalUrl,
    title,
    description,
    markdown: brandAssets.pages[0]?.markdownPreview || `${title}\n${description}`,
    links,
    colors: [],
    logoUrl: undefined,
    brandAssets,
  };
};

const buildResearchText = (pages: ScrapedPage[]) => pages
  .map((page, index) => [
    `PAGE ${index + 1}: ${page.title || page.url}`,
    `URL: ${page.url}`,
    page.description ? `Description: ${page.description}` : '',
    page.logoUrl ? `Logo found: ${page.logoUrl}` : '',
    page.colors.length ? `Brand colors found: ${page.colors.slice(0, 5).join(', ')}` : '',
    page.markdown,
  ].filter(Boolean).join('\n'))
  .join('\n\n---\n\n')
  .slice(0, MAX_RESEARCH_CHARS);

const appendExternalResearchText = (researchText: string, externalResearch: BrandAssets['externalResearch']) => {
  if (!externalResearch) return researchText;
  const outsideText = [
    'OUTSIDE WEB RESEARCH:',
    externalResearch.answers.length ? `Summaries:\n${externalResearch.answers.map((answer) => `- ${answer}`).join('\n')}` : '',
    externalResearch.socialLinks.length ? `Social links found:\n${externalResearch.socialLinks.map((link) => `- ${link}`).join('\n')}` : '',
    externalResearch.sources.length ? `Sources:\n${externalResearch.sources.map((source) => [
      `- ${source.title}`,
      `  URL: ${source.url}`,
      source.content ? `  Snippet: ${source.content}` : '',
    ].filter(Boolean).join('\n')).join('\n')}` : '',
  ].filter(Boolean).join('\n');
  return `${researchText}\n\n---\n\n${outsideText}`.slice(0, MAX_RESEARCH_CHARS);
};

const researchBrandWebsite = async (websiteUrl: URL) => {
  const cacheKey = websiteUrl.href;
  const cached = getBrandResearchCache(cacheKey);
  if (cached) return cached;

  let homepage: ScrapedPage;
  try {
    homepage = await firecrawlScrape(websiteUrl.href, true);
  } catch (error) {
    console.warn('[brand-research] firecrawl_failed_using_html_fallback', websiteUrl.href, error instanceof Error ? error.message : error);
    homepage = await fallbackHtmlScrape(websiteUrl.href);
  }
  const discoveredLinks = homepage.links
    .map((link) => sameOriginUrl(link, websiteUrl))
    .filter((link): link is string => Boolean(link))
    .filter((link, index, links) => links.indexOf(link) === index)
    .filter((link) => link !== websiteUrl.href)
    .slice(0, MAX_RESEARCH_PAGES - 1);

  const extraPages: ScrapedPage[] = [];
  for (const link of discoveredLinks) {
    try {
      extraPages.push(await firecrawlScrape(link, false));
    } catch (error) {
      console.warn('[brand-research] skipped_page', link, error instanceof Error ? error.message : error);
    }
  }

  const pages = [homepage, ...extraPages].slice(0, MAX_RESEARCH_PAGES);
  const brandAssets = mergeBrandAssets(pages);
  const externalResearch = await researchBrandEverywhere(websiteUrl, pages);
  if (externalResearch) {
    brandAssets.externalResearch = externalResearch;
    externalResearch.socialLinks.forEach((link) => {
      if (!brandAssets.socialLinks.includes(link)) brandAssets.socialLinks.push(link);
    });
    brandAssets.socialLinks = brandAssets.socialLinks.slice(0, 20);
  }
  const entry = {
    expiresAt: Date.now() + BRAND_RESEARCH_CACHE_TTL_MS,
    pages,
    researchText: appendExternalResearchText(buildResearchText(pages), externalResearch),
    logoUrl: brandAssets.images.logo || pages.find((page) => page.logoUrl)?.logoUrl,
    brandAssets,
  };
  addBrandResearchCache(cacheKey, entry);
  return entry;
};

const normalizeHexColors = (value: unknown) => {
  const colors = Array.isArray(value) ? value : [];
  return colors
    .map((color) => String(color || '').trim())
    .map((color) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color.toUpperCase();
      if (/^[0-9A-Fa-f]{6}$/.test(color)) return `#${color.toUpperCase()}`;
      const short = color.match(/^#?([0-9A-Fa-f]{3})$/);
      if (short) return `#${short[1].split('').map((char) => `${char}${char}`).join('').toUpperCase()}`;
      return '';
    })
    .filter((color) => HEX_COLOR_PATTERN.test(color))
    .filter((color, index, colors) => colors.indexOf(color) === index)
    .slice(0, 5);
};

const normalizeStringArray = (value: unknown, maxItems: number, maxLength: number) => (
  Array.isArray(value) ? value : []
)
  .map((item) => cleanTextField(item, maxLength))
  .filter(Boolean)
  .filter((item, index, items) => items.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
  .slice(0, maxItems);

const normalizeBrandAssets = (value: unknown, websiteUrl: string): BrandAssets | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Partial<BrandAssets>;
  const imageInput = input.images || { heroImages: [], allImages: [] };
  const colorInput = input.colors || {};
  const normalizedLogo = normalizeImageAssetUrl(imageInput.logo, websiteUrl);
  const normalizedColors = Object.fromEntries(
    Object.entries(colorInput)
      .map(([key, color]) => [cleanTextField(key, 60), String(color || '').trim().toUpperCase()])
      .filter(([key, color]) => key && HEX_COLOR_PATTERN.test(color))
      .slice(0, 20)
  );

  return {
    images: {
      logo: normalizedLogo && !isLikelyFaviconAsset(normalizedLogo) ? normalizedLogo : undefined,
      favicon: normalizeImageAssetUrl(imageInput.favicon, websiteUrl) || undefined,
      ogImage: normalizeImageAssetUrl(imageInput.ogImage, websiteUrl) || undefined,
      heroImages: normalizeStringArray(imageInput.heroImages, 12, 500)
        .map((image) => normalizeImageAssetUrl(image, websiteUrl))
        .filter(Boolean),
      allImages: normalizeStringArray(imageInput.allImages, 28, 500)
        .map((image) => normalizeImageAssetUrl(image, websiteUrl))
        .filter(Boolean),
    },
    colors: normalizedColors,
    fonts: extractFonts(input.fonts),
    componentStyles: (clipJsonValue(input.componentStyles || {}, 0) || {}) as Record<string, unknown>,
    personality: clipJsonValue(input.personality),
    designSystem: clipJsonValue(input.designSystem),
    metadata: normalizeStringRecord(input.metadata, 40, 360),
    socialLinks: normalizeStringArray(input.socialLinks, 20, 500)
      .map((link) => normalizePublicAssetUrl(link, websiteUrl))
      .filter(Boolean),
    pages: (Array.isArray(input.pages) ? input.pages : [])
      .slice(0, 8)
      .map((page) => ({
        url: normalizePublicAssetUrl((page as any)?.url, websiteUrl) || websiteUrl,
        title: cleanTextField((page as any)?.title, 160),
        description: cleanTextField((page as any)?.description, 260),
        colors: normalizeHexColors((page as any)?.colors),
        logoUrl: normalizeImageAssetUrl((page as any)?.logoUrl, websiteUrl) || undefined,
        markdownPreview: cleanTextField((page as any)?.markdownPreview, 2400),
      })),
    externalResearch: normalizeExternalResearch(input.externalResearch, websiteUrl),
    rawBranding: (clipJsonValue(input.rawBranding || {}, 0) || {}) as Record<string, unknown>,
  };
};

const normalizeBrandBrain = (payload: any, websiteUrl: string, fallbackLogoUrl = ''): BrandBrain => ({
  businessName: cleanTextField(payload?.businessName, 60) || new URL(websiteUrl).hostname.replace(/^www\./, ''),
  websiteUrl,
  brandLogoUrl: (() => {
    const logo = normalizeImageAssetUrl(payload?.brandLogoUrl || fallbackLogoUrl, websiteUrl);
    return logo && !isLikelyFaviconAsset(logo) ? logo : undefined;
  })(),
  brandAssets: normalizeBrandAssets(payload?.brandAssets, websiteUrl),
  offer: cleanTextField(payload?.offer, 180),
  audience: cleanTextField(payload?.audience, 180),
  pain: cleanTextField(payload?.pain, 220),
  promisedResult: cleanTextField(payload?.promisedResult, 180),
  differentiator: cleanTextField(payload?.differentiator, 220),
  tone: cleanTextField(payload?.tone, 80) || 'clear, confident, direct',
  colors: normalizeHexColors(payload?.colors).length ? normalizeHexColors(payload?.colors) : ['#00D6B8', '#4F46E5', '#0F172A'],
  proof: normalizeStringArray(payload?.proof, 8, 140),
  bannedGenericPhrases: normalizeStringArray(payload?.bannedGenericPhrases, 12, 80).length
    ? normalizeStringArray(payload?.bannedGenericPhrases, 12, 80)
    : ['transform your business', 'game changer', 'take it to the next level'],
  adAngles: normalizeStringArray(payload?.adAngles, 8, 180),
});

const brandBrainNeedsFallback = (brandBrain: BrandBrain) => {
  const required = [brandBrain.offer, brandBrain.audience, brandBrain.pain];
  return required.some((field) => field.length < 12) || brandBrain.adAngles.length < 4;
};

const titleCaseBrandName = (value: string) => value
  .split(/[\s.-]+/)
  .filter(Boolean)
  .map((part) => part.length <= 3 ? part.toUpperCase() : `${part[0]?.toUpperCase() || ''}${part.slice(1).toLowerCase()}`)
  .join(' ');

const buildHeuristicBrandBrain = ({
  websiteUrl,
  researchText,
  brandAssets,
  brandLogoUrl,
}: {
  websiteUrl: URL;
  researchText: string;
  brandAssets?: BrandAssets;
  brandLogoUrl?: string;
}): BrandBrain => {
  const domain = websiteUrl.hostname.replace(/^www\./, '');
  const domainBrand = titleCaseBrandName(domain.split('.')[0] || 'Brand');
  const metadata = brandAssets?.metadata || {};
  const page = brandAssets?.pages?.[0];
  const title = cleanTextField(page?.title || metadata.title || metadata.ogTitle || domain, 100)
    .replace(/\s*[|–-]\s*(Official|Homepage|Online Store).*$/i, '')
    .replace(/\s*[|–-]\s*.*$/i, '')
    .trim();
  const businessName = title.toLowerCase().includes(domainBrand.toLowerCase()) ? domainBrand : (title || domainBrand);
  const description = cleanTextField(
    page?.description || metadata.description || metadata.ogDescription || researchText,
    220
  );
  const category = description || `${businessName} products and services`;
  const colors = normalizeHexColors(Object.values(brandAssets?.colors || {}));

  return {
    businessName,
    websiteUrl: websiteUrl.href,
    brandLogoUrl: brandLogoUrl || brandAssets?.images.logo || undefined,
    brandAssets,
    offer: category || `Products from ${businessName}`,
    audience: `People considering ${businessName} or similar options`,
    pain: `They need a clear reason to choose ${businessName} instead of another familiar option`,
    promisedResult: `Find the right ${businessName} option faster and feel confident trying it`,
    differentiator: `${businessName} already has brand recognition, product signals, and trust buyers recognize`,
    tone: 'clear, confident, direct',
    colors: colors.length ? colors : ['#00D6B8', '#4F46E5', '#0F172A'],
    proof: [
      description,
      page?.title ? `Website title: ${page.title}` : '',
      brandAssets?.images.logo ? 'Logo found on site' : '',
    ].filter(Boolean).slice(0, 4),
    bannedGenericPhrases: [
      'transform your business',
      'take it to the next level',
      'game changer',
      'unlock your potential',
    ],
    adAngles: [
      `why people choose ${businessName} over another familiar option`,
      `the fastest way to understand what ${businessName} offers`,
      `the everyday moment where ${businessName} becomes the obvious choice`,
      `the product detail that makes ${businessName} easier to trust`,
      `the difference between browsing and finding the right ${businessName} option`,
      `the reason ${businessName} stays top of mind`,
      `the simple promise behind ${businessName}`,
      `what shoppers should notice before they compare alternatives`,
    ],
  };
};

const generateBrandBrain = async (websiteUrl: string, researchText: string, fallbackAnswers?: string[], fallbackLogoUrl = '') => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set.');
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await withTimeout(ai.models.generateContent({
    model: BRAND_RESEARCH_MODEL,
    contents: buildBrandBrainPrompt({ websiteUrl, researchText, fallbackAnswers }),
    config: {
      responseMimeType: 'application/json',
    },
  }), BRAND_BRAIN_TIMEOUT_MS, 'Brand research');
  return normalizeBrandBrain(parseJsonResponse(response.text || '{}'), websiteUrl, fallbackLogoUrl);
};

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
    return phrase.split(/\s+/).filter(Boolean).slice(0, maxWords).join(' ') || fallback;
  };
  const pain = shortPhrase(brandBrain.pain, 4, 'the hidden problem');
  const audience = shortPhrase(brandBrain.audience, 3, 'your buyers');
  const offer = shortPhrase(brandBrain.offer, 4, 'the better answer');
  const result = shortPhrase(brandBrain.promisedResult, 4, 'the better outcome');
  const differentiator = shortPhrase(brandBrain.differentiator, 4, 'the unfair edge');
  const proof = (brandBrain.proof || []).map((item) => shortPhrase(item, 5, '')).filter(Boolean).slice(0, 8);
  const subjects = [pain, audience, offer, result, differentiator, ...proof].filter(Boolean);
  const templates = [
    `${pain} is getting expensive`,
    `${pain} should not be invisible`,
    `Stop letting ${pain} win`,
    `Your audience already feels ${pain}`,
    `${audience} need the faster answer`,
    `${audience} notice the difference fast`,
    `${offer} should look premium`,
    `${offer} is the scroll stopper`,
    `Make ${result} feel obvious`,
    `${result} starts with one clip`,
    `${differentiator} is the ad angle`,
    `Lead with ${differentiator}`,
    `The old workaround is expensive`,
    `Show the problem before they scroll`,
    `Make the hard part visible`,
    `Turn the proof into motion`,
  ];
  const openers = ['Show', 'Make', 'Turn', 'Spotlight', 'Expose', 'Prove', 'Sell', 'Lead with'];
  const closers = [
    'before they scroll',
    'in one glance',
    'with one line',
    'without explaining',
    'as the hook',
    'with motion',
    'in seconds',
    'right away',
    'on the first frame',
    'like a premium brand',
  ];

  proof.forEach((proofPoint) => {
    templates.push(`${proofPoint} should lead the ad`);
    templates.push(`Make ${proofPoint} the hook`);
  });
  angles.forEach((angle) => {
    const clippedAngle = shortPhrase(angle, 5, '');
    if (!clippedAngle) return;
    templates.push(`${clippedAngle} before they scroll`);
    templates.push(`Make ${clippedAngle} feel obvious`);
  });
  subjects.forEach((subject) => {
    openers.forEach((opener) => {
      closers.forEach((closer) => {
        templates.push(`${opener} ${subject} ${closer}`);
      });
    });
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

const generateHeadlineVariations = async (brandBrain: BrandBrain, count: number) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set.');
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await withTimeout(ai.models.generateContent({
    model: HEADLINE_VARIATION_MODEL,
    contents: buildHeadlineVariationsPrompt({ brandBrain, count }),
    config: {
      responseMimeType: 'application/json',
    },
  }), HEADLINE_VARIATION_TIMEOUT_MS, 'Headline generation');
  const parsed = parseJsonResponse(response.text || '{"variations": []}');
  return Array.isArray(parsed) ? parsed : parsed?.variations || [];
};

app.post('/api/research-brand', brandResearchLimiter, async (req, res) => {
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
    } catch (error) {
      console.warn('[brand-research] scrape_failed', websiteUrl.href, error instanceof Error ? error.message : error);
      if (fallbackAnswers.length < 3) {
        const brandBrain = buildHeuristicBrandBrain({
          websiteUrl,
          researchText: '',
          brandAssets,
          brandLogoUrl,
        });
        addBrandBrainCache(brainCacheKey, {
          expiresAt: Date.now() + BRAND_RESEARCH_CACHE_TTL_MS,
          brandBrain,
        });
        return res.json({ needsFallback: false, brandBrain });
      }
    }

    if (!researchText && fallbackAnswers.length >= 3) {
      const fallbackBrandBrain = buildFallbackBrandBrain({ websiteUrl: websiteUrl.href, answers: fallbackAnswers });
      return res.json({
        needsFallback: false,
        brandBrain: brandAssets ? { ...fallbackBrandBrain, brandAssets, brandLogoUrl: brandAssets.images.logo || undefined } : fallbackBrandBrain,
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
    } catch (error) {
      console.warn('[brand-research] brain_failed', websiteUrl.href, error instanceof Error ? error.message : error);
      if (fallbackAnswers.length < 3) {
        brandBrain = buildHeuristicBrandBrain({
          websiteUrl,
          researchText,
          brandAssets,
          brandLogoUrl,
        });
      } else {
        brandBrain = {
          ...buildFallbackBrandBrain({ websiteUrl: websiteUrl.href, answers: fallbackAnswers }),
          brandLogoUrl: brandLogoUrl || undefined,
          brandAssets,
        };
      }
    }

    if (brandBrainNeedsFallback(brandBrain) && fallbackAnswers.length < 3) {
      brandBrain = buildHeuristicBrandBrain({
        websiteUrl,
        researchText,
        brandAssets: brandBrain.brandAssets || brandAssets,
        brandLogoUrl: brandBrain.brandLogoUrl || brandLogoUrl,
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

app.post('/api/generate-ad-stream', adStreamLimiter, async (req, res) => {
  try {
    const rawBrandBrain = req.body?.brandBrain;
    if (!rawBrandBrain || typeof rawBrandBrain !== 'object') {
      return res.status(400).json({ error: 'brandBrain is required.' });
    }

    const websiteUrl = cleanTextField(rawBrandBrain.websiteUrl, 240) || 'https://example.com';
    const brandBrain = normalizeBrandBrain(rawBrandBrain, websiteUrl, cleanTextField(rawBrandBrain.brandLogoUrl, 500));
    const totalCount = Math.min(50, Math.max(10, Number(req.body?.count) || 50));
    const formatMix = normalizeFormatMix(req.body?.formatMix);
    const used = new Set<string>();
    const variations: HeadlineVariation[] = [];

    let rawVariations: any[] = [];
    try {
      rawVariations = await generateHeadlineVariations(brandBrain, totalCount);
    } catch (error) {
      console.warn('[ad-stream] headline_generation_failed', error instanceof Error ? error.message : error);
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

    while (variations.length < totalCount) {
      const fill = fallbackHeadlines(brandBrain, totalCount - variations.length, used);
      if (fill.length === 0) break;
      fill.forEach((variation) => {
        if (variations.length >= totalCount) return;
        used.add(variation.headline.toLowerCase());
        const format = pickGeneratedAdFormat(formatMix, variations.length);
        variations.push({
          ...variation,
          id: `variation-${variations.length + 1}`,
          format,
          conversationLines: format === 'conversation'
            ? buildConversationLines(brandBrain, variation.headline, variation.angle, variations.length)
            : undefined,
        });
      });
    }

    return res.json({
      brandBrain,
      variations: variations.slice(0, totalCount),
    });
  } catch (error: any) {
    console.error('Generate ad stream error:', error);
    return sendServerError(res, 'Could not generate ad variations.');
  }
});

const gibberishPattern = /\b(?:[bcdfghjklmnpqrstvwxyz]{4,}|(?:asdf|sdfg|qwer|zxcv|hjkl|lorem|ipsum)[a-z]*)\b/i;
const forcedNegationPattern = /\b(?:not this|not that|not because|not more|not another|it'?s not|this isn'?t|don'?t just|stop (?:trying|doing|using|making))\b/i;
const staccatoPattern = /(?:^|[.!?]\s+)(?:[A-Z][a-z]{2,12}\. ){2,}/;

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
    staccatoPattern.test(text)
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

const fillDialogueScripts = (scripts: any[], count: number) => {
  const fallbacks = fallbackDialogueScripts(count);
  const combined = [...scripts];
  for (const fallback of fallbacks) {
    if (combined.length >= count) break;
    if (!combined.some((script) => script.title === fallback.title)) {
      combined.push(fallback);
    }
  }
  return combined.slice(0, count);
};

const fallbackDialogueScripts = (count: number) => {
  const scripts = [
    {
      title: 'Missed Call Recovery',
      angle: 'The practice is already paying for leads it never answers.',
      lines: [
        { speaker: 'Ava', tone: 'concerned', text: 'We missed three new patient calls during lunch again.' },
        { speaker: 'Sam', tone: 'calm', text: 'The AI front desk can answer when the team gets busy.' },
        { speaker: 'Ava', tone: 'curious', text: 'So it can book the patient before they call another office?' },
        { speaker: 'Sam', tone: 'assured', text: 'Yes. It answers, follows up, and keeps the appointment moving.' },
      ],
    },
    {
      title: 'After Hours Calls',
      angle: 'Patients call outside normal hours and still expect a response.',
      lines: [
        { speaker: 'Ava', tone: 'frustrated', text: 'The best leads keep calling after we close.' },
        { speaker: 'Sam', tone: 'practical', text: 'The AI front desk can still answer and book them.' },
        { speaker: 'Ava', tone: 'thoughtful', text: 'An AI receptionist could answer those calls at night?' },
        { speaker: 'Sam', tone: 'calm', text: 'And follow up automatically so the patient does not disappear.' },
      ],
    },
    {
      title: 'No More Hiring',
      angle: 'AI covers the front desk gaps without adding payroll.',
      lines: [
        { speaker: 'Ava', tone: 'tired', text: 'I do not want to hire another front desk person.' },
        { speaker: 'Sam', tone: 'steady', text: 'The AI can cover the gaps while your team stays focused.' },
        { speaker: 'Ava', tone: 'interested', text: 'So the AI handles missed calls and follow up?' },
        { speaker: 'Sam', tone: 'confident', text: 'Exactly. Your team stays focused while the calls still get answered.' },
      ],
    },
  ];

  return scripts.slice(0, count);
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

app.post('/api/generate-headlines', aiGenerationLimiter, async (req, res) => {
  try {
    const { niche, count = 20 } = req.body;

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
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

app.post('/api/generate-copy', aiGenerationLimiter, async (req, res) => {
  try {
    const { businessContext } = req.body;
    
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
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

app.post('/api/generate-dialogue-scripts', aiGenerationLimiter, async (req, res) => {
  try {
    const { creativeBrief, persona = 'Dental practice owner', count = 5 } = req.body;

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const briefText = typeof creativeBrief === 'object'
      ? Object.entries(creativeBrief).map(([label, value]) => `${label}: ${value}`).join('\n')
      : String(creativeBrief || '');

    const prompt = `You are a direct-response creative strategist for Wiggly, a visual ad creator.

Create ${count} short two-person dialogue ad scripts for this brief.

Brief:
${briefText}

Persona: ${persona}

The ad should feel like a real-life overheard conversation, not a sales pitch.
One person has the problem. The other casually reveals the solution.
Keep each script 14-26 seconds when read aloud.
No hype. No buzzwords. No testimonials. No fake stats.
No em dashes or en dashes. Use commas or periods only.
No forced negation structure like "not this, but that", "it is not X, it is Y", or "stop doing X".
No staccato sentence stacking. Do not write choppy fragments like "Missed calls. Lost patients. Empty chairs."
Use normal conversational sentences that sound like people talking naturally.
Do not include placeholder text, keyboard-mash text, filler words, lorem ipsum, or nonsensical tokens.
Every line must be fluent English that could be read aloud in the ad.
Never mention Wiggly. Wiggly is the internal builder, not the product being advertised.
Use the offer and CTA from the brief. If the brand name is unknown, say "the AI front desk" instead of inventing one.

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

    let scripts: any[] = [];

    for (let attempt = 0; attempt < 2 && scripts.length === 0; attempt += 1) {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: attempt === 0
          ? prompt
          : `${prompt}\n\nYour previous output failed quality checks. Return clean, fluent English only. Absolutely no em dashes, forced negation, staccato fragments, placeholder text, or keyboard-mash text.`,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{"scripts":[]}';
      scripts = normalizeDialogueScripts(parseJsonResponse(text), Number(count) || 5);
    }

    res.json({ scripts: fillDialogueScripts(scripts, Number(count) || 5) });
  } catch (error: any) {
    console.error("Generate dialogue scripts error:", error);
    sendServerError(res, 'Error generating dialogue scripts.');
  }
});

app.post('/api/generate-dialogue-audio', aiGenerationLimiter, async (req, res) => {
  try {
    const { script } = req.body;

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    if (!script?.lines?.length) {
      return res.status(400).json({ error: 'No script lines provided.' });
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const speakers = Array.from(new Set(script.lines.map((line: any) => String(line.speaker || 'Speaker').trim()).filter(Boolean))).slice(0, 2) as string[];
    while (speakers.length < 2) speakers.push(`Speaker ${speakers.length + 1}`);
    const cleanedLines = script.lines.map((line: any) => ({
      ...line,
      text: cleanHumanDialogueText(line.text),
    }));
    const ttsText = `Read this as a natural, subtle, two-person conversation for a Meta ad. Keep it conversational and not salesy. Do not add em dashes, choppy dramatic pauses, forced contrast phrasing, or robotic cadence.\n\n${cleanedLines.map((line: any) => `${line.speaker}: [${line.tone || 'natural'}] ${line.text}`).join('\n')}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
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
      filename: `${(script.title || 'conversation-ad').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'conversation-ad'}.wav`,
    });
  } catch (error: any) {
    console.error("Generate dialogue audio error:", error);
    sendServerError(res, 'Error generating dialogue audio.');
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
