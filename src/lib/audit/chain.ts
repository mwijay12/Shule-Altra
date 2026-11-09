/**
 * @fileOverview The hash chain that makes the log tamper-evident.
 *
 * Every entry commits to the digest of the one before it. Editing a fee after
 * the fact changes that entry's digest, so the next entry's `prevHash` no longer
 * matches and verification names the exact row where the chain broke. Deleting
 * a row does the same. An attacker would have to rewrite every later entry, and
 * the security rules do not permit updating or deleting any of them.
 *
 * SHA-256 through Web Crypto, so the same code runs in the browser, in a route
 * handler and in the regression suite. No dependency, no server round-trip.
 */

import { GENESIS_HASH, type AuditEntry } from './types';

/** The fields the digest covers, in a fixed order. Anything else is decoration. */
function canonical(entry: Omit<AuditEntry, 'hash' | 'id'>): string {
  return JSON.stringify([
    entry.seq,
    entry.at,
    entry.actor.uid,
    entry.actor.role,
    entry.action,
    entry.target.collection,
    entry.target.documentId,
    entry.changes,
    entry.severity,
    entry.prevHash,
  ]);
}

export async function digest(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  // Node 20+ and every modern browser expose this on globalThis.
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('Web Crypto is unavailable; the audit chain cannot be computed.');
  const buffer = await subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashEntry(entry: Omit<AuditEntry, 'hash' | 'id'>): Promise<string> {
  return digest(canonical(entry));
}

export type ChainFailure = {
  /** Position where the chain stopped being trustworthy. */
  seq: number;
  id?: string;
  reason: 'hash_mismatch' | 'broken_link' | 'sequence_gap';
  detail: string;
};

export type ChainReport = {
  ok: boolean;
  checked: number;
  head: string;
  failures: ChainFailure[];
};

/**
 * Walk the log in order and prove every link. Entries must be supplied oldest
 * first — the caller orders by `seq` ascending.
 */
export async function verifyChain(entries: AuditEntry[]): Promise<ChainReport> {
  const failures: ChainFailure[] = [];
  let expectedPrev = GENESIS_HASH;
  let expectedSeq = entries.length > 0 ? entries[0].seq : 1;
  let head = GENESIS_HASH;

  for (const entry of entries) {
    if (entry.seq !== expectedSeq) {
      failures.push({
        seq: entry.seq,
        id: entry.id,
        reason: 'sequence_gap',
        detail: `Expected entry ${expectedSeq}, found ${entry.seq}. An entry may have been removed.`,
      });
    }

    if (entry.prevHash !== expectedPrev) {
      failures.push({
        seq: entry.seq,
        id: entry.id,
        reason: 'broken_link',
        detail: 'This entry does not follow the one before it.',
      });
    }

    const computed = await hashEntry(entry);
    if (computed !== entry.hash) {
      failures.push({
        seq: entry.seq,
        id: entry.id,
        reason: 'hash_mismatch',
        detail: 'The contents no longer match the digest recorded at the time.',
      });
    }

    expectedPrev = entry.hash;
    expectedSeq = entry.seq + 1;
    head = entry.hash;
  }

  return { ok: failures.length === 0, checked: entries.length, head, failures };
}
