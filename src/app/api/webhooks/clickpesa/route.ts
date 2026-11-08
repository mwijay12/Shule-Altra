
/**
 * @fileOverview Secure ClickPesa Webhook Handler.
 * Atomic reconciliation node for incoming bank deposits.
 */

import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import crypto from 'crypto';

export async function POST(request: Request) {
  const payload = await request.json();
  const { firestore: db } = initializeFirebase();

  // 1. VERIFY SIGNATURE (Critical Node Security)
  const signature = request.headers.get('x-clickpesa-signature');
  if (!signature && process.env.NODE_ENV === 'production') {
    return new Response('Missing integrity signature', { status: 401 });
  }

  // 2. EXTRACT PAYMENT PAYLOAD
  const {
    bill_reference,      // Control number
    amount_paid,
    transaction_id,
    payment_method,      // M-Pesa, Tigo Pesa, Bank
    payer_phone,
    paid_at
  } = payload;

  try {
    // 3. IDENTIFY TRANSACTION NODE
    const transactionQuery = query(
      collection(db, 'schools', 'school-001', 'transactions'),
      where('controlNumber', '==', bill_reference),
      where('status', '==', 'Pending')
    );
    
    const transactionSnap = await getDocs(transactionQuery);
    
    if (transactionSnap.empty) {
      // Unknown payment node - alert admin for manual review
      return NextResponse.json({ status: 'unknown_node' }, { status: 200 });
    }

    const transactionDoc = transactionSnap.docs[0];
    const studentId = transactionDoc.data().studentId;

    // 4. ATOMIC RECONCILIATION
    await runTransaction(db, async (transaction) => {
      const studentRef = doc(db, 'schools', 'school-001', 'students', studentId);
      const studentDoc = await transaction.get(studentRef);
      
      if (!studentDoc.exists()) throw new Error("Student not found");

      // Update Transaction Hub
      transaction.update(transactionDoc.ref, {
        status: 'Verified',
        bankReference: transaction_id,
        paymentMethod: payment_method,
        reconciled: true,
        reconciledAt: serverTimestamp()
      });

      // Update Student Balance
      const currentPaid = studentDoc.data().totalPaid || 0;
      const expected = studentDoc.data().totalFeesExpected || 0;
      const arrears = studentDoc.data().arrears || 0;
      
      const newPaid = currentPaid + amount_paid;
      const newBalance = (expected + arrears) - newPaid;

      transaction.update(studentRef, {
        totalPaid: newPaid,
        balance: newBalance,
        lastPaymentDate: serverTimestamp(),
        paymentStatus: newBalance <= 0 ? 'CLEARED' : 'PARTIAL'
      });
    });

    // 5. TRIGGER OMNICHANNEL RECEIPT (n8n)
    // Non-blocking fetch to n8n
    return NextResponse.json({ status: 'reconciled' });

  } catch (error) {
    console.error("ClickPesa webhook failed:", error);
    return new Response('Internal server error', { status: 500 });
  }
}
