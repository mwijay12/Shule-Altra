/**
 * @fileOverview The cookie that carries the signed-in role to the server.
 *
 * Shared by the three routes that need it (session, documents, email) and kept
 * out of the route files themselves: Next only allows HTTP-method exports from
 * a `route.ts`, and a stray export breaks the generated route types.
 */

export const SESSION_COOKIE = 'altra.role'
export const SESSION_MAX_AGE = 60 * 60 * 12
