import './dom';
import assert from 'node:assert/strict';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { processPaymentTransaction, generateInstitutionalControlNumber } from '@/lib/finance-engine';

async function main() {
  const { firestore } = initializeFirebase();
  const student = doc(firestore, 'schools', 'school-001', 'students', 'finance-test');
  await setDoc(student, { id: 'finance-test', name: 'Test learner', class: 'Form 1', totalFeesExpected: 100000, totalPaid: 20000, arrears: 0, balance: 80000 });
  const input = { studentId: 'finance-test', amount: 15000, controlNumber: '', feeType: 'Tuition' as const, paymentMethod: 'Cash' as const, recordedBy: 'Bursar', academicYear: 2026 };
  const result = await processPaymentTransaction(firestore, input);
  const updated = (await getDoc(student)).data()!;
  const entry = (await getDoc(doc(firestore, 'schools', 'school-001', 'transactions', result.transactionId))).data()!;
  assert.equal(updated.totalPaid, 35000);
  assert.equal(updated.balance, 65000);
  assert.equal(entry.referenceType, 'internal');
  assert.match(entry.controlNumber, /^REC-/);
  assert.equal(entry.reconciled, false);
  await assert.rejects(() => processPaymentTransaction(firestore, { ...input, amount: -1 }));
  await assert.rejects(() => processPaymentTransaction(firestore, { ...input, studentId: 'missing' }));
  await assert.rejects(() => generateInstitutionalControlNumber(firestore, { schoolId: 'school-001', studentId: 'finance-test', amount: 100, feeType: 'Tuition', payerName: 'Test', payerPhone: '', expiresInDays: 7 }), /payment provider/);
  assert.equal((await getDoc(student)).data()!.balance, 65000);
  console.log('MANUAL PAYMENT REGRESSIONS PASSED');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
