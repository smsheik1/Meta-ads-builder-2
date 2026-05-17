const DB_NAME = 'wiggly_audio_library';
const DB_VERSION = 1;
const STORE_NAME = 'audios';
const MAX_AUDIO_ITEMS = 12;

export type StoredAudioItem = {
  id: string;
  name: string;
  createdAt: number;
  blob: Blob;
  mimeType: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runStore<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then((db) => new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = callback(store);

    if (request) {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } else {
      tx.oncomplete = () => resolve(undefined);
    }

    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }).finally(() => db.close()));
}

export async function listAudioItems(): Promise<StoredAudioItem[]> {
  const items = await runStore<StoredAudioItem[]>('readonly', (store) => store.getAll());
  return (items || []).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveAudioItem(item: StoredAudioItem): Promise<StoredAudioItem[]> {
  const current = await listAudioItems();
  const next = [item, ...current.filter((existing) => existing.id !== item.id)].slice(0, MAX_AUDIO_ITEMS);

  await runStore('readwrite', (store) => {
    store.clear();
    next.forEach((audioItem) => store.put(audioItem));
  });

  return next;
}

export async function deleteAudioItem(id: string): Promise<StoredAudioItem[]> {
  await runStore('readwrite', (store) => store.delete(id));
  return listAudioItems();
}
