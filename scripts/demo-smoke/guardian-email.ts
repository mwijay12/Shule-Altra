import assert from 'node:assert/strict'
import { composeStudentMessage } from '@/lib/email/student-message'
const learner = { id: 'A1', name: 'Asha <Salum>', guardianName: 'Salum', guardianEmail: 'salum@example.com', balance: 25000 }
const school = { name: 'Shule Yetu' }
const reminder = composeStudentMessage('fee-reminder', learner, school)
assert.equal(reminder.to.email, 'salum@example.com')
assert.match(reminder.text, /25,000/)
assert.match(reminder.html, /Asha &lt;Salum&gt;/)
assert.doesNotMatch(reminder.text, /CP-2026|ClickPesa/)
assert.throws(() => composeStudentMessage('fee-reminder', { ...learner, guardianEmail: '' }, school), /email/)
assert.throws(() => composeStudentMessage('fee-reminder', { ...learner, balance: 0 }, school), /balance/)
const payment = { studentId: 'A1', status: 'Verified', amount: 12000, controlNumber: 'REC-123', paymentMethod: 'Cash' }
const receipt = composeStudentMessage('payment-received', learner, school, payment)
assert.match(receipt.text, /12,000/)
assert.match(receipt.text, /REC-123/)
assert.throws(() => composeStudentMessage('payment-received', learner, school, { ...payment, studentId: 'other' }), /belonging/)
assert.throws(() => composeStudentMessage('payment-received', learner, school, { ...payment, status: 'Pending' }), /confirmed/)
assert.throws(() => composeStudentMessage('payment-received', learner, school, { ...payment, controlNumber: '' }), /reference/)
console.log('GUARDIAN EMAIL COMPOSITION CHECKS PASSED')
