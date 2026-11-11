import type { RenderedEmail } from './types'

export type StudentMailKind = 'fee-reminder' | 'payment-received'
export function composeStudentMessage(kind: StudentMailKind, student: Record<string, any>, school: Record<string, any>, transaction?: Record<string, any>): RenderedEmail {
  const email = String(student.guardianEmail ?? '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('This learner does not have a valid guardian email. Update the student profile first.')
  const learner = String(student.name ?? '').trim()
  const guardian = String(student.guardianName ?? '').trim()
  const schoolName = String(school.name ?? '').trim()
  if (!learner || !guardian || !schoolName) throw new Error('The learner name, guardian name and school name must be recorded first.')
  let title: string; let lines: string[]
  const format = (n: number) => `TZS ${n.toLocaleString('en-US')}`
  if (kind === 'fee-reminder') {
    if (typeof student.balance !== 'number' || !Number.isFinite(student.balance) || student.balance <= 0) throw new Error('This learner has no positive recorded balance to remind.')
    title = `Fee balance for ${learner}`
    lines = [`Dear ${guardian},`, `Our records show an outstanding balance of ${format(student.balance)} for ${learner}.`, 'Please contact the school office for payment instructions or if you believe this balance is incorrect.']
  } else {
    if (!transaction || transaction.studentId !== student.id || transaction.status !== 'Verified' || typeof transaction.amount !== 'number' || !Number.isFinite(transaction.amount) || transaction.amount <= 0) throw new Error('Choose a recorded confirmed payment belonging to this learner.')
    const reference = String(transaction.controlNumber ?? transaction.transactionReference ?? '').trim()
    if (!reference) throw new Error('This payment has no recorded reference.')
    title = `Payment recorded for ${learner}`
    lines = [`Dear ${guardian},`, `The school has recorded a payment of ${format(transaction.amount)} for ${learner}.`, `Record reference: ${reference}`, `Payment method: ${String(transaction.paymentMethod || 'Not recorded')}`, 'Please contact the school office if any details are incorrect.']
  }
  lines.push('Thank you,', schoolName)
  const esc = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
  return { to: { email, name: guardian, learner }, subject: title.replace(/[\r\n]/g, ' '), text: lines.join('\n\n'), html: `<!doctype html><html><body style="margin:0;background:#f3f6f4;font-family:Arial,sans-serif;color:#18302b"><table role="presentation" width="100%"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" style="max-width:580px;background:#fff;border-radius:12px"><tr><td style="padding:28px"><p style="font-size:14px;color:#41645a">${esc(schoolName)}</p><h1 style="font-size:23px">${esc(title)}</h1>${lines.map(line => `<p style="line-height:1.6">${esc(line)}</p>`).join('')}</td></tr></table></td></tr></table></body></html>` }
}
