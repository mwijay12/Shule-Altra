import './dom'
import assert from 'node:assert/strict'
import { initializeFirebase } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { parseHiddenModules, saveSidebarPreferences } from '@/lib/navigation/sidebar-preferences'
async function main() {
  const { firestore: db } = initializeFirebase()
  assert.deepEqual(parseHiddenModules(['finance', 'finance', 'settings', 'unknown']), ['finance'])
  await saveSidebarPreferences(db, ['canteen', 'hostel'], 0, 'admin')
  const ref = doc(db, 'schools', 'school-001', 'config', 'sidebar')
  const data = (await getDoc(ref)).data()!
  assert.deepEqual(data.hidden, ['canteen', 'hostel']); assert.equal(data.revision, 1)
  await assert.rejects(() => saveSidebarPreferences(db, ['transport'], 0, 'admin'), /changed/i)
  assert.deepEqual((await getDoc(ref)).data()!.hidden, ['canteen', 'hostel'])
  await assert.rejects(() => saveSidebarPreferences(db, ['settings'] as never, 1, 'admin'), /invalid/i)
  console.log('SIDEBAR PREFERENCES TESTS PASSED (demo store; not a permission check)')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
