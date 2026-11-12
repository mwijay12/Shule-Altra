import { collection, doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore'
export type SupplierFields = { name: string; contactName: string; phone: string; email: string; category: string; notes: string }
export type Supplier = SupplierFields & { id: string; revision: number }
export function normalizeSupplier(input: SupplierFields): SupplierFields {
  const s = { name: input.name.trim(), contactName: input.contactName.trim(), phone: input.phone.trim(), email: input.email.trim().toLowerCase(), category: input.category.trim(), notes: input.notes.trim() }
  if (s.name.length < 2 || s.name.length > 120 || s.contactName.length > 120 || s.category.length > 120 || s.notes.length > 500) throw new Error('Check supplier name and field lengths.')
  if (s.phone && !/^(?:\+255|0)[0-9]{9}$/.test(s.phone)) throw new Error('Use a Tanzanian phone number, for example 0712345678 or +255712345678.')
  if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) throw new Error('Enter a valid email address.')
  if (s.email.length > 254) throw new Error('Email address is too long.')
  if (!s.phone && !s.email) throw new Error('Enter a phone number or email address.')
  return s
}
export async function saveSupplier(db: Firestore, input: SupplierFields, actorUid: string, previous?: Supplier) {
  const fields = normalizeSupplier(input)
  if (!actorUid) throw new Error('Sign in before saving.')
  const ref = previous ? doc(db, 'schools', 'school-001', 'suppliers', previous.id) : doc(collection(db, 'schools', 'school-001', 'suppliers'))
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref)
    if (previous) {
      if (!snap.exists() || (snap.data().revision ?? 0) !== previous.revision) throw new Error('This supplier changed since you opened it. Close and reopen to review the latest details.')
      tx.update(ref, { ...fields, revision: previous.revision + 1, updatedAt: serverTimestamp(), updatedByUid: actorUid })
    } else {
      if (snap.exists()) throw new Error('Could not create supplier. Try again.')
      tx.set(ref, { ...fields, revision: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedByUid: actorUid })
    }
  })
  return ref.id
}
