
/**
 * @fileOverview Institutional Data Correction Utilities.
 */

import { 
  Firestore, 
  collection, 
  getDocs, 
  doc, 
  writeBatch 
} from 'firebase/firestore';

/**
 * Migration Script: Recalculate all broken balances across the institution.
 * Call this once after implementing the new Finance Engine.
 */
export async function fixBrokenBalances(db: Firestore, schoolId: string = 'school-001') {
  const studentsRef = collection(db, 'schools', schoolId, 'students');
  const snapshot = await getDocs(studentsRef);
  const batch = writeBatch(db);

  for (const studentDoc of snapshot.docs) {
    const data = studentDoc.data();
    const paymentsRef = collection(db, 'schools', schoolId, 'students', studentDoc.id, 'payments');
    
    let totalPaid = 0;
    // We assume payments are already in Firestore or we treat them as zero for fresh start
    // If payments exist in a subcollection, sum them up
    const subPayments = await getDocs(paymentsRef);
    subPayments.forEach(p => totalPaid += (p.data().amount || 0));

    const expected = data.totalFeesExpected || 0;
    const arrears = data.arrears || 0;
    const balance = (expected + arrears) - totalPaid;

    batch.update(studentDoc.ref, {
      totalPaid,
      balance,
      paymentStatus: balance <= 0 ? 'CLEARED' : 'PARTIAL'
    });
  }

  await batch.commit();
  console.log("Institutional Balance Migration Complete.");
}
