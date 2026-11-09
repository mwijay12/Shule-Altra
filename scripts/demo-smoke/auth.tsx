import './dom';

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { doc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut as rawSignOut } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';

const { auth, firestore: db } = initializeFirebase();

let failures = 0;
async function check(label: string, run: () => void | Promise<void>) {
  try {
    await run();
    console.log(`OK   ${label}`);
  } catch (error: any) {
    failures += 1;
    console.log(`FAIL ${label}: ${String(error?.message).slice(0, 300)}`);
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 40));

/** Records what each consumer of the shared store actually sees. */
const seen: Array<{ id: string; role: string | null; email: string | null; loading: boolean }> = [];

function Probe({ id }: { id: string }) {
  const { role, user, loading } = useAuth();
  React.useEffect(() => {
    seen.push({ id, role, email: user?.email ?? null, loading });
  }, [id, role, user?.email, loading]);
  return React.createElement('span', null, `${id}:${role ?? 'none'}`);
}

function latestFor(id: string) {
  return [...seen].reverse().find((entry) => entry.id === id);
}

async function main() {
  console.log('\nSESSION LIFECYCLE');

  const containerA = document.createElement('div');
  const containerB = document.createElement('div');
  document.body.appendChild(containerA);
  document.body.appendChild(containerB);
  let rootA: Root = createRoot(containerA);
  let rootB: Root = createRoot(containerB);

  await check('two consumers agree on the signed-out state', async () => {
    await act(async () => {
      rootA.render(React.createElement(Probe, { id: 'A' }));
      rootB.render(React.createElement(Probe, { id: 'B' }));
      await settle();
    });
    assert.equal(latestFor('A')?.role, null);
    assert.equal(latestFor('B')?.role, null);
  });

  await check('a staff record drives the role for every consumer', async () => {
    // The demo shim derives a uid from the address.
    const email = 'neema.staff@shule.pro';
    const uid = `demo-${email.split('@')[0].replace(/[^a-z0-9]/g, '')}`;
    await setDoc(doc(db, 'schools', 'school-001', 'staff', uid), {
      fullName: 'Mwl. Neema Kessy',
      role: 'TEACHER',
    });
    await act(async () => {
      await signInWithEmailAndPassword(auth, email, 'demo2026');
      await settle();
    });
    assert.equal(latestFor('A')?.role, 'TEACHER');
    assert.equal(latestFor('B')?.role, 'TEACHER');
    assert.equal(latestFor('A')?.email, email);
  });

  await check('a role change reaches every consumer live', async () => {
    const email = 'neema.staff@shule.pro';
    const uid = `demo-${email.split('@')[0].replace(/[^a-z0-9]/g, '')}`;
    await act(async () => {
      await setDoc(doc(db, 'schools', 'school-001', 'staff', uid), { role: 'BURSAR' }, { merge: true });
      await settle();
    });
    assert.equal(latestFor('A')?.role, 'BURSAR');
    assert.equal(latestFor('B')?.role, 'BURSAR');
  });

  await check('an unknown staff record falls back to VIEWER, not ADMIN', async () => {
    await act(async () => {
      await signInWithEmailAndPassword(auth, 'stranger@elsewhere.com', 'demo2026');
      await settle();
    });
    assert.equal(latestFor('A')?.role, 'VIEWER');
  });

  await check('an unrecognised role string cannot escalate', async () => {
    const email = 'odd.role@shule.pro';
    const uid = `demo-${email.split('@')[0].replace(/[^a-z0-9]/g, '')}`;
    await setDoc(doc(db, 'schools', 'school-001', 'staff', uid), { role: 'ROOT' });
    await act(async () => {
      await signInWithEmailAndPassword(auth, email, 'demo2026');
      await settle();
    });
    assert.equal(latestFor('A')?.role, 'VIEWER');
  });

  // The regression this suite exists for: the old hook left the staff listener
  // subscribed after sign-out, so a later snapshot resurrected the session.
  await check('a staff snapshot after sign-out cannot resurrect the session', async () => {
    const email = 'ghost@shule.pro';
    const uid = `demo-${email.split('@')[0].replace(/[^a-z0-9]/g, '')}`;
    await setDoc(doc(db, 'schools', 'school-001', 'staff', uid), { role: 'ADMIN', fullName: 'Ghost' });
    await act(async () => {
      await signInWithEmailAndPassword(auth, email, 'demo2026');
      await settle();
    });
    assert.equal(latestFor('A')?.role, 'ADMIN', 'should be signed in first');

    await act(async () => {
      await rawSignOut(auth);
      await settle();
    });
    assert.equal(latestFor('A')?.role, null, 'sign-out clears the role');
    assert.equal(latestFor('A')?.email, null, 'sign-out clears the user');

    const beforeA = seen.length;
    await act(async () => {
      await setDoc(doc(db, 'schools', 'school-001', 'staff', uid), { role: 'SUPER_ADMIN' }, { merge: true });
      await settle();
    });
    const after = seen.slice(beforeA).filter((entry) => entry.role !== null || entry.email !== null);
    assert.deepEqual(after, [], `stale snapshot repopulated the session: ${JSON.stringify(after)}`);
    assert.equal(latestFor('A')?.role, null);
    assert.equal(latestFor('B')?.role, null);
  });

  await check('switching users drops the previous profile subscription', async () => {
    const first = 'first.switch@shule.pro';
    const second = 'second.switch@shule.pro';
    const uidOf = (email: string) => `demo-${email.split('@')[0].replace(/[^a-z0-9]/g, '')}`;
    await setDoc(doc(db, 'schools', 'school-001', 'staff', uidOf(first)), { role: 'TEACHER' });
    await setDoc(doc(db, 'schools', 'school-001', 'staff', uidOf(second)), { role: 'BURSAR' });

    await act(async () => {
      await signInWithEmailAndPassword(auth, first, 'demo2026');
      await settle();
    });
    assert.equal(latestFor('A')?.role, 'TEACHER');

    await act(async () => {
      await signInWithEmailAndPassword(auth, second, 'demo2026');
      await settle();
    });
    assert.equal(latestFor('A')?.role, 'BURSAR');

    // Editing the FIRST user's record must not change what the second one sees.
    await act(async () => {
      await setDoc(doc(db, 'schools', 'school-001', 'staff', uidOf(first)), { role: 'ADMIN' }, { merge: true });
      await settle();
    });
    assert.equal(latestFor('A')?.role, 'BURSAR', 'the old user listener is still writing');
    assert.equal(latestFor('A')?.email, second);
  });

  await check('the verified owner becomes SUPER_ADMIN and passes every gate', async () => {
    await act(async () => {
      await signInWithEmailAndPassword(auth, 'davidbyanmwijage@gmail.com', 'demo2026');
      await settle();
    });
    assert.equal(latestFor('A')?.role, 'SUPER_ADMIN');
  });

  await act(async () => {
    rootA.unmount();
    rootB.unmount();
    await settle();
  });

  console.log('\nACCESS MATRIX');

  await check('the matrix is enforced by role, and super admin passes all', () => {
    const source = readFileSync(path.resolve('src/hooks/use-auth.ts'), 'utf8');
    assert.match(source, /if \(state\.role === 'SUPER_ADMIN'\) return true;/);
    assert.match(source, /themeStudio: \['ADMIN'\]/);
    assert.match(source, /staff: \['ADMIN'\]/);
    // A module with no entry is open to any signed-in staff member; assert the
    // sensitive ones are all listed so nothing sensitive slips through by omission.
    for (const module of ['finance', 'students', 'settings', 'staff', 'themeStudio', 'academics']) {
      assert.ok(new RegExp(`${module}: \\[`).test(source), `${module} missing from the matrix`);
    }
  });

  await check('the demo bypass is compiled out against a real project', () => {
    const source = readFileSync(path.resolve('src/hooks/use-auth.ts'), 'utf8');
    assert.match(
      source,
      /if \(DEMO_MODE && \(user\.email === 'admin@shule\.pro' \|\| user\.isAnonymous\)\)/,
      'anonymous/admin bypass must be gated on DEMO_MODE'
    );
  });

  await check('one auth subscription is shared, not one per consumer', () => {
    const source = readFileSync(path.resolve('src/hooks/use-auth.ts'), 'utf8');
    assert.match(source, /useSyncExternalStore\(subscribe, getSnapshot, getSnapshot\)/);
    assert.match(source, /if \(refCount === 1\) start\(\);/);
    // Every auth transition tears the old profile listener down before branching.
    const body = source.slice(source.indexOf('function start()'), source.indexOf('function subscribe('));
    const dropIndex = body.indexOf('dropProfile();');
    const branchIndex = body.indexOf('if (!user)');
    assert.ok(dropIndex > -1 && dropIndex < branchIndex, 'dropProfile must run before any branch');
  });

  console.log('\nDOCUMENT SESSION GATE');

  const { resolveServerRole, SessionVerificationError } = await import('@/lib/auth/verify-session');
  const realFetch = globalThis.fetch;

  /** Script the two Google endpoints the verifier talks to. */
  function stubGoogle(options: {
    lookupStatus?: number;
    account?: any;
    staffStatus?: number;
    staffRole?: string;
  }) {
    const calls: string[] = [];
    (globalThis as any).fetch = async (url: string) => {
      const target = String(url);
      calls.push(target);
      const json = (status: number, body: any) => ({
        status,
        ok: status >= 200 && status < 300,
        json: async () => body,
      });
      if (target.includes('identitytoolkit')) {
        return json(options.lookupStatus ?? 200, { users: options.account ? [options.account] : [] });
      }
      if (target.includes('firestore')) {
        return json(options.staffStatus ?? 200, { fields: { role: { stringValue: options.staffRole } } });
      }
      throw new Error(`unexpected fetch: ${target}`);
    };
    return calls;
  }

  const account = { localId: 'uid-1', email: 'teacher@school.ac.tz', emailVerified: true };

  await check('an empty token is refused', async () => {
    await assert.rejects(() => resolveServerRole(''), (e: any) => e instanceof SessionVerificationError && e.status === 400);
  });

  await check('a token Google rejects cannot open the gate', async () => {
    stubGoogle({ lookupStatus: 400 });
    await assert.rejects(() => resolveServerRole('forged'), (e: any) => e.status === 401);
    globalThis.fetch = realFetch;
  });

  await check('a verified owner resolves to ADMIN without a staff record', async () => {
    const calls = stubGoogle({ account: { localId: 'owner', email: 'davidbyanmwijage@gmail.com', emailVerified: true } });
    assert.equal((await resolveServerRole('t')).role, 'ADMIN');
    assert.ok(!calls.some((c) => c.includes('firestore')), 'owner should not need a staff lookup');
    globalThis.fetch = realFetch;
  });

  await check('an UNVERIFIED owner address does not grant admin', async () => {
    stubGoogle({ account: { localId: 'x', email: 'davidbyanmwijage@gmail.com', emailVerified: false }, staffStatus: 404 });
    assert.equal((await resolveServerRole('t')).role, 'VIEWER');
    globalThis.fetch = realFetch;
  });

  await check('the staff record decides an ordinary role', async () => {
    stubGoogle({ account, staffRole: 'TEACHER' });
    assert.equal((await resolveServerRole('t')).role, 'TEACHER');
    globalThis.fetch = realFetch;
  });

  await check('a missing staff record is VIEWER, never ADMIN', async () => {
    stubGoogle({ account, staffStatus: 404 });
    assert.equal((await resolveServerRole('t')).role, 'VIEWER');
    globalThis.fetch = realFetch;
  });

  await check('an unknown role string cannot escalate', async () => {
    stubGoogle({ account, staffRole: 'ROOT' });
    assert.equal((await resolveServerRole('t')).role, 'VIEWER');
    globalThis.fetch = realFetch;
  });

  await check('a SUPER_ADMIN staff record maps to the ADMIN document role', async () => {
    stubGoogle({ account, staffRole: 'SUPER_ADMIN' });
    assert.equal((await resolveServerRole('t')).role, 'ADMIN');
    globalThis.fetch = realFetch;
  });

  await check('a denied or failed staff lookup fails closed', async () => {
    stubGoogle({ account, staffStatus: 403 });
    await assert.rejects(() => resolveServerRole('t'), (e: any) => e.status === 403);
    stubGoogle({ account, staffStatus: 500 });
    await assert.rejects(() => resolveServerRole('t'), (e: any) => e.status === 503);
    globalThis.fetch = realFetch;
  });

  await check('the staff lookup carries the caller token so rules still apply', async () => {
    let authHeader = '';
    (globalThis as any).fetch = async (url: string, init: any) => {
      const target = String(url);
      const json = (body: any) => ({ status: 200, ok: true, json: async () => body });
      if (target.includes('identitytoolkit')) return json({ users: [account] });
      authHeader = init?.headers?.authorization ?? '';
      return json({ fields: { role: { stringValue: 'BURSAR' } } });
    };
    await resolveServerRole('the-callers-token');
    assert.equal(authHeader, 'Bearer the-callers-token');
    globalThis.fetch = realFetch;
  });

  await check('the route only trusts a posted role in the offline demo', () => {
    const source = readFileSync(path.resolve('src/app/api/session/route.ts'), 'utf8');
    assert.match(source, /if \(!DEMO_MODE\) \{/);
    assert.match(source, /resolveServerRole\(/);
    // A failed verification must remove any cookie issued earlier.
    const catchBlock = source.slice(source.indexOf('} catch (error) {'), source.indexOf('// ── offline demo'));
    assert.match(catchBlock, /await clearCookie\(\)/, 'failure must clear the cookie');
    assert.ok(!/store\.set\(/.test(catchBlock), 'failure must never issue a cookie');
  });

  console.log('\nSIGNED SESSION COOKIE');

  const {
    issueSessionToken,
    readSessionToken,
    renewSessionToken,
    shouldRenew,
    SESSION_MAX_AGE,
    SESSION_ABSOLUTE_MAX_AGE,
  } = await import('@/lib/session');

  const t0 = 1_800_000_000;

  await check('a hand-written role cookie is refused', () => {
    // This exact header returned the defaulters register before the fix.
    for (const forged of ['ADMIN', 'BURSAR', 'SUPER_ADMIN', '', 'ADMIN.ADMIN.ADMIN']) {
      assert.equal(readSessionToken(forged, t0), null, `accepted: ${forged}`);
    }
  });

  await check('a genuine token round-trips with its subject', () => {
    const claims = readSessionToken(issueSessionToken('ADMIN', 'uid-9', t0), t0);
    assert.ok(claims);
    assert.equal(claims!.role, 'ADMIN');
    assert.equal(claims!.sub, 'uid-9');
    assert.equal(claims!.exp, t0 + SESSION_MAX_AGE);
  });

  await check('editing the role breaks the signature', () => {
    const token = issueSessionToken('VIEWER', 'uid-9', t0);
    assert.equal(readSessionToken(token.replace('.VIEWER.', '.ADMIN.'), t0), null);
  });

  await check('a tampered expiry breaks the signature', () => {
    const token = issueSessionToken('VIEWER', 'uid-9', t0);
    const parts = token.split('.');
    parts[4] = String(t0 + 999_999);
    assert.equal(readSessionToken(parts.join('.'), t0), null);
  });

  await check('a truncated or padded token is refused', () => {
    const token = issueSessionToken('ADMIN', 'uid-9', t0);
    assert.equal(readSessionToken(token.slice(0, -4), t0), null);
    assert.equal(readSessionToken(token + '.extra', t0), null);
    assert.equal(readSessionToken(token.split('.').slice(0, 6).join('.'), t0), null);
    assert.equal(readSessionToken(undefined, t0), null);
    assert.equal(readSessionToken('x'.repeat(600), t0), null);
  });

  await check('the idle window is 30 minutes and then closes', () => {
    assert.equal(SESSION_MAX_AGE, 1800);
    const token = issueSessionToken('ADMIN', 'uid-9', t0);
    assert.ok(readSessionToken(token, t0 + SESSION_MAX_AGE - 1), 'should still be valid just before expiry');
    assert.equal(readSessionToken(token, t0 + SESSION_MAX_AGE), null, 'must be refused at expiry');
  });

  await check('activity slides the window, and it renews only when worthwhile', () => {
    const claims = readSessionToken(issueSessionToken('ADMIN', 'uid-9', t0), t0)!;
    assert.equal(shouldRenew(claims, t0), false, 'fresh session needs no Set-Cookie');
    const later = t0 + SESSION_MAX_AGE - 300;
    assert.equal(shouldRenew(claims, later), true);
    const renewed = readSessionToken(renewSessionToken(claims, later), later)!;
    assert.equal(renewed.exp, later + SESSION_MAX_AGE);
    assert.equal(renewed.sub, 'uid-9');
  });

  await check('renewal can never outlive the absolute cap', () => {
    const claims = readSessionToken(issueSessionToken('ADMIN', 'uid-9', t0), t0)!;
    assert.equal(claims.abs, t0 + SESSION_ABSOLUTE_MAX_AGE);
    const nearEnd = claims.abs - 120;
    const renewed = readSessionToken(renewSessionToken(claims, nearEnd), nearEnd)!;
    assert.ok(renewed.exp <= claims.abs, 'sliding window escaped the absolute deadline');
    assert.equal(readSessionToken(renewSessionToken(claims, nearEnd), claims.abs), null);
    assert.equal(shouldRenew(claims, claims.abs - 30), false, 'must not renew a dying session');
  });

  await check('a token from the future is refused', () => {
    assert.equal(readSessionToken(issueSessionToken('ADMIN', 'uid-9', t0 + 3600), t0), null);
  });

  await check('every gated route reads the signature, not the raw cookie', () => {
    const routes = [
      'src/app/api/documents/[...slug]/route.ts',
      'src/app/api/media/delete/route.ts',
      'src/app/api/notifications/email/route.ts',
    ];
    for (const file of routes) {
      const source = readFileSync(path.resolve(file), 'utf8');
      assert.match(source, /serverRole\(\)/, `${file} must use the shared gate`);
      assert.ok(!/cookieStore\.get\(SESSION_COOKIE\)/.test(source), `${file} still reads the raw cookie`);
    }
    const mail = readFileSync(path.resolve('src/app/api/notifications/email/route.ts'), 'utf8');
    const get = mail.slice(mail.indexOf('export async function GET'));
    assert.match(get.slice(0, 700), /if \(!role\)[\s\S]{0,200}status: 401/, 'mail room must require a session');
  });

  console.log('\nPAYMENT WEBHOOK INTEGRITY');

  const { verifyWebhookSignature, validatePaymentPayload } = await import('@/lib/payments/verify-webhook');
  const crypto = await import('node:crypto');
  const secret = 'test-shared-secret';
  const body = JSON.stringify({ bill_reference: '99XX', amount_paid: 50000, transaction_id: 'tx-1' });
  const sign = (value: string) => crypto.createHmac('sha256', secret).update(value, 'utf8').digest('hex');

  await check('no secret configured means no payment is accepted', () => {
    const result = verifyWebhookSignature(body, sign(body), undefined);
    assert.equal(result.ok, false);
    assert.equal((result as any).status, 503);
  });

  await check('a missing signature is refused', () => {
    const result = verifyWebhookSignature(body, null, secret);
    assert.equal(result.ok, false);
    assert.equal((result as any).status, 401);
  });

  await check('a non-empty but forged signature is refused', () => {
    // This is exactly what the old handler accepted.
    for (const forged of ['anything', '0'.repeat(64), 'sha256=deadbeef']) {
      const result = verifyWebhookSignature(body, forged, secret);
      assert.equal(result.ok, false, `accepted forged signature: ${forged}`);
    }
  });

  await check('a correct signature passes, bare or prefixed', () => {
    assert.equal(verifyWebhookSignature(body, sign(body), secret).ok, true);
    assert.equal(verifyWebhookSignature(body, `sha256=${sign(body)}`, secret).ok, true);
  });

  await check('a signature for a different body is refused', () => {
    const tampered = JSON.stringify({ bill_reference: '99XX', amount_paid: 9_000_000, transaction_id: 'tx-1' });
    assert.equal(verifyWebhookSignature(tampered, sign(body), secret).ok, false);
  });

  await check('the payload must carry a positive amount and matching identifiers', () => {
    assert.equal(validatePaymentPayload({ bill_reference: 'A', amount_paid: 1, transaction_id: 't' }).ok, true);
    for (const bad of [
      { bill_reference: 'A', amount_paid: 0, transaction_id: 't' },
      { bill_reference: 'A', amount_paid: -5, transaction_id: 't' },
      { bill_reference: 'A', amount_paid: 'NaN', transaction_id: 't' },
      { bill_reference: '', amount_paid: 5, transaction_id: 't' },
      { bill_reference: 'A', amount_paid: 5, transaction_id: '' },
      null,
    ]) {
      assert.equal(validatePaymentPayload(bad).ok, false, JSON.stringify(bad));
    }
  });

  await check('the handler verifies before it parses or writes', () => {
    const source = readFileSync(path.resolve('src/app/api/webhooks/clickpesa/route.ts'), 'utf8');
    const verifyAt = source.indexOf('verifyWebhookSignature(');
    const parseAt = source.indexOf('JSON.parse(');
    const writeAt = source.indexOf('runTransaction(');
    assert.ok(verifyAt > -1 && verifyAt < parseAt && parseAt < writeAt, 'verification must come first');
    assert.match(source, /await request\.text\(\)/, 'must sign the raw body, not re-serialised JSON');
    assert.match(source, /transaction\.get\(matchRef\)/, 'pending row must be re-read inside the transaction');
    assert.match(source, /already_applied/, 'replays must be acknowledged without crediting');
  });

  console.log(failures === 0 ? '\nAUTH & SESSION REGRESSIONS PASSED\n' : `\n${failures} AUTH CHECK(S) FAILED\n`);
  if (failures > 0) process.exit(1);
}

void main();
