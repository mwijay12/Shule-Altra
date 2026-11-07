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

/** Who physically carries the mail. Chosen by environment, never by a flag. */
export type ProviderId = 'smtp' | 'resend' | 'dry-run'

/** What `deliver()` reports back before the route dresses it up. */
export type SendOutcome = {
  provider: ProviderId
  delivered: number
  failed: number
  /** ids returned by the provider, or local preview ids in a dry run */
  ids: string[]
  /** first error worth showing a human, if the provider refused anything */
  error?: string
}

export type SendResult = SendOutcome & {
  attempted: number
  /** the office copy, when ADMIN_NOTIFICATION_EMAIL is configured */
  copyTo?: string
  auditId: string
  checkedAt: string
}
