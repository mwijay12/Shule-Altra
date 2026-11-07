import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const { firestore: db } = initializeFirebase();

const SCHOOL_ID = 'school-001';
const COLLECTIONS = [
  'staff',
  'students',
  'grades',
  'transactions',
  'attendance',
  'hostels',
  'routes',
  'assets',
  'canteen_sales',
  'petty_cash',
];

/**
 * Purges every operational record under the institutional node.
 * Configuration documents (identity, utilities, integrations) are preserved.
 */
export async function clearDemoData() {
  try {
    let deleted = 0;

    for (const collName of COLLECTIONS) {
      const collRef = collection(db, 'schools', SCHOOL_ID, collName);
      const snapshot = await getDocs(collRef);

      if (snapshot.empty) continue;

      // Keep each batch under Firestore's 500-write ceiling
      for (let i = 0; i < snapshot.docs.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = snapshot.docs.slice(i, i + 400);
        chunk.forEach((document) => batch.delete(document.ref));
        await batch.commit();
        deleted += chunk.length;
      }
    }

    return { success: true, message: `${deleted} institutional records cleared.` };
  } catch (error: any) {
    console.error('[CLEAR_SEED] Failed:', error);
    throw new Error(`Clear operation failed: ${error.message}`);
  }
}
