/**
 * @fileOverview ClickPesa payment delivery.
 *
 * Money only moves after the delivery is proven:
 *   1. HMAC-SHA256 over the raw body with the shared secret (constant-time compare)
 *   2. a payload carrying a positive amount, a control number and a transaction id
 *   3. the pending transaction is re-read INSIDE the Firestore transaction, and a
 *      transaction id already applied is ignored, so a replay or a concurrent
 *      duplicate cannot credit the learner twice
 *
 * Deployment note: this uses the web SDK's Firestore instance. Against a live
 * project it needs a server credential whose writes the rules accept, and
 * CLICKPESA_WEBHOOK_SECRET must be set. Until then the endpoint refuses every
 * delivery rather than guessing, see docs/FIREBASE.md.
 */

import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import {
  SIGNATURE_HEADER,
  validatePaymentPayload,
  verifyWebhookSignature,
} from '@/lib/payments/verify-webhook';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  // Read the body once as text: re-serialising parsed JSON would change the bytes
  // the signature was computed over.
  const rawBody = await request.text();

  const verified = verifyWebhookSignature(
    rawBody,
    request.headers.get(SIGNATURE_HEADER),
    process.env.CLICKPESA_WEBHOOK_SECRET
  );
  if (!verified.ok) {
    return NextResponse.json({ error: verified.reason }, { status: verified.status });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const valid = validatePaymentPayload(payload);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.reason }, { status: valid.status });
  }

  const { bill_reference, amount_paid, transaction_id, payment_method } = payload;
  const amount = Number(amount_paid);
  const { firestore: db } = initializeFirebase();

  try {
    const pending = query(
      collection(db, 'schools', 'school-001', 'transactions'),
      where('controlNumber', '==', bill_reference),
      where('status', '==', 'Pending')
    );
    const snapshot = await getDocs(pending);

    if (snapshot.empty) {
      // Either an unknown control number or a delivery we have already applied.
      // Both are acknowledged so the gateway stops retrying; neither moves money.
      return NextResponse.json({ status: 'no_pending_match' }, { status: 200 });
    }

    const matchRef = snapshot.docs[0].ref;

    const outcome = await runTransaction(db, async (transaction) => {
      // Re-read inside the transaction: two concurrent deliveries must not both
      // see "Pending" and both credit the account.
      const live = await transaction.get(matchRef);
      if (!live.exists()) return 'gone';
      const data = live.data();
      if (data.status !== 'Pending') return 'already_applied';
      if (data.bankReference === transaction_id) return 'already_applied';

      const studentRef = doc(db, 'schools', 'school-001', 'students', data.studentId);
      const student = await transaction.get(studentRef);
      if (!student.exists()) throw new Error('Learner record not found for this payment.');

      transaction.update(matchRef, {
        status: 'Verified',
        bankReference: transaction_id,
        paymentMethod: payment_method ?? 'Unknown',
        amountPaid: amount,
        reconciled: true,
        reconciledAt: serverTimestamp(),
      });

      const currentPaid = student.data().totalPaid || 0;
      const expected = student.data().totalFeesExpected || 0;
      const arrears = student.data().arrears || 0;
      const newPaid = currentPaid + amount;
      const newBalance = expected + arrears - newPaid;

      transaction.update(studentRef, {
        totalPaid: newPaid,
        balance: newBalance,
        lastPaymentDate: serverTimestamp(),
        paymentStatus: newBalance <= 0 ? 'CLEARED' : 'PARTIAL',
      });

      return 'reconciled';
    });

    return NextResponse.json({ status: outcome });
  } catch (error) {
    console.error('[clickpesa] reconciliation failed:', error);
    // 500 so the gateway retries; nothing was committed.
    return NextResponse.json({ error: 'Reconciliation failed.' }, { status: 500 });
  }
}
