'use client';

/**
 * @fileOverview The mutation helpers every module writes through.
 *
 * These are still non-blocking: the UI does not wait on Firestore. What changed
 * is that a successful write now appends an audit entry naming the actor, the
 * role, the fields before and after, and the time. Because every module already
 * came through here, the log covers the whole system rather than the few screens
 * someone remembered to instrument.
 *
 * The audit append never blocks or reverses the change. If it fails, the failure
 * is surfaced (see onAuditFailure) instead of being swallowed, a silent gap in
 * an audit log is worse than a visible one.
 */

import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { recordAudit } from '@/lib/audit/record';

/**
 * Bulk operations (marking a whole register present) pass this to avoid one
 * entry per learner, then record a single summary themselves.
 */
export type WriteOptions = { audit?: false | { label?: string } };

function auditEnabled(options?: WriteOptions) {
  return options?.audit !== false;
}

function labelFor(options?: WriteOptions) {
  return typeof options?.audit === 'object' ? options.audit.label : undefined;
}

/** Reads the prior state so the log can show what a field used to be. */
async function readBefore(docRef: DocumentReference): Promise<Record<string, any> | null> {
  try {
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as Record<string, any>) : null;
  } catch {
    // A denied read must not stop the write, nor invent a "before".
    return null;
  }
}

export function setDocumentNonBlocking(
  docRef: DocumentReference,
  data: any,
  options: SetOptions,
  writeOptions?: WriteOptions
) {
  const before = auditEnabled(writeOptions) ? readBefore(docRef) : Promise.resolve(null);

  before.then((prior) => {
    setDoc(docRef, data, options)
      .then(() => {
        if (!auditEnabled(writeOptions)) return;
        const merged = (options as any)?.merge;
        void recordAudit({
          action: prior ? 'update' : 'create',
          path: docRef.path,
          before: prior,
          after: merged ? { ...(prior ?? {}), ...data } : data,
          label: labelFor(writeOptions),
        });
      })
      .catch((error) => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: docRef.path,
            operation: 'write',
            requestResourceData: data,
          })
        );
      });
  });
}

export function addDocumentNonBlocking(
  colRef: CollectionReference,
  data: any,
  writeOptions?: WriteOptions
) {
  const promise = addDoc(colRef, data)
    .then((created) => {
      if (auditEnabled(writeOptions)) {
        void recordAudit({
          action: 'create',
          path: created.path,
          after: data,
          label: labelFor(writeOptions) ?? (data?.name || data?.studentName || undefined),
        });
      }
      return created;
    })
    .catch((error) => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: data,
        })
      );
      return undefined;
    });
  return promise;
}

export function updateDocumentNonBlocking(
  docRef: DocumentReference,
  data: any,
  writeOptions?: WriteOptions
) {
  const before = auditEnabled(writeOptions) ? readBefore(docRef) : Promise.resolve(null);

  before.then((prior) => {
    updateDoc(docRef, data)
      .then(() => {
        if (!auditEnabled(writeOptions)) return;
        void recordAudit({
          action: 'update',
          path: docRef.path,
          before: prior,
          after: { ...(prior ?? {}), ...data },
          label: labelFor(writeOptions) ?? (prior?.name || undefined),
        });
      })
      .catch((error) => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: data,
          })
        );
      });
  });
}

export function deleteDocumentNonBlocking(docRef: DocumentReference, writeOptions?: WriteOptions) {
  const before = auditEnabled(writeOptions) ? readBefore(docRef) : Promise.resolve(null);

  before.then((prior) => {
    deleteDoc(docRef)
      .then(() => {
        if (!auditEnabled(writeOptions)) return;
        void recordAudit({
          action: 'delete',
          path: docRef.path,
          before: prior,
          label: labelFor(writeOptions) ?? (prior?.name || undefined),
        });
      })
      .catch((error) => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
          })
        );
      });
  });
}
