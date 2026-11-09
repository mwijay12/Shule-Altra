/**
 * @fileOverview Verify a ClickPesa delivery before it is allowed to move money.
 *
 * The handler used to check only that an `x-clickpesa-signature` header existed.
 * Any non-empty string passed, so a forged POST could mark a fee as Verified and
 * credit the learner's account. `crypto` was imported and never used.
 *
 * This computes HMAC-SHA256 over the exact raw body with the shared secret and
 * compares in constant time. No secret configured means no payment is accepted —
 * the endpoint fails closed rather than trusting the network.
 */

import crypto from 'node:crypto';

export const SIGNATURE_HEADER = 'x-clickpesa-signature';

export type VerificationResult =
  | { ok: true }
  | { ok: false; status: number; reason: string };

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string | undefined
): VerificationResult {
  if (!secret) {
    return {
      ok: false,
      status: 503,
      reason: 'Payment webhook is not configured. Set CLICKPESA_WEBHOOK_SECRET before accepting deliveries.',
    };
  }
  if (!signature) {
    return { ok: false, status: 401, reason: 'Missing integrity signature.' };
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  // Accept a bare hex digest or the common "sha256=<digest>" form.
  const presented = signature.startsWith('sha256=') ? signature.slice(7) : signature;

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(presented, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, status: 401, reason: 'Signature did not match the payload.' };
  }
  return { ok: true };
}

/** A delivery must carry a positive, finite amount and something to match on. */
export function validatePaymentPayload(payload: any): VerificationResult {
  const amount = Number(payload?.amount_paid);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, status: 400, reason: 'amount_paid must be a positive number.' };
  }
  if (typeof payload?.bill_reference !== 'string' || payload.bill_reference.trim() === '') {
    return { ok: false, status: 400, reason: 'bill_reference is required.' };
  }
  if (typeof payload?.transaction_id !== 'string' || payload.transaction_id.trim() === '') {
    return { ok: false, status: 400, reason: 'transaction_id is required.' };
  }
  return { ok: true };
}
