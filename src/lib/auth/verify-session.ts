/**
 * @fileOverview Resolve the role a browser session may actually act as.
 *
 * The document gate reads an httpOnly cookie. That cookie is only trustworthy if
 * the server decided its value, so this module verifies a Firebase ID token and
 * then reads the caller's own staff record — using the caller's token, so
 * Firestore rules apply to the lookup as well.
 *
 * No Admin SDK and no service-account key: both calls are plain REST against the
 * project's public web config. Nothing here trusts a role from the request body.
 */

import { firebaseConfig } from '@/firebase/config';
import { isSuperAdminEmail } from '@/lib/auth/super-admin';
import { isDocRole, type DocRole } from '@/lib/documents/registry';

const SCHOOL_ID = 'school-001';
const TIMEOUT_MS = 8000;

async function fetchJson(url: string, init: RequestInit): Promise<{ status: number; body: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    let body: any = null;
    try {
      body = await response.json();
    } catch {
      /* a non-JSON error body is still a failure */
    }
    return { status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

export class SessionVerificationError extends Error {
  constructor(message: string, readonly status = 401) {
    super(message);
    this.name = 'SessionVerificationError';
  }
}

/**
 * Verify the token and resolve the role. Throws on anything it cannot prove —
 * the caller must fail closed rather than guess.
 */
export async function resolveServerRole(
  idToken: string
): Promise<{ role: DocRole; uid: string }> {
  if (!idToken || typeof idToken !== 'string') {
    throw new SessionVerificationError('A Firebase ID token is required.', 400);
  }

  // 1. Is this token genuine, and whose is it?
  const lookup = await fetchJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  if (lookup.status !== 200) {
    throw new SessionVerificationError('The sign-in token could not be verified. Sign in again.', 401);
  }
  const account = lookup.body?.users?.[0];
  if (!account?.localId) {
    throw new SessionVerificationError('The sign-in token did not identify an account.', 401);
  }

  // 2. The install owner. Same verified-email rule as firestore.rules.
  if (account.emailVerified === true && isSuperAdminEmail(account.email)) {
    return { role: 'ADMIN', uid: account.localId };
  }

  // 3. Everybody else: their staff record, read as themselves so the security
  //    rules decide whether they may read it at all.
  const path = `projects/${firebaseConfig.projectId}/databases/(default)/documents/schools/${SCHOOL_ID}/staff/${account.localId}`;
  const record = await fetchJson(`https://firestore.googleapis.com/v1/${path}`, {
    headers: { authorization: `Bearer ${idToken}` },
  });

  if (record.status === 404) return { role: 'VIEWER', uid: account.localId };
  if (record.status === 403) {
    throw new SessionVerificationError('This account is not allowed to read its staff record.', 403);
  }
  if (record.status !== 200) {
    throw new SessionVerificationError('The staff record could not be read. Try again shortly.', 503);
  }

  const declared = record.body?.fields?.role?.stringValue;
  if (declared === 'SUPER_ADMIN') return { role: 'ADMIN', uid: account.localId };
  return { role: isDocRole(declared) ? declared : 'VIEWER', uid: account.localId };
}
