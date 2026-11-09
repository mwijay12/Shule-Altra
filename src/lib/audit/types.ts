/**
 * @fileOverview What an audit entry is.
 *
 * The question a school asks is "who changed this fee, and what was it before?".
 * An entry answers exactly that: actor, role, action, the record touched, the
 * fields before and after, and when.
 *
 * Entries are hash-chained. Each one commits to the digest of the entry before
 * it, so removing or editing a row breaks the chain from that point onward and
 * verification says where. That is what makes the log append-only in substance
 * and not only in the security rules.
 */

export const AUDIT_COLLECTION = 'audit'

/** The kinds of change worth recording. */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'sign_in'
  | 'sign_out'
  | 'export'
  | 'send'
  | 'publish';

export type AuditSeverity = 'info' | 'notice' | 'critical';

/** Money and identity changes deserve more attention than a timetable edit. */
export const CRITICAL_COLLECTIONS = new Set([
  'transactions',
  'students',
  'staff',
  'petty_cash',
  'config',
]);

export interface AuditEntry {
  /** Firestore document id. */
  id?: string;
  /** Position in the chain, starting at 1. */
  seq: number;
  /** ISO timestamp from the writer. */
  at: string;
  actor: {
    uid: string;
    name: string;
    email: string;
    role: string;
  };
  action: AuditAction;
  /** Collection and document the change touched, e.g. students/ALT-2026-001. */
  target: {
    collection: string;
    documentId: string;
    label?: string;
  };
  /** Only the fields that actually changed. Never a whole record dump. */
  changes: Array<{
    field: string;
    before: unknown;
    after: unknown;
  }>;
  severity: AuditSeverity;
  /** Human sentence, written at record time so the log reads without code. */
  summary: string;
  /** Digest of the previous entry, or GENESIS for the first. */
  prevHash: string;
  /** SHA-256 over this entry's canonical form, including prevHash. */
  hash: string;
}

export const GENESIS_HASH = 'GENESIS';

/** Fields whose values must never be written into a log. */
const REDACTED = new Set([
  'password',
  'secret',
  'token',
  'idToken',
  'apiKey',
  'photoUrl',
  'photo',
  'guardianPhone',
  'contact',
]);

export function redactValue(field: string, value: unknown): unknown {
  if (REDACTED.has(field)) return '[redacted]';
  if (value === undefined) return null;
  // Keep the log readable and bounded: a long blob is not an audit fact.
  if (typeof value === 'string' && value.length > 180) return `${value.slice(0, 177)}…`;
  if (Array.isArray(value)) return `[${value.length} item${value.length === 1 ? '' : 's'}]`;
  if (value && typeof value === 'object') {
    // Firestore Timestamp
    const maybe = value as { toDate?: () => Date; seconds?: number };
    if (typeof maybe.toDate === 'function') return maybe.toDate().toISOString();
    if (typeof maybe.seconds === 'number') return new Date(maybe.seconds * 1000).toISOString();
    return '[object]';
  }
  return value;
}

/** Only the fields that genuinely differ, with sensitive values redacted. */
export function diffFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): AuditEntry['changes'] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changes: AuditEntry['changes'] = [];
  for (const field of [...keys].sort()) {
    // Bookkeeping, not a decision anybody made.
    if (field === 'updatedAt' || field === 'createdAt' || field === 'searchName') continue;
    const oldVal = before?.[field];
    const newVal = after?.[field];
    if (JSON.stringify(oldVal ?? null) === JSON.stringify(newVal ?? null)) continue;
    changes.push({
      field,
      before: redactValue(field, oldVal),
      after: redactValue(field, newVal),
    });
  }
  return changes;
}

export function severityFor(collection: string, action: AuditAction): AuditSeverity {
  if (action === 'delete') return 'critical';
  if (CRITICAL_COLLECTIONS.has(collection)) return action === 'create' ? 'notice' : 'critical';
  return 'info';
}
