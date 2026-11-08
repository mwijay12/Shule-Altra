/**
 * @fileOverview Offline demo media storage (IndexedDB).
 *
 * Uploaded landing photographs are far too large for localStorage: the seeded
 * demo database alone is ~1.3 MB and a single 1600px JPEG adds ~470 KB once
 * base64-encoded, so a fully branded landing page would blow the ~5 MB quota and
 * the demo store would silently fall back to memory (losing every edit on
 * reload). Blobs therefore live in IndexedDB, and the Firestore-shaped document
 * only carries a tiny stable reference such as
 * `demo-media:landing/school-001/heroClassroom`.
 *
 * Every entry point degrades gracefully: when IndexedDB is unavailable (private
 * mode, old browser, blocked storage) callers fall back to an inline data URL.
 */

const DB_NAME = 'shule-altra.demo.media';
const DB_VERSION = 1;
const STORE = 'blobs';

/** Scheme used inside demo documents to point at an IndexedDB blob. */
export const DEMO_MEDIA_SCHEME = 'demo-media:';

/** Build the stored reference for a key. Pure — safe in Node/tests. */
export function demoMediaRef(key: string): string {
  return `${DEMO_MEDIA_SCHEME}${key}`;
}

/** Is this src a demo media reference? Pure — safe in Node/tests. */
export function isDemoMediaRef(src: unknown): src is string {
  return typeof src === 'string' && src.startsWith(DEMO_MEDIA_SCHEME);
}

/** Extract the storage key from a reference. Pure — safe in Node/tests. */
export function demoMediaKey(src: string): string {
  return isDemoMediaRef(src) ? src.slice(DEMO_MEDIA_SCHEME.length) : '';
}

/** Stable per-slot key, so replacing a photograph overwrites rather than accumulates. */
export function landingMediaKey(schoolId: string, slot: string): string {
  return `landing/${schoolId}/${slot}`;
}

function available(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

let dbPromise: Promise<IDBDatabase> | null = null;

function open(version?: number): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request =
      version === undefined ? window.indexedDB.open(DB_NAME) : window.indexedDB.open(DB_NAME, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open demo media store'));
    request.onblocked = () => reject(new Error('Demo media store is blocked'));
  });
}

function openDb(): Promise<IDBDatabase> {
  if (!available()) return Promise.reject(new Error('IndexedDB unavailable'));
  if (dbPromise) return dbPromise;
  dbPromise = open(DB_VERSION)
    .then(async (db) => {
      // A database can already exist at this version without our store (older
      // build, interrupted upgrade, another tool opened it). Re-open one version
      // higher so onupgradeneeded actually runs instead of failing every write.
      if (db.objectStoreNames.contains(STORE)) return db;
      const nextVersion = db.version + 1;
      db.close();
      return open(nextVersion);
    })
    .catch((error) => {
      dbPromise = null;
      throw error;
    });
  return dbPromise;
}

function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error ?? new Error('Demo media operation failed'));
        tx.onabort = () => reject(tx.error ?? new Error('Demo media transaction aborted'));
      })
  );
}

/** Persist a blob. Rejects when storage is unavailable so the caller can fall back. */
export async function putDemoMedia(key: string, blob: Blob): Promise<void> {
  await transact('readwrite', (store) => store.put(blob, key));
}

/** Read a blob, or null when it is missing/unavailable. Never throws. */
export async function getDemoMedia(key: string): Promise<Blob | null> {
  try {
    const blob = await transact<Blob | undefined>('readonly', (store) => store.get(key));
    return blob ?? null;
  } catch {
    return null;
  }
}

/** Remove one blob. Best-effort. */
export async function deleteDemoMedia(key: string): Promise<void> {
  try {
    await transact('readwrite', (store) => store.delete(key));
  } catch {
    /* nothing to clean up */
  }
}

/** Drop every demo blob (used by the demo purge). Best-effort. */
export async function clearDemoMedia(): Promise<void> {
  try {
    await transact('readwrite', (store) => store.clear());
  } catch {
    /* nothing to clean up */
  }
}
