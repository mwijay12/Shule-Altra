/**
 * @fileOverview Offline demo datastore.
 *
 * A tiny, dependency-free document store that mimics the subset of Cloud
 * Firestore used by this application. It lets the whole Shule Altra hub run
 * as a self-contained demo (no Google Cloud project, no network) while
 * keeping every page code path identical to production.
 *
 * Documents are persisted to localStorage so a demo survives refreshes,
 * and an in-memory bus emulates real-time `onSnapshot` listeners.
 */

import { DemoTimestamp, isSentinel } from './timestamp';
import { buildDemoDataset, DEMO_SCHEMA_VERSION } from './seed-data';

const STORAGE_KEY = 'shule-altra.demo.db.v2';
const VERSION_KEY = 'shule-altra.demo.schema';

export interface StoredDoc {
  [key: string]: any;
}

type Listener = () => void;

const documents = new Map<string, StoredDoc>();
const listeners = new Set<Listener>();

let hydrated = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let notifyTimer: ReturnType<typeof setTimeout> | null = null;
let lastPersistError = false;

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/* -------------------------------------------------------------------------- */
/*  Serialization                                                              */
/* -------------------------------------------------------------------------- */

function encode(value: any): any {
  if (value instanceof DemoTimestamp) {
    return { __type: 'timestamp', ms: value.toMillis() };
  }
  if (value instanceof Date) {
    return { __type: 'date', ms: value.getTime() };
  }
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value)) out[key] = encode(value[key]);
    return out;
  }
  return value;
}

function decode(value: any): any {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') {
    if (value.__type === 'timestamp' && typeof value.ms === 'number') {
      return DemoTimestamp.fromMillis(value.ms);
    }
    if (value.__type === 'date' && typeof value.ms === 'number') {
      return new Date(value.ms);
    }
    const out: Record<string, any> = {};
    for (const key of Object.keys(value)) out[key] = decode(value[key]);
    return out;
  }
  return value;
}

function serialize(): string {
  const payload: Record<string, StoredDoc> = {};
  documents.forEach((doc, path) => {
    payload[path] = encode(doc);
  });
  return JSON.stringify(payload);
}

function deserialize(raw: string): boolean {
  try {
    const payload = JSON.parse(raw) as Record<string, StoredDoc>;
    if (!payload || typeof payload !== 'object') return false;
    Object.keys(payload).forEach((path) => {
      documents.set(path, decode(payload[path]));
    });
    return documents.size > 0;
  } catch (error) {
    console.warn('[DEMO] Could not parse persisted demo database:', error);
    return false;
  }
}

function schedulePersist() {
  if (!hasWindow()) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      window.localStorage.setItem(STORAGE_KEY, serialize());
      window.localStorage.setItem(VERSION_KEY, String(DEMO_SCHEMA_VERSION));
    } catch (error) {
      if (!lastPersistError) {
        lastPersistError = true;
        console.warn('[DEMO] Local persistence unavailable (quota or privacy mode). Demo continues in memory.');
      }
    }
  }, 120);
}

/* -------------------------------------------------------------------------- */
/*  Hydration + seeding                                                        */
/* -------------------------------------------------------------------------- */

function hydrate() {
  if (hydrated) return;
  hydrated = true;

  if (hasWindow()) {
    const storedVersion = window.localStorage.getItem(VERSION_KEY);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const versionMatches = storedVersion === String(DEMO_SCHEMA_VERSION);

    if (stored && versionMatches) {
      if (deserialize(stored)) return;
    } else if (stored && !versionMatches) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  seed();
}

function seed() {
  const dataset = buildDemoDataset();
  Object.keys(dataset).forEach((path) => {
    documents.set(path, dataset[path]);
  });
  schedulePersist();
}

/** Force a fresh dataset (used by the Settings "Reseed demo" control). */
export function resetDemoDatabase(newDataset?: Record<string, StoredDoc>) {
  documents.clear();
  const dataset = newDataset || buildDemoDataset();
  Object.keys(dataset).forEach((path) => {
    documents.set(path, dataset[path]);
  });
  schedulesNotify();
  schedulePersist();
}

function schedulesNotify() {
  // Coalesce bursts of writes (batch seeding, registers) into one notification
  if (notifyTimer) return;
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('[DEMO] listener failed', error);
      }
    });
  }, 0);
}

/* -------------------------------------------------------------------------- */
/*  Path helpers                                                               */
/* -------------------------------------------------------------------------- */

export function normalizePath(path: string): string {
  return path.split('/').filter(Boolean).join('/');
}

export function isDocumentPath(path: string): boolean {
  return normalizePath(path).split('/').length % 2 === 0;
}

export function collectionOf(path: string): string {
  const parts = normalizePath(path).split('/');
  if (parts.length % 2 === 0) return parts.slice(0, -1).join('/');
  return parts.join('/');
}

/* -------------------------------------------------------------------------- */
/*  Write helpers                                                              */
/* -------------------------------------------------------------------------- */

function resolveValue(value: any, existing: any): any {
  if (isSentinel(value)) {
    const sentinel = value as { __type: string; value?: number; values?: any[] };
    switch (sentinel.__type) {
      case 'serverTimestamp':
        return DemoTimestamp.now();
      case 'increment':
        return (typeof existing === 'number' ? existing : 0) + (sentinel.value || 0);
      case 'arrayUnion': {
        const current = Array.isArray(existing) ? existing : [];
        const additions = (sentinel.values || []).filter(
          (item) => !current.some((entry: any) => JSON.stringify(entry) === JSON.stringify(item))
        );
        return [...current, ...additions];
      }
      case 'deleteField':
        return undefined;
      default:
        return value;
    }
  }
  if (value instanceof DemoTimestamp || value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => resolveValue(item, undefined));
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value)) out[key] = resolveValue(value[key], undefined);
    return out;
  }
  return value;
}

function applyPatch(existing: StoredDoc, patch: StoredDoc, merge: boolean): StoredDoc {
  const base: StoredDoc = merge ? { ...existing } : {};
  for (const key of Object.keys(patch)) {
    const raw = patch[key];
    if (key.includes('.')) {
      // dotted field path support (e.g. "metadata.phone")
      const segments = key.split('.');
      let cursor: Record<string, any> = base;
      segments.forEach((segment, index) => {
        if (index === segments.length - 1) {
          const resolved = resolveValue(raw, undefined);
          if (resolved === undefined) delete cursor[segment];
          else cursor[segment] = resolved;
          return;
        }
        if (!cursor[segment] || typeof cursor[segment] !== 'object') cursor[segment] = {};
        cursor = cursor[segment];
      });
      continue;
    }
    const resolved = resolveValue(raw, existing ? existing[key] : undefined);
    if (resolved === undefined) delete base[key];
    else base[key] = resolved;
  }
  return base;
}

function notify() {
  schedulesNotify();
}

export function readDocument(path: string): StoredDoc | undefined {
  hydrate();
  return documents.get(normalizePath(path));
}

export function writeDocument(path: string, data: StoredDoc, merge = false): void {
  hydrate();
  const normalized = normalizePath(path);
  const existing = documents.get(normalized) || {};
  documents.set(normalized, applyPatch(existing, data, merge));
  notify();
  schedulePersist();
}

export function patchDocument(path: string, data: StoredDoc): void {
  hydrate();
  const normalized = normalizePath(path);
  const existing = documents.get(normalized);
  if (!existing) {
    throw new Error(
      `No document to update: ${normalized}. In demo mode, updateDoc() requires the document to exist (use setDoc with merge instead).`
    );
  }
  documents.set(normalized, applyPatch(existing, data, true));
  notify();
  schedulePersist();
}

export function removeDocument(path: string): void {
  hydrate();
  const normalized = normalizePath(path);
  if (documents.has(normalized)) {
    documents.delete(normalized);
    notify();
    schedulePersist();
  }
}

export function deleteCollection(path: string): void {
  hydrate();
  const prefix = `${normalizePath(path)}/`;
  Array.from(documents.keys()).forEach((key) => {
    if (key.startsWith(prefix)) documents.delete(key);
  });
  notify();
  schedulePersist();
}

export function readCollection(path: string): Array<{ id: string; path: string; data: StoredDoc }> {
  hydrate();
  const base = normalizePath(path);
  const prefix = `${base}/`;
  const rows: Array<{ id: string; path: string; data: StoredDoc }> = [];
  documents.forEach((data, key) => {
    if (!key.startsWith(prefix)) return;
    const remainder = key.slice(prefix.length);
    if (remainder.includes('/')) return; // subcollection document
    rows.push({ id: remainder, path: key, data });
  });
  return rows;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function generateId(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i += 1) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

export function demoDatabaseStats(): { documents: number; collections: number; version: number } {
  hydrate();
  const collections = new Set<string>();
  documents.forEach((_value, key) => {
    collections.add(collectionOf(key));
  });
  return { documents: documents.size, collections: collections.size, version: DEMO_SCHEMA_VERSION };
}

/** Exposed for tests / tooling. */
export function __unsafeSnapshot(): Record<string, StoredDoc> {
  hydrate();
  const out: Record<string, StoredDoc> = {};
  documents.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}
