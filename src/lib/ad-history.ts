const DB_NAME = 'agent_enamel_ad_history';
const DB_VERSION = 1;
const STORE_NAME = 'downloads';
const MAX_HISTORY_ITEMS = 20;

export type StoredAdSnapshot = {
  id: string;
  createdAt: number;
  mediaWarnings?: string[];
  media?: {
    introImage?: Blob;
    audio?: Blob;
    bgMedia?: Blob;
    brandLogo?: Blob;
  };
  [key: string]: any;
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

export async function listAdHistory(): Promise<StoredAdSnapshot[]> {
  const items = await runStore<StoredAdSnapshot[]>('readonly', (store) => store.getAll());
  return (items || []).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveAdHistoryItem(item: StoredAdSnapshot): Promise<StoredAdSnapshot[]> {
  const current = await listAdHistory();
  const next = [item, ...current.filter((existing) => existing.id !== item.id)].slice(0, MAX_HISTORY_ITEMS);

  await runStore('readwrite', (store) => {
    store.clear();
    next.forEach((historyItem) => store.put(historyItem));
  });

  return next;
}

export async function deleteAdHistoryItem(id: string): Promise<StoredAdSnapshot[]> {
  await runStore('readwrite', (store) => store.delete(id));
  return listAdHistory();
}
