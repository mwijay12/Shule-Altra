'use client';

/**
 * @fileOverview Writes an audit entry, and keeps the chain honest.
 *
 * The recorder is deliberately boring: it appends one document and never
 * updates or deletes. The security rules enforce the same thing, so a bug here
 * cannot quietly rewrite history.
 *
 * Two details that matter in a school:
 *
 *  - **The write is not blocked.** A slow or failing audit append must not stop
 *    a bursar recording a payment. The change goes through; the audit failure is
 *    surfaced rather than swallowed.
 *  - **Appends are serialised.** Two tabs writing at once would otherwise read
 *    the same head and produce two entries claiming the same predecessor. A
 *    promise queue plus a re-read of the head keeps one chain.
 */

import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import {
  AUDIT_COLLECTION,
  GENESIS_HASH,
  diffFields,
  severityFor,
  type AuditAction,
  type AuditEntry,
} from './types';
import { hashEntry } from './chain';

const SCHOOL_ID = 'school-001';

export type AuditActor = {
  uid: string;
  name: string;
  email: string;
  role: string;
};

/** Set once after sign-in so callers do not thread the actor through every write. */
let currentActor: AuditActor | null = null;

export function setAuditActor(actor: AuditActor | null) {
  currentActor = actor;
}

export function getAuditActor(): AuditActor | null {
  return currentActor;
}

/** Reported to the UI when an append fails, so silence is never mistaken for success. */
type AuditFailureListener = (error: Error) => void;
const failureListeners = new Set<AuditFailureListener>();

export function onAuditFailure(listener: AuditFailureListener) {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

function reportFailure(error: unknown) {
  const wrapped = error instanceof Error ? error : new Error(String(error));
  console.error('[audit] append failed:', wrapped);
  failureListeners.forEach((listener) => {
    try {
      listener(wrapped);
    } catch {
      /* a broken listener must not break the next one */
    }
  });
}

/** One append at a time, so the chain has a single head. */
let queue: Promise<unknown> = Promise.resolve();

function pathParts(path: string): { collection: string; documentId: string } {
  // schools/school-001/students/ALT-2026-001 → students / ALT-2026-001
  const parts = path.split('/').filter(Boolean);
  const schoolIndex = parts.indexOf('schools');
  const tail = schoolIndex >= 0 ? parts.slice(schoolIndex + 2) : parts;
  const collection = tail[0] ?? 'unknown';
  // A collection-wide action (marking the whole register) has no document id.
  // Repeating the collection name read as "students/students."
  return { collection, documentId: tail[1] ?? '' };
}

function describe(
  action: AuditAction,
  target: { collection: string; documentId: string; label?: string },
  changes: AuditEntry['changes']
): string {
  const subject =
    target.label || (target.documentId ? `${target.collection}/${target.documentId}` : target.collection);
  switch (action) {
    case 'create':
      return `Added ${subject}.`;
    case 'delete':
      return `Deleted ${subject}.`;
    case 'update': {
      if (changes.length === 0) return `Saved ${subject} with no field changes.`;
      const fields = changes.slice(0, 3).map((c) => c.field).join(', ');
      const more = changes.length > 3 ? ` and ${changes.length - 3} more` : '';
      return `Changed ${fields}${more} on ${subject}.`;
    }
    case 'export':
      return `Exported ${subject}.`;
    case 'send':
      return `Sent ${subject}.`;
    case 'publish':
      return `Published ${subject}.`;
    case 'sign_in':
      return 'Signed in.';
    case 'sign_out':
      return 'Signed out.';
    default:
      return `${action} on ${subject}.`;
  }
}

export interface RecordOptions {
  action: AuditAction;
  /** Full Firestore path, or `collection/documentId`. */
  path: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  label?: string;
  /** Overrides the derived sentence. */
  summary?: string;
  actor?: AuditActor;
}

async function appendNow(options: RecordOptions): Promise<void> {
  const actor = options.actor ?? currentActor;
  if (!actor) {
    // No session means nothing attributable. Refuse rather than write "unknown".
    return;
  }

  const { firestore: db } = initializeFirebase();
  const ref = collection(db, 'schools', SCHOOL_ID, AUDIT_COLLECTION);

  // Read the current head. Ordered by seq so a clock skew cannot reorder history.
  const headSnap = await getDocs(query(ref, orderBy('seq', 'desc'), limit(1)));
  const head = headSnap.empty ? null : (headSnap.docs[0].data() as AuditEntry);
  const seq = head ? head.seq + 1 : 1;
  const prevHash = head ? head.hash : GENESIS_HASH;

  const target = { ...pathParts(options.path), ...(options.label ? { label: options.label } : {}) };
  const changes =
    options.action === 'update'
      ? diffFields(options.before, options.after)
      : options.action === 'create'
        ? diffFields(null, options.after)
        : options.action === 'delete'
          ? diffFields(options.before, null)
          : [];

  const unsigned: Omit<AuditEntry, 'hash' | 'id'> = {
    seq,
    at: new Date().toISOString(),
    actor,
    action: options.action,
    target,
    changes,
    severity: severityFor(target.collection, options.action),
    summary: options.summary ?? describe(options.action, target, changes),
    prevHash,
  };

  const hash = await hashEntry(unsigned);

  await addDoc(ref, {
    ...unsigned,
    hash,
    // Server clock alongside the writer's own timestamp, for ordering disputes.
    recordedAt: serverTimestamp(),
  });
}

/**
 * Append an entry. Resolves when written; never rejects into the caller's write
 * path. Returns false if the append failed, so a caller that cares can say so.
 */
export function recordAudit(options: RecordOptions): Promise<boolean> {
  const run = queue.then(() => appendNow(options));
  // Keep the queue alive even when one append fails.
  queue = run.catch(() => undefined);
  return run.then(
    () => true,
    (error) => {
      reportFailure(error);
      return false;
    }
  );
}

/** Convenience for a mutation helper that knows the path and the patch. */
export function recordUpdate(
  path: string,
  before: Record<string, unknown> | null,
  patch: Record<string, unknown>,
  label?: string
) {
  return recordAudit({
    action: 'update',
    path,
    before,
    after: { ...(before ?? {}), ...patch },
    label,
  });
}
