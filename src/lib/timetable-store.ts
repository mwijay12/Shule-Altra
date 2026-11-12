import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore'
import { DAYS, PERIODS, TIMETABLE_CLASSES, TIMETABLE_STREAMS, type Slot, type Timetable } from '@/lib/timetable'

export type StoredSchedule = { schemaVersion: 1; className: string; stream: string; slots: Record<string, Slot> }
export const scheduleId = (className: string, stream: string) => `schedule-${className.replace(/\s+/g, '-').toLowerCase()}-${stream.toLowerCase()}`
export const slotKey = (day: string, periodId: string) => `${day.toLowerCase()}_${periodId}`
const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
function validSlot(value: any): value is Slot {
  return value && typeof value === 'object' && typeof value.subject === 'string' && typeof value.teacher === 'string' && typeof value.room === 'string'
}
export function readSchedule(data: any): StoredSchedule | null {
  if (!data) return null
  if (data.schemaVersion !== 1 || !data.slots || typeof data.slots !== 'object' || Array.isArray(data.slots) || Object.values(data.slots).some(slot => !validSlot(slot))) throw new Error('This timetable has an unsupported format. It was not changed.')
  return data as StoredSchedule
}
export function scheduleTimetable(className: string, stream: string, schedule: StoredSchedule | null): Timetable {
  const grid = PERIODS.map(period => DAYS.map(day => period.isBreak ? null : schedule?.slots[slotKey(day, period.id)] ?? null))
  const load = new Map<string, { subject: string; teacher: string; periods: number }>()
  grid.flat().forEach(slot => { if (!slot) return; const key = `${norm(slot.subject)}|${norm(slot.teacher)}`; const entry = load.get(key) ?? { subject: slot.subject, teacher: slot.teacher, periods: 0 }; entry.periods++; load.set(key, entry) })
  return { className, stream, term: 'Current schedule', days: DAYS, periods: PERIODS, grid, subjectLoad: [...load.values()] }
}
export async function saveTimetableSlot(db: Firestore, input: { className: string; stream: string; day: string; periodId: string; slot: Slot | null; expected: Slot | null }) {
  const { className, stream, day, periodId } = input
  if (!TIMETABLE_CLASSES.includes(className as typeof TIMETABLE_CLASSES[number]) || !TIMETABLE_STREAMS.includes(stream) || !DAYS.includes(day) || !PERIODS.some(period => period.id === periodId && !period.isBreak)) throw new Error('Choose a valid class and teaching period.')
  const cleaned = input.slot && { subject: input.slot.subject.trim(), teacher: input.slot.teacher.trim(), room: input.slot.room.trim() }
  if (cleaned && (!cleaned.subject || !cleaned.teacher || Object.values(cleaned).some(value => value.length > 80))) throw new Error('Enter a subject and teacher; each field must be 80 characters or fewer.')
  const refs = TIMETABLE_CLASSES.flatMap(c => TIMETABLE_STREAMS.map(s => ({ className: c, stream: s, ref: doc(db, 'schools', 'school-001', 'timetable', scheduleId(c, s)) })))
  const key = slotKey(day, periodId)
  return runTransaction(db, async tx => {
    // Read every supported class/stream before writing. Firestore retries if a
    // competing online transaction changes a schedule we checked.
    const snapshots = await Promise.all(refs.map(entry => tx.get(entry.ref)))
    const entries = refs.map((entry, i) => ({ ...entry, schedule: snapshots[i].exists() ? readSchedule(snapshots[i].data()) : null }))
    const target = entries.find(entry => entry.className === className && entry.stream === stream)!
    const previous = target.schedule?.slots[key] ?? null
    if (previous?.subject !== input.expected?.subject || previous?.teacher !== input.expected?.teacher || previous?.room !== input.expected?.room) throw new Error('This period changed on another device. Close and reopen it to review the latest version.')
    if (cleaned) for (const other of entries) {
      if (other === target) continue
      const slot = other.schedule?.slots[key]
      if (!slot) continue
      if (norm(slot.teacher) === norm(cleaned.teacher)) throw new Error(`Teacher is already assigned to ${other.className} ${other.stream} at this time.`)
      if (cleaned.room && slot.room && norm(slot.room) === norm(cleaned.room)) throw new Error(`Room is already assigned to ${other.className} ${other.stream} at this time.`)
    }
    const slots = { ...(target.schedule?.slots ?? {}) }
    if (cleaned) slots[key] = cleaned; else delete slots[key]
    tx.set(target.ref, { schemaVersion: 1, className, stream, slots, updatedAt: serverTimestamp() })
  })
}
