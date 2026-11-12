import './dom'
import assert from 'node:assert/strict'
import { initializeFirebase } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { normalizeSupplier, saveSupplier } from '@/lib/suppliers/register'
async function main() {
  const { firestore: db } = initializeFirebase()
  const fields = { name: '  Test Supplies  ', contactName: 'Contact', phone: '0712345678', email: 'INFO@EXAMPLE.COM', category: 'Stationery', notes: '' }
  assert.equal(normalizeSupplier(fields).email, 'info@example.com')
  assert.throws(() => normalizeSupplier({ ...fields, phone: '', email: '' }), /phone number or email/i)
  assert.throws(() => normalizeSupplier({ ...fields, phone: '123' }), /phone number/i)
  const id = await saveSupplier(db, fields, 'admin')
  const ref = doc(db, 'schools', 'school-001', 'suppliers', id)
  const original = (await getDoc(ref)).data()!
  assert.equal(original.name, 'Test Supplies'); assert.equal(original.revision, 1)
  const previous = { ...fields, ...original, id, revision: 1 }
  await saveSupplier(db, { ...fields, category: 'Books' }, 'admin', previous)
  assert.equal((await getDoc(ref)).data()!.category, 'Books')
  await assert.rejects(() => saveSupplier(db, fields, 'admin', previous), /changed/i)
  assert.equal((await getDoc(ref)).data()!.revision, 2)
  console.log('SUPPLIER REGISTER TESTS PASSED (demo store)')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
