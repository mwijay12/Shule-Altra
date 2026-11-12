import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore'
export const OPTIONAL_SIDEBAR = ['analytics','communications','students','attendance','academics','timetable','finance','canteen','assets','transport','hostel','ai-tools','reports','audit','themeStudio'] as const
export type SidebarModule = typeof OPTIONAL_SIDEBAR[number]
export function parseHiddenModules(value: unknown): SidebarModule[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((v): v is SidebarModule => OPTIONAL_SIDEBAR.some(m => m === v)))]
}
export async function saveSidebarPreferences(db: Firestore, hidden: SidebarModule[], expectedRevision: number, uid: string) {
  if (!uid || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || hidden.length !== parseHiddenModules(hidden).length) throw new Error('Invalid sidebar settings.')
  const ref = doc(db, 'schools', 'school-001', 'config', 'sidebar')
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref)
    const current = snap.exists() ? snap.data().revision : 0
    if (current !== expectedRevision) throw new Error('Settings changed in another session. Close and reopen to review them.')
    tx.set(ref, { hidden, revision: expectedRevision + 1, updatedByUid: uid, updatedAt: serverTimestamp() })
  })
}
