/**
 * @fileOverview Who may change the school's identity.
 *
 * The email list here is a UI convenience only — it decides what to render. The
 * actual gate is in firestore.rules and storage.rules, which check the verified
 * email on the request token. Editing this file does not grant anyone access.
 *
 * Keep this list in sync with `isSuperAdmin()` in both rules files.
 */

export const SUPER_ADMIN_EMAILS: readonly string[] = ['davidbyanmwijage@gmail.com'];

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
