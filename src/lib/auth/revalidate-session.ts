import { resolveServerRole } from '@/lib/auth/verify-session'
import type { SessionClaims } from '@/lib/session'

/** Fail closed if the signed session no longer matches Firebase's current role. */
export async function revalidateLiveSession(claims: SessionClaims, token: string | undefined, resolve = resolveServerRole): Promise<boolean> {
  if (!token) return false
  try {
    const current = await resolve(token)
    return current.uid === claims.sub && current.role === claims.role
  } catch { return false }
}
