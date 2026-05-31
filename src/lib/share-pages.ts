import Dexie, { type Table } from 'dexie';
import { isSupabaseConfigured, supabase } from './supabase';

const DB_NAME = 'wiggly_share_pages';
const STORE_NAME = 'shares';

export type SharePageRecord = {
  id: string;
  slug: string;
  createdAt: number;
  videoBlob: Blob;
  videoUrl?: string;
  videoPath?: string;
  videoMimeType: string;
  headline: string;
  subhead: string;
  ctaText: string;
  ctaUrl: string;
  businessName: string;
  brandName: string;
  accentColor: string;
  backgroundColor: string;
};

class WigglyShareDb extends Dexie {
  shares!: Table<SharePageRecord, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      [STORE_NAME]: 'id, slug, createdAt',
    });
  }
}

const shareDb = new WigglyShareDb();

const createId = () => (
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `share-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

export const createShareSlug = (headline: string) => {
  const base = headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 42) || 'wiggly-ad';
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
};

export async function saveSharePage(record: Omit<SharePageRecord, 'id' | 'createdAt'>): Promise<SharePageRecord> {
  const item: SharePageRecord = {
    ...record,
    id: createId(),
    createdAt: Date.now(),
  };
  await shareDb.shares.put(item);
  return item;
}

export async function getSharePageBySlug(slug: string): Promise<SharePageRecord | null> {
  const record = await shareDb.shares.where('slug').equals(slug).first();
  return record || null;
}

export async function saveHostedSharePage(record: Omit<SharePageRecord, 'id' | 'createdAt'>): Promise<SharePageRecord> {
  if (!supabase) return saveSharePage(record);

  const client = supabase as any;
  const videoPath = `ad-shares/${record.slug}.mp4`;
  const upload = await client.storage
    .from('ad-shares')
    .upload(videoPath, record.videoBlob, {
      contentType: record.videoMimeType || 'video/mp4',
      upsert: false,
    });
  if (upload.error) throw upload.error;

  const insert = await client
    .from('ad_shares')
    .insert({
      slug: record.slug,
      video_path: videoPath,
      headline: record.headline,
      subhead: record.subhead,
      cta_text: record.ctaText,
      cta_url: record.ctaUrl,
      business_name: record.businessName,
      brand_name: record.brandName,
      accent_color: record.accentColor,
      background_color: record.backgroundColor,
    })
    .select('*')
    .single();
  if (insert.error) throw insert.error;
  if (!insert.data) throw new Error('Share page was not saved.');

  const publicUrl = client.storage.from('ad-shares').getPublicUrl(videoPath).data.publicUrl;
  return {
    ...record,
    id: insert.data.id,
    createdAt: new Date(insert.data.created_at).getTime(),
    videoPath,
    videoUrl: publicUrl,
  };
}

export async function getHostedSharePageBySlug(slug: string): Promise<SharePageRecord | null> {
  if (!supabase) return getSharePageBySlug(slug);

  const client = supabase as any;
  const result = await client
    .from('ad_shares')
    .select('*')
    .eq('slug', slug)
    .single();

  if (result.error) {
    if (result.error.code === 'PGRST116') return null;
    throw result.error;
  }
  if (!result.data) return null;

  const publicUrl = client.storage.from('ad-shares').getPublicUrl(result.data.video_path).data.publicUrl;
  return {
    id: result.data.id,
    slug: result.data.slug,
    createdAt: new Date(result.data.created_at).getTime(),
    videoBlob: new Blob(),
    videoUrl: publicUrl,
    videoPath: result.data.video_path,
    videoMimeType: 'video/mp4',
    headline: result.data.headline,
    subhead: result.data.subhead,
    ctaText: result.data.cta_text,
    ctaUrl: result.data.cta_url,
    businessName: result.data.business_name,
    brandName: result.data.brand_name,
    accentColor: result.data.accent_color,
    backgroundColor: result.data.background_color,
  };
}

export { isSupabaseConfigured };
