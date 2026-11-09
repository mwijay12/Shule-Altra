/**
 * @fileOverview How much of a child's face this school is allowed to keep.
 *
 * Under Tanzania's Personal Data Protection Act, a child's photograph is
 * sensitive personal data: it needs a guardian's consent, a stated purpose and
 * a deletion path. Most schools will never write that policy down, so the
 * system has to ask them, once, and then behave accordingly.
 *
 *   PHOTO_POLICY=none       no photographs at all, initials avatars, ID cards
 *                           still print. The safest default for a school that
 *                           has not thought about it.
 *   PHOTO_POLICY=optional   (default) a photograph is captured only when a
 *                           guardian has agreed; everything works without one.
 *   PHOTO_POLICY=required   the school wants a face on every ID card. Consent
 *                           is still the guardian's to give or withdraw.
 *
 * The policy is read from `NEXT_PUBLIC_PHOTO_POLICY` because the register
 * decides in the browser whether to offer the camera at all.
 */

export type PhotoPolicy = 'none' | 'optional' | 'required'

const POLICIES: PhotoPolicy[] = ['none', 'optional', 'required']

export function photoPolicy(env: Record<string, string | undefined> = process.env): PhotoPolicy {
  const raw = (env.NEXT_PUBLIC_PHOTO_POLICY ?? '').trim().toLowerCase()
  return (POLICIES as string[]).includes(raw) ? (raw as PhotoPolicy) : 'optional'
}

/** May this school capture a photograph at all? */
export function photoCaptureAllowed(env?: Record<string, string | undefined>): boolean {
  return photoPolicy(env) !== 'none'
}

export const PHOTO_POLICY_LABEL: Record<PhotoPolicy, string> = {
  none: 'No photographs',
  optional: 'Photograph with consent',
  required: 'Photograph required',
}

export const PHOTO_POLICY_NOTE: Record<PhotoPolicy, string> = {
  none: 'This school does not keep learner photographs. ID cards print with initials.',
  optional: 'A photograph is stored only with a guardian’s consent, and can be withdrawn at any time.',
  required: 'Every learner should have a photograph on file; consent is recorded when it is captured.',
}

/**
 * How long a photograph is kept after a learner leaves. Marks and fee history
 * stay (the school is required to keep them); the face does not.
 */
export const PHOTO_RETENTION_DAYS = 90

export type PhotoConsent = {
  granted: boolean
  /** who gave it, in words the school can show an inspector */
  by: string
  at?: unknown
  /** set when a guardian withdrew consent or the learner left */
  revokedAt?: unknown
}
