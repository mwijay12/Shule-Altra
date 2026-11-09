/**
 * @fileOverview Audit-trail regressions.
 *
 * The claim on the security page is that history cannot be quietly edited. These
 * tests attack it: change a fee after the fact, delete a row, reorder entries,
 * forge an actor. Each must be caught, and the report must name where.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

let failures = 0;
async function check(label: string, run: () => void | Promise<void>) {
  try {
    await run();
    console.log(`OK   ${label}`);
  } catch (error: any) {
    failures += 1;
    console.log(`FAIL ${label}: ${String(error?.message).slice(0, 700)}`);
  }
}

const read = (file: string) => readFileSync(path.resolve(file), 'utf8');

async function main() {
  const { hashEntry, verifyChain, digest } = await import('@/lib/audit/chain');
  const { diffFields, redactValue, severityFor, GENESIS_HASH } = await import('@/lib/audit/types');
  type AuditEntry = import('@/lib/audit/types').AuditEntry;

  const actor = { uid: 'uid-1', name: 'Amina Bursar', email: 'bursar@shule.pro', role: 'BURSAR' };

  /** Build a genuine, linked chain of n entries. */
  async function buildChain(n: number): Promise<AuditEntry[]> {
    const entries: AuditEntry[] = [];
    let prevHash = GENESIS_HASH;
    for (let seq = 1; seq <= n; seq += 1) {
      const unsigned = {
        seq,
        at: new Date(Date.UTC(2026, 10, 9, 8, seq)).toISOString(),
        actor,
        action: 'update' as const,
        target: { collection: 'students', documentId: `ALT-2026-00${seq}` },
        changes: [{ field: 'balance', before: 500_000, after: 250_000 }],
        severity: 'critical' as const,
        summary: `Changed balance on ALT-2026-00${seq}.`,
        prevHash,
      };
      const hash = await hashEntry(unsigned);
      entries.push({ ...unsigned, hash, id: `doc-${seq}` });
      prevHash = hash;
    }
    return entries;
  }

  console.log('\nCHAIN INTEGRITY');

  await check('a genuine chain verifies', async () => {
    const entries = await buildChain(6);
    const report = await verifyChain(entries);
    assert.equal(report.ok, true, JSON.stringify(report.failures));
    assert.equal(report.checked, 6);
    assert.equal(report.head, entries[5].hash);
  });

  await check('an empty log is valid and reports the genesis head', async () => {
    const report = await verifyChain([]);
    assert.equal(report.ok, true);
    assert.equal(report.checked, 0);
    assert.equal(report.head, GENESIS_HASH);
  });

  await check('editing a fee after the fact is caught at that entry', async () => {
    const entries = await buildChain(6);
    // The attack: quietly reduce what a learner owed.
    entries[2].changes[0].after = 1;
    const report = await verifyChain(entries);
    assert.equal(report.ok, false);
    assert.equal(report.failures[0].seq, 3);
    assert.equal(report.failures[0].reason, 'hash_mismatch');
  });

  await check('changing the actor is caught', async () => {
    const entries = await buildChain(4);
    entries[1].actor = { ...actor, uid: 'uid-999', name: 'Someone Else', role: 'ADMIN' };
    const report = await verifyChain(entries);
    assert.equal(report.ok, false);
    assert.ok(report.failures.some((f) => f.seq === 2 && f.reason === 'hash_mismatch'));
  });

  await check('backdating an entry is caught', async () => {
    const entries = await buildChain(4);
    entries[0].at = new Date(Date.UTC(2020, 0, 1)).toISOString();
    const report = await verifyChain(entries);
    assert.equal(report.ok, false);
    assert.ok(report.failures.some((f) => f.seq === 1));
  });

  await check('deleting a row breaks the link and the sequence', async () => {
    const entries = await buildChain(6);
    const tampered = entries.filter((_, i) => i !== 2);
    const report = await verifyChain(tampered);
    assert.equal(report.ok, false);
    assert.ok(report.failures.some((f) => f.reason === 'sequence_gap'), 'missing sequence not reported');
    assert.ok(report.failures.some((f) => f.reason === 'broken_link'), 'broken link not reported');
  });

  await check('reordering entries is caught', async () => {
    const entries = await buildChain(5);
    [entries[1], entries[2]] = [entries[2], entries[1]];
    const report = await verifyChain(entries);
    assert.equal(report.ok, false);
  });

  await check('recomputing one hash still fails the next link', async () => {
    // A sophisticated edit: fix the digest of the edited row too.
    const entries = await buildChain(5);
    entries[2].changes[0].after = 1;
    entries[2].hash = await hashEntry(entries[2]);
    const report = await verifyChain(entries);
    assert.equal(report.ok, false, 'a re-hashed edit must still break the following link');
    assert.ok(report.failures.some((f) => f.seq === 4 && f.reason === 'broken_link'));
  });

  await check('the digest is stable and 64 hex characters', async () => {
    const a = await digest('shule-altra');
    const b = await digest('shule-altra');
    assert.equal(a, b);
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.notEqual(a, await digest('shule-altrb'));
  });

  console.log('\nWHAT GETS RECORDED');

  await check('only genuinely changed fields are recorded', () => {
    const changes = diffFields(
      { name: 'Agnes', balance: 500_000, class: 'Form 4' },
      { name: 'Agnes', balance: 250_000, class: 'Form 4' }
    );
    assert.equal(changes.length, 1);
    assert.equal(changes[0].field, 'balance');
    assert.equal(changes[0].before, 500_000);
    assert.equal(changes[0].after, 250_000);
  });

  await check('bookkeeping fields are not logged as decisions', () => {
    const changes = diffFields(
      { updatedAt: 'yesterday', searchName: 'agnes', balance: 10 },
      { updatedAt: 'today', searchName: 'agnes', balance: 10 }
    );
    assert.deepEqual(changes, []);
  });

  await check('secrets, photographs and phone numbers are redacted', () => {
    for (const field of ['password', 'token', 'apiKey', 'photoUrl', 'guardianPhone', 'contact']) {
      assert.equal(redactValue(field, 'sensitive-value'), '[redacted]', `${field} leaked`);
    }
    const changes = diffFields({ guardianPhone: '+255700000000' }, { guardianPhone: '+255711111111' });
    assert.equal(changes[0].before, '[redacted]');
    assert.equal(changes[0].after, '[redacted]');
  });

  await check('a long blob is truncated rather than dumped into the log', () => {
    const value = 'x'.repeat(500);
    const shown = String(redactValue('notes', value));
    assert.ok(shown.length <= 181, `log entry too long: ${shown.length}`);
    assert.ok(shown.endsWith('…'));
  });

  await check('money, identity and deletions are marked critical', () => {
    assert.equal(severityFor('transactions', 'update'), 'critical');
    assert.equal(severityFor('students', 'update'), 'critical');
    assert.equal(severityFor('staff', 'update'), 'critical');
    assert.equal(severityFor('timetable', 'delete'), 'critical');
    assert.equal(severityFor('timetable', 'update'), 'info');
  });

  await check('a collection-wide action does not repeat the collection name', () => {
    const record = read('src/lib/audit/record.ts');
    assert.match(record, /documentId: tail\[1\] \?\? ''/, 'a missing document id must stay empty');
    const page = read('src/app/dashboard/audit/page.tsx');
    assert.match(page, /entry\.target\.documentId\s*\?/, 'the viewer must handle a collection-wide entry');
    assert.match(page, /report\.checked === 1 \? 'entry' : 'entries'/, 'singular/plural must agree');
  });

  console.log('\nENFORCEMENT');

  await check('the rules refuse update and delete for every role', () => {
    const rules = read('firestore.rules');
    const block = rules.slice(rules.indexOf('match /audit/{entryId}'));
    const body = block.slice(0, block.indexOf('\n      }'));
    assert.match(body, /allow update, delete: if false;/, 'history must not be editable');
    assert.match(body, /request\.resource\.data\.actor\.uid == request\.auth\.uid/, 'actor must be the caller');
    assert.match(body, /hash\.size\(\) == 64/);
    assert.match(body, /allow read: if inRole\(\['ADMIN', 'BURSAR', 'ACCOUNTANT'\]\)/);
  });

  await check('every mutation helper records, and bulk writes can opt out', () => {
    const helpers = read('src/firebase/non-blocking-updates.tsx');
    for (const fn of ['setDocumentNonBlocking', 'addDocumentNonBlocking', 'updateDocumentNonBlocking', 'deleteDocumentNonBlocking']) {
      assert.ok(helpers.includes(`export function ${fn}`), `${fn} missing`);
    }
    // Four record paths: set/add/update/delete.
    assert.ok((helpers.match(/void recordAudit\(/g) ?? []).length >= 4, 'a helper is not recording');
    assert.match(helpers, /audit\?: false/, 'bulk operations need an opt-out');
  });

  await check('the actor follows the session, including sign-out', () => {
    const auth = read('src/hooks/use-auth.ts');
    const emit = auth.slice(auth.indexOf('function emit('), auth.indexOf('function dropProfile('));
    assert.match(emit, /setAuditActor\(/, 'auth transitions must set the actor');
    assert.match(emit, /: null/, 'sign-out must clear the actor');
  });

  await check('an audit failure is surfaced, never swallowed', () => {
    const record = read('src/lib/audit/record.ts');
    assert.match(record, /onAuditFailure/, 'no way to observe a failed append');
    assert.match(record, /reportFailure\(error\)/);
    // The change itself must not be reversed by an audit problem.
    assert.match(record, /queue = run\.catch\(\(\) => undefined\)/);
  });

  await check('appends are serialised so the chain has one head', () => {
    const record = read('src/lib/audit/record.ts');
    assert.match(record, /let queue: Promise<unknown>/);
    assert.match(record, /queue\.then\(\(\) => appendNow/);
    assert.match(record, /orderBy\('seq', 'desc'\), limit\(1\)/);
  });

  await check('the trail is in the navigation and restricted to the money band', () => {
    const nav = read('src/components/admin/nav-config.ts');
    assert.match(nav, /\/dashboard\/audit/);
    const auth = read('src/hooks/use-auth.ts');
    assert.match(auth, /audit: \['ADMIN', 'ACCOUNTANT', 'BURSAR'\]/);
  });

  await check('the security page no longer claims the log is missing', () => {
    const page = read('src/app/legal/security/page.tsx').replace(/\s+/g, ' ');
    assert.ok(!/No tamper-evident audit log yet/.test(page), 'the published gap is now closed');
    assert.match(page, /append-only/i);
    assert.match(page, /hash/i);
  });

  console.log(
    failures === 0 ? '\nAUDIT TRAIL REGRESSIONS PASSED\n' : `\n${failures} AUDIT CHECK(S) FAILED\n`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('HARNESS FAILURE', error);
  process.exit(1);
});
