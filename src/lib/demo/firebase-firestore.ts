/**
 * @fileOverview Firestore-compatible facade over the offline demo datastore.
 *
 * This module is aliased in `next.config.ts` in place of `firebase/firestore`
 * when demo mode is enabled. It implements the subset of the Firestore Web SDK
 * that Shule Altra uses, so every page, hook and helper keeps working
 * unchanged, but all reads/writes stay inside the browser.
 */

import {
  generateId,
  normalizePath,
  patchDocument,
  readCollection,
  readDocument,
  removeDocument,
  subscribe,
  writeDocument,
} from './store';
import {
  DemoTimestamp,
  arrayRemove,
  arrayUnion,
  deleteField,
  increment,
  serverTimestamp,
} from './timestamp';

/* -------------------------------------------------------------------------- */
/*  Reference + query objects                                                  */
/* -------------------------------------------------------------------------- */

type Constraint =
  | { type: 'where'; field: string; op: string; value: any }
  | { type: 'orderBy'; field: string; direction: 'asc' | 'desc' }
  | { type: 'limit'; value: number }
  | { type: 'startAfter'; snapshot: any }
  | { type: 'startAt'; snapshot: any };

export class DemoCollectionReference {
  readonly type = 'collection';
  constructor(public path: string) {}
  get id(): string {
    const parts = this.path.split('/');
    return parts[parts.length - 1];
  }
  get parent(): DemoDocumentReference | null {
    const parts = this.path.split('/');
    if (parts.length < 2) return null;
    return new DemoDocumentReference(parts.slice(0, -1).join('/'));
  }
  withConverter(): DemoCollectionReference {
    return this;
  }
}

export class DemoDocumentReference {
  readonly type = 'document';
  constructor(public path: string) {}
  get id(): string {
    const parts = this.path.split('/');
    return parts[parts.length - 1];
  }
  get parent(): DemoCollectionReference {
    const parts = this.path.split('/');
    return new DemoCollectionReference(parts.slice(0, -1).join('/'));
  }
  withConverter(): DemoDocumentReference {
    return this;
  }
}

export class DemoQuery {
  readonly type = 'query';
  constructor(public collectionRef: DemoCollectionReference, public constraints: Constraint[]) {}
  get path(): string {
    return this.collectionRef.path;
  }
  get ref(): DemoCollectionReference {
    return this.collectionRef;
  }
  withConverter(): DemoTarget {
    return this;
  }
}

type DemoTarget = DemoCollectionReference | DemoDocumentReference | DemoQuery;

/* -------------------------------------------------------------------------- */
/*  Database handle                                                           */
/* -------------------------------------------------------------------------- */

const demoDatabase = {
  __demo: true,
  type: 'firestore',
  app: { name: '[DEMO]' },
  toJSON() {
    return { __demo: true };
  },
};

export function getFirestore(_app?: any, _databaseId?: any): any {
  return demoDatabase;
}

export function initializeFirestore(_app?: any, _settings?: any): any {
  return demoDatabase;
}

/* -------------------------------------------------------------------------- */
/*  Reference factories                                                        */
/* -------------------------------------------------------------------------- */

function isDatabase(value: any): boolean {
  return value === demoDatabase;
}

export function collection(first: any, ...segments: any[]): DemoCollectionReference {
  if (first instanceof DemoCollectionReference) return first;
  if (first instanceof DemoDocumentReference) return new DemoCollectionReference(first.path);
  const pathSegments = segments.map((segment) => String(segment));
  return new DemoCollectionReference(normalizePath(pathSegments.join('/')));
}

export function doc(first: any, ...segments: any[]): DemoDocumentReference {
  if (first instanceof DemoDocumentReference) return first;
  if (first instanceof DemoCollectionReference) {
    const id = segments.length > 0 ? String(segments[0]) : generateId();
    return new DemoDocumentReference(normalizePath(`${first.path}/${id}`));
  }
  return new DemoDocumentReference(normalizePath(segments.map((segment) => String(segment)).join('/')));
}

export function query(target: DemoCollectionReference | DemoQuery, ...constraints: Constraint[]): DemoQuery {
  const base = target instanceof DemoQuery ? target.collectionRef : target;
  const existing = target instanceof DemoQuery ? target.constraints : [];
  return new DemoQuery(base, [...existing, ...constraints]);
}

export function where(field: string, op: string, value: any): Constraint {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): Constraint {
  return { type: 'orderBy', field, direction };
}

export function limit(value: number): Constraint {
  return { type: 'limit', value };
}

export function limitToLast(value: number): Constraint {
  return { type: 'limit', value };
}

export function startAfter(snapshot: any): Constraint {
  return { type: 'startAfter', snapshot };
}

export function startAt(snapshot: any): Constraint {
  return { type: 'startAt', snapshot };
}

export function endBefore(): Constraint {
  return { type: 'limit', value: Number.MAX_SAFE_INTEGER };
}

export function endAt(): Constraint {
  return { type: 'limit', value: Number.MAX_SAFE_INTEGER };
}

/* -------------------------------------------------------------------------- */
/*  Snapshots                                                                  */
/* -------------------------------------------------------------------------- */

export class DemoDocumentSnapshot {
  constructor(public ref: DemoDocumentReference, private readonly value: Record<string, any> | undefined) {}
  get id(): string {
    return this.ref.id;
  }
  exists(): boolean {
    return this.value !== undefined;
  }
  data(): Record<string, any> | undefined {
    return this.value ? { ...this.value } : undefined;
  }
  get(field: string): any {
    return this.value ? this.value[field] : undefined;
  }
}

export class DemoQueryDocumentSnapshot extends DemoDocumentSnapshot {}

export class DemoQuerySnapshot {
  constructor(public docs: DemoQueryDocumentSnapshot[], public ref: DemoCollectionReference) {}
  get size(): number {
    return this.docs.length;
  }
  get empty(): boolean {
    return this.docs.length === 0;
  }
  forEach(callback: (snapshot: DemoQueryDocumentSnapshot) => void): void {
    this.docs.forEach(callback);
  }
  docChanges(): Array<{ type: 'added'; doc: DemoQueryDocumentSnapshot }> {
    return this.docs.map((docSnapshot) => ({ type: 'added' as const, doc: docSnapshot }));
  }
}

/* -------------------------------------------------------------------------- */
/*  Query evaluation                                                           */
/* -------------------------------------------------------------------------- */

function toComparable(value: any): any {
  if (value === undefined || value === null) return null;
  if (value instanceof DemoTimestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return value;
}

function valuesEqual(left: any, right: any): boolean {
  const a = toComparable(left);
  const b = toComparable(right);
  if (a === b) return true;
  if (typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

function compareValues(left: any, right: any): number {
  const a = toComparable(left);
  const b = toComparable(right);
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' || typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), 'en');
}

function matchesConstraint(data: Record<string, any>, constraint: Constraint): boolean {
  if (constraint.type !== 'where') return true;
  const { field, op, value } = constraint;
  const fieldValue = field.split('.').reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), data);

  switch (op) {
    case '==':
      return valuesEqual(fieldValue, value);
    case '!=':
      return !valuesEqual(fieldValue, value);
    case '>':
      return compareValues(fieldValue, value) > 0;
    case '>=':
      return compareValues(fieldValue, value) >= 0;
    case '<':
      return compareValues(fieldValue, value) < 0;
    case '<=':
      return compareValues(fieldValue, value) <= 0;
    case 'in':
      return Array.isArray(value) && value.some((candidate) => valuesEqual(fieldValue, candidate));
    case 'not-in':
      return Array.isArray(value) && !value.some((candidate) => valuesEqual(fieldValue, candidate));
    case 'array-contains':
      return Array.isArray(fieldValue) && fieldValue.some((item) => valuesEqual(item, value));
    case 'array-contains-any':
      return (
        Array.isArray(fieldValue) &&
        Array.isArray(value) &&
        fieldValue.some((item) => value.some((candidate) => valuesEqual(item, candidate)))
      );
    default:
      return true;
  }
}

function evaluate(target: DemoCollectionReference | DemoQuery): DemoQuerySnapshot {
  const collectionRef = target instanceof DemoQuery ? target.collectionRef : target;
  const constraints = target instanceof DemoQuery ? target.constraints : [];

  let rows = readCollection(collectionRef.path).map(
    (row) => new DemoQueryDocumentSnapshot(new DemoDocumentReference(row.path), row.data)
  );

  constraints.forEach((constraint) => {
    if (constraint.type === 'where') {
      rows = rows.filter((row) => matchesConstraint(row.data() || {}, constraint));
    }
  });

  const orderings = constraints.filter((constraint): constraint is Extract<Constraint, { type: 'orderBy' }> => constraint.type === 'orderBy');
  if (orderings.length > 0) {
    rows.sort((left, right) => {
      for (const ordering of orderings) {
        const leftValue = left.get(ordering.field);
        const rightValue = right.get(ordering.field);
        const result = compareValues(leftValue, rightValue);
        if (result !== 0) return ordering.direction === 'desc' ? -result : result;
      }
      return 0;
    });
  }

  constraints.forEach((constraint) => {
    if (constraint.type === 'limit') {
      rows = rows.slice(0, constraint.value);
    }
    if (constraint.type === 'startAfter') {
      const snapshot = constraint.snapshot;
      const index = rows.findIndex((row) => row.id === snapshot?.id);
      if (index >= 0) rows = rows.slice(index + 1);
    }
  });

  return new DemoQuerySnapshot(rows, collectionRef);
}

export function buildSnapshot(target: DemoTarget): DemoDocumentSnapshot | DemoQuerySnapshot {
  if (target instanceof DemoDocumentReference) {
    return new DemoDocumentSnapshot(target, readDocument(target.path));
  }
  return evaluate(target);
}

/* -------------------------------------------------------------------------- */
/*  Reads                                                                      */
/* -------------------------------------------------------------------------- */

export async function getDocs(target: DemoCollectionReference | DemoQuery): Promise<DemoQuerySnapshot> {
  return evaluate(target);
}

export async function getDoc(reference: DemoDocumentReference): Promise<DemoDocumentSnapshot> {
  return new DemoDocumentSnapshot(reference, readDocument(reference.path));
}

export function getDocFromCache(reference: DemoDocumentReference): Promise<DemoDocumentSnapshot> {
  return getDoc(reference);
}

export function getDocsFromCache(target: DemoCollectionReference | DemoQuery): Promise<DemoQuerySnapshot> {
  return getDocs(target);
}

/* -------------------------------------------------------------------------- */
/*  Writes                                                                     */
/* -------------------------------------------------------------------------- */

export async function setDoc(reference: DemoDocumentReference, data: Record<string, any>, options?: { merge?: boolean }): Promise<void> {
  writeDocument(reference.path, data, options?.merge === true);
}

export async function updateDoc(reference: DemoDocumentReference, data: Record<string, any>): Promise<void> {
  patchDocument(reference.path, data);
}

export async function addDoc(collectionRef: DemoCollectionReference, data: Record<string, any>): Promise<DemoDocumentReference> {
  const reference = new DemoDocumentReference(`${collectionRef.path}/${generateId()}`);
  writeDocument(reference.path, data, false);
  return reference;
}

export async function deleteDoc(reference: DemoDocumentReference): Promise<void> {
  removeDocument(reference.path);
}

export class DemoWriteBatch {
  private operations: Array<() => void> = [];

  set(reference: DemoDocumentReference, data: Record<string, any>, options?: { merge?: boolean }): DemoWriteBatch {
    this.operations.push(() => writeDocument(reference.path, data, options?.merge === true));
    return this;
  }

  update(reference: DemoDocumentReference, data: Record<string, any>): DemoWriteBatch {
    this.operations.push(() => patchDocument(reference.path, data));
    return this;
  }

  delete(reference: DemoDocumentReference): DemoWriteBatch {
    this.operations.push(() => removeDocument(reference.path));
    return this;
  }

  async commit(): Promise<void> {
    this.operations.forEach((operation) => operation());
    this.operations = [];
  }
}

export function writeBatch(_db?: any): DemoWriteBatch {
  return new DemoWriteBatch();
}

export class DemoTransaction {
  private operations: Array<() => void> = [];

  async get(reference: DemoDocumentReference): Promise<DemoDocumentSnapshot> {
    return new DemoDocumentSnapshot(reference, readDocument(reference.path));
  }

  set(reference: DemoDocumentReference, data: Record<string, any>, options?: { merge?: boolean }): DemoTransaction {
    this.operations.push(() => writeDocument(reference.path, data, options?.merge === true));
    return this;
  }

  update(reference: DemoDocumentReference, data: Record<string, any>): DemoTransaction {
    this.operations.push(() => patchDocument(reference.path, data));
    return this;
  }

  delete(reference: DemoDocumentReference): DemoTransaction {
    this.operations.push(() => removeDocument(reference.path));
    return this;
  }

  commit(): void {
    this.operations.forEach((operation) => operation());
    this.operations = [];
  }
}

export async function runTransaction<T>(_db: any, updateFunction: (transaction: DemoTransaction) => Promise<T>): Promise<T> {
  const transaction = new DemoTransaction();
  const result = await updateFunction(transaction);
  transaction.commit();
  return result;
}

/* -------------------------------------------------------------------------- */
/*  Real-time listeners                                                        */
/* -------------------------------------------------------------------------- */

export function onSnapshot(
  target: DemoTarget,
  onNext: (snapshot: any) => void,
  onError?: (error: Error) => void
): () => void {
  let lastSignature = '';

  const emit = () => {
    try {
      const snapshot = buildSnapshot(target);
      const signature = JSON.stringify(
        snapshot instanceof DemoQuerySnapshot
          ? snapshot.docs.map((row) => [row.id, row.data()])
          : [snapshot.id, snapshot.data()]
      );
      if (signature === lastSignature) return;
      lastSignature = signature;
      onNext(snapshot);
    } catch (error) {
      if (onError) onError(error as Error);
      else console.error('[DEMO] snapshot error', error);
    }
  };

  const unsubscribe = subscribe(emit);
  setTimeout(emit, 0);

  return () => unsubscribe();
}

/* -------------------------------------------------------------------------- */
/*  Compatibility exports                                                      */
/* -------------------------------------------------------------------------- */

export { DemoTimestamp as Timestamp, serverTimestamp, increment, arrayUnion, arrayRemove, deleteField };

export const FieldValue = {
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  deleteField,
};

/* Placeholder values so accidental value-imports of type-only names never
   crash at runtime (the real typings still drive TypeScript). */
export const DocumentData: any = undefined;
export const Query: any = undefined;
export const CollectionReference: any = undefined;
export const DocumentReference: any = undefined;
export const QuerySnapshot: any = undefined;
export const QueryDocumentSnapshot: any = undefined;
export const DocumentSnapshot: any = undefined;
export const FirestoreError: any = undefined;
export const Firestore: any = undefined;
export const SetOptions: any = undefined;
export const SnapshotOptions: any = undefined;
export const Unsubscribe: any = undefined;
