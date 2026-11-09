/**
 * @fileOverview Firebase project configuration.
 *
 * Two ways in, one shape out:
 *
 *   1. `NEXT_PUBLIC_FIREBASE_CONFIG`, the whole web config as JSON. This is
 *      what a real deployment uses, and it keeps the keys out of the source
 *      tree (they are still public by nature, Firebase web keys are not
 *      secrets; the rules decide what they may do).
 *   2. The fallback below, which points at the demo project so the hub still
 *      boots when somebody clones the repo without an env file.
 *
 * `storageBucket` is added when a config omits it: `getStorage()` throws
 * without one, and that throw used to take the whole client tree down.
 */

type FirebaseWebConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket?: string
  messagingSenderId?: string
  appId: string
  measurementId?: string
}

const FALLBACK: FirebaseWebConfig = {
  projectId: 'studio-9420247393-c051b',
  appId: '1:506164974996:web:72f8b7c3348cca240eab81',
  apiKey: 'AIzaSyCx1RDuRXbEOnLYQEpeGzwNo3d8rK8wWeo',
  authDomain: 'studio-9420247393-c051b.firebaseapp.com',
  messagingSenderId: '506164974996',
  measurementId: '',
}

function parse(raw: string | undefined): FirebaseWebConfig | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<FirebaseWebConfig>
    if (!parsed?.projectId || !parsed?.apiKey || !parsed?.appId) return null
    return parsed as FirebaseWebConfig
  } catch {
    // A malformed env var must not take the app down, fall back loudly.
    console.warn('[firebase] NEXT_PUBLIC_FIREBASE_CONFIG is not valid JSON; using the demo project.')
    return null
  }
}

const chosen = parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG) ?? FALLBACK

export const firebaseConfig: FirebaseWebConfig = {
  ...chosen,
  authDomain: chosen.authDomain || `${chosen.projectId}.firebaseapp.com`,
  storageBucket: chosen.storageBucket || `${chosen.projectId}.appspot.com`,
}

export const firebaseProjectId = firebaseConfig.projectId
