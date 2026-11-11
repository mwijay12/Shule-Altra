import './dom'
import assert from 'node:assert/strict'
import { initializeFirebase } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { saveTimetableSlot, scheduleId, readSchedule, scheduleTimetable } from '@/lib/timetable-store'
import { summarizeTimetable } from '@/lib/timetable'
import { buildTimetablePdf } from '@/lib/pdf/timetable'

async function main() {
  const { firestore: db } = initializeFirebase()
  const a = { className: 'Form 1', stream: 'A', day: 'Monday', periodId: 'p1' }
  const first = { subject: 'Mathematics', teacher: 'Mwalimu Asha', room: 'Room 1' }
  await saveTimetableSlot(db, { ...a, slot: first, expected: null })
  const ref = doc(db, 'schools', 'school-001', 'timetable', scheduleId(a.className, a.stream))
  let schedule = readSchedule((await getDoc(ref)).data())!
  assert.deepEqual(schedule.slots.monday_p1, first)
  assert.deepEqual(summarizeTimetable(scheduleTimetable('Form 1', 'A', schedule)), { teaching: 1, free: 39, breaks: 10, capacity: 40 })
  const b = { className: 'Form 2', stream: 'B', day: 'Monday', periodId: 'p1', expected: null }
  await assert.rejects(() => saveTimetableSlot(db, { ...b, slot: { ...first, teacher: ' mwalimu  asha ', room: 'Lab' } }), /Teacher.*already/)
  await assert.rejects(() => saveTimetableSlot(db, { ...b, slot: { ...first, teacher: 'Other', room: 'room 1' } }), /Room.*already/)
  await saveTimetableSlot(db, { ...b, day: 'Tuesday', slot: first })
  await assert.rejects(() => saveTimetableSlot(db, { ...a, slot: null, expected: null }), /changed on another device/)
  await assert.rejects(() => saveTimetableSlot(db, { ...a, periodId: 'b1', slot: first, expected: null }), /valid class/)
  await assert.rejects(() => saveTimetableSlot(db, { ...a, periodId: 'p2', slot: { ...first, teacher: ' ' }, expected: null }), /subject and teacher/)
  const pdf = await buildTimetablePdf(scheduleTimetable('Form 1', 'A', schedule), { saved: true })
  assert.ok(pdf.length > 1000)
  await saveTimetableSlot(db, { ...a, slot: null, expected: first })
  schedule = readSchedule((await getDoc(ref)).data())!
  assert.equal(schedule.slots.monday_p1, undefined)
  console.log('TIMETABLE EDITOR CHECKS PASSED')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
