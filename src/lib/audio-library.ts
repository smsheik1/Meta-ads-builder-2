import Dexie, { type Table } from 'dexie';
import type { Caption } from '../store';

const DB_NAME = 'wiggly_audio_library';
const STORE_NAME = 'audios';
const MAX_AUDIO_ITEMS = 12;

export type AudioAssetKind = 'uploaded' | 'generated';
export type AudioAssetSource = 'user-upload' | 'voice-wizard';
export type AudioAssetStatus = 'ready' | 'needs-reupload';

export type StoredAudioItem = {
  id: string;
  name: string;
  createdAt: number;
  blob: Blob;
  mimeType: string;
  kind?: AudioAssetKind;
  source?: AudioAssetSource;
  brandKey?: string | null;
  captions?: Caption[];
  fingerprint?: string;
  status?: AudioAssetStatus;
};

class WigglyAudioDb extends Dexie {
  audios!: Table<StoredAudioItem, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      [STORE_NAME]: 'id',
    });
    this.version(2).stores({
      [STORE_NAME]: 'id, createdAt, name, kind, source, fingerprint, status',
    }).upgrade(async (transaction) => {
      const table = transaction.table(STORE_NAME);
      const items = await table.toArray();
      await Promise.all(items.map((item) => table.put(normalizeAudioItem(item as StoredAudioItem))));
    });
  }
}

const audioDb = new WigglyAudioDb();

const createId = () => (
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `audio-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const isUsableBlob = (blob: unknown): blob is Blob => blob instanceof Blob && blob.size > 0;

const normalizeAudioItem = (item: StoredAudioItem): StoredAudioItem => ({
  ...item,
  id: item.id || createId(),
  name: item.name || 'Audio',
  createdAt: item.createdAt || Date.now(),
  mimeType: item.mimeType || item.blob?.type || 'audio/mpeg',
  kind: item.kind || 'uploaded',
  source: item.source || 'user-upload',
  status: isUsableBlob(item.blob) ? 'ready' : 'needs-reupload',
});

const hashBlob = async (blob: Blob) => {
  if (!crypto?.subtle) return `${blob.type}:${blob.size}`;
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
};

const withFingerprint = async (item: StoredAudioItem): Promise<StoredAudioItem> => {
  const normalized = normalizeAudioItem(item);
  if (!isUsableBlob(normalized.blob)) return normalized;
  return {
    ...normalized,
    fingerprint: normalized.fingerprint || await hashBlob(normalized.blob),
  };
};

const dedupeAudioItems = (items: StoredAudioItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!isUsableBlob(item.blob) || item.status === 'needs-reupload') return false;
    const key = item.fingerprint || `${item.name.toLowerCase()}-${item.mimeType}-${item.blob.size}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export async function listAudioItems(): Promise<StoredAudioItem[]> {
  const items = await audioDb.audios.toArray();
  return dedupeAudioItems(items.map(normalizeAudioItem)).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveAudioItem(item: StoredAudioItem): Promise<StoredAudioItem[]> {
  const normalized = await withFingerprint(item);
  const current = await audioDb.audios.toArray();
  const readyCurrent = dedupeAudioItems(current.map(normalizeAudioItem));
  const existing = readyCurrent.find((audioItem) => (
    Boolean(normalized.fingerprint && audioItem.fingerprint === normalized.fingerprint)
  ));
  const itemToSave = {
    ...normalized,
    id: existing?.id || normalized.id || createId(),
    createdAt: existing?.createdAt || normalized.createdAt || Date.now(),
  };
  const next = [itemToSave, ...readyCurrent.filter((audioItem) => audioItem.id !== itemToSave.id)].slice(0, MAX_AUDIO_ITEMS);

  await audioDb.transaction('rw', audioDb.audios, async () => {
    await audioDb.audios.clear();
    await audioDb.audios.bulkPut(next);
  });

  return next;
}

export async function deleteAudioItem(id: string): Promise<StoredAudioItem[]> {
  await audioDb.audios.delete(id);
  return listAudioItems();
}
