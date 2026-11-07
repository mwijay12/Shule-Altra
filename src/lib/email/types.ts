/**
 * @fileOverview The shape of an outbound school email.
 *
 * Kept provider-agnostic: Resend is the first implementation, but a school in
 * Mwanza may be running Postmark or a plain SMTP relay, and none of the
 * templates below should care which.
 */

export type EmailTemplateId =
  | 'fee-reminder'
  | 'absence-alert'
  | 'report-card-ready'
  | 'payment-received'
  | 'staff-briefing'
  | 'timetable-change'

export type AudienceId =
  | 'fee-defaulters'
  | 'absent-today'
  | 'term-results'
  | 'all-teachers'
  | 'all-staff'

export type Recipient = {
  email: string
  name: string
  /** the learner this guardian belongs to, when the mail is about one child */
  learner?: string
  className?: string
}

export type RenderedEmail = {
  to: Recipient
  subject: string
  html: string
  text: string
}

export type SendResult = {
  provider: 'resend' | 'dry-run'
  attempted: number
  delivered: number
  failed: number
  /** ids returned by the provider, or the local preview ids in dry run */
  ids: string[]
  /** first error, if the provider refused the batch */
  error?: string
  auditId: string
}
