import { doc, writeBatch } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { buildDemoDataset, DEMO_SCHOOL_ID } from '@/lib/demo/seed-data';

const { firestore: db } = initializeFirebase();

/**
 * Institutional demo seed.
 *
 * Writes the deterministic Tanzanian demo dataset (students, NECTA grades,
 * fee ledger, attendance, boarding, fleet, canteen and inventory) into the
 * active institutional node. In demo mode this lands in the local offline
 * datastore; with Firebase configured it writes to Firestore in batches.
 */
export async function seedDemoData(onProgress?: (step: string, percent: number) => void) {
  const dataset = buildDemoDataset();
  const entries = Object.entries(dataset);

  onProgress?.('Preparing institutional dataset...', 5);

  const CHUNK_SIZE = 400; // stays well under Firestore's 500-write batch limit

  for (let index = 0; index < entries.length; index += CHUNK_SIZE) {
    const chunk = entries.slice(index, index + CHUNK_SIZE);
    const percent = Math.min(98, Math.round(((index + chunk.length) / entries.length) * 100));
    onProgress?.(`Writing registry nodes (${index + chunk.length}/${entries.length})...`, percent);

    const batch = writeBatch(db);
    chunk.forEach(([path, data]) => {
      batch.set(doc(db, path), data);
    });
    await batch.commit();
  }

  onProgress?.('Seed complete!', 100);

  const studentCount = entries.filter(([path]) => path.includes('/students/')).length;

  return {
    success: true,
    summary: `Seeded ${studentCount} students, ${entries.length} documents into ${DEMO_SCHOOL_ID}.`,
  };
}
