/**
 * @fileOverview Firebase Auth replacement for the offline demo.
 *
 * Sessions are simulated locally: any password is accepted for the demo
 * accounts, and the session survives a refresh through localStorage.
 */

export type DemoUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  providerId: string;
  tenantId: string | null;
  phoneNumber: string | null;
  providerData: any[];
  metadata: { creationTime?: string; lastSignInTime?: string };
  refreshToken: string;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  getIdTokenResult: () => Promise<any>;
  reload: () => Promise<void>;
  delete: () => Promise<void>;
  toJSON: () => Record<string, any>;
};

const SESSION_KEY = 'shule-altra.demo.session';

type AuthListener = (user: DemoUser | null) => void;

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Demo accounts surfaced on the login screen. */
export const DEMO_ACCOUNTS = [
  {
    email: 'admin@shule.pro',
    password: 'demo2026',
    label: 'Administrator',
    description: 'Full control of every institutional node',
  },
  {
    email: 'teacher@shule.pro',
    password: 'demo2026',
    label: 'Teacher',
    description: 'Students, attendance, academics & timetable',
  },
  {
    email: 'bursar@shule.pro',
    password: 'demo2026',
    label: 'Bursar',
    description: 'Finance, canteen, hostel & transport',
  },
] as const;

const UID_BY_EMAIL: Record<string, string> = {
  'admin@shule.pro': 'demo-admin',
  'teacher@shule.pro': 'demo-teacher',
  'bursar@shule.pro': 'demo-bursar',
  'accounts@shule.pro': 'demo-accountant',
};

const NAME_BY_EMAIL: Record<string, string> = {
  'admin@shule.pro': 'Dr. Josephat Mwakalinga',
  'teacher@shule.pro': 'Mwl. Neema Kessy',
  'bursar@shule.pro': 'CPA. Abdulrazaq Mtenga',
  'accounts@shule.pro': 'Bi. Rehema Shayo',
};

function buildUser(uid: string, email: string | null, displayName: string | null, isAnonymous = false): DemoUser {
  return {
    uid,
    email,
    displayName,
    photoURL: null,
    emailVerified: true,
    isAnonymous,
    providerId: 'demo',
    tenantId: null,
    phoneNumber: null,
    providerData: [],
    metadata: { creationTime: new Date().toISOString(), lastSignInTime: new Date().toISOString() },
    refreshToken: 'demo-refresh-token',
    getIdToken: async () => 'demo-id-token',
    getIdTokenResult: async () => ({ token: 'demo-id-token', claims: { demo: true }, expirationTime: '' }),
    reload: async () => undefined,
    delete: async () => undefined,
    toJSON: () => ({ uid, email, displayName, isAnonymous }),
  };
}

function readSession(): DemoUser | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.uid) return null;
    return buildUser(parsed.uid, parsed.email ?? null, parsed.displayName ?? null, parsed.isAnonymous === true);
  } catch {
    return null;
  }
}

function persistSession(user: DemoUser | null) {
  if (!hasWindow()) return;
  try {
    if (!user) window.localStorage.removeItem(SESSION_KEY);
    else
      window.localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ uid: user.uid, email: user.email, displayName: user.displayName, isAnonymous: user.isAnonymous })
      );
  } catch {
    /* storage unavailable — session simply won't survive refresh */
  }
}

export class DemoAuth {
  currentUser: DemoUser | null = readSession();
  private listeners = new Set<AuthListener>();
  readonly name = '[DEMO]';
  readonly config = { authDomain: 'demo.local', apiKey: 'demo', appName: '[DEMO]' };

  notify() {
    const snapshot = this.currentUser;
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error('[DEMO AUTH] listener failed', error);
      }
    });
  }

  subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setUser(user: DemoUser | null) {
    this.currentUser = user;
    persistSession(user);
    this.notify();
  }
}

const demoAuth = new DemoAuth();

export function getAuth(_app?: any): DemoAuth {
  return demoAuth;
}

export function initializeAuth(_app?: any, _deps?: any): DemoAuth {
  return demoAuth;
}

export function onAuthStateChanged(
  auth: DemoAuth,
  next: (user: DemoUser | null) => void,
  error?: (error: Error) => void,
  completed?: () => void
): () => void {
  const unsubscribe = auth.subscribe(next);
  setTimeout(() => {
    try {
      next(auth.currentUser);
      completed?.();
    } catch (caught) {
      error?.(caught as Error);
    }
  }, 0);
  return unsubscribe;
}

export function onIdTokenChanged(
  auth: DemoAuth,
  next: (user: DemoUser | null) => void,
  error?: (error: Error) => void
): () => void {
  return onAuthStateChanged(auth, next, error);
}

export async function signInAnonymously(auth: DemoAuth): Promise<{ user: DemoUser }> {
  const user = buildUser('demo-admin', null, 'Demo Administrator', true);
  auth.setUser(user);
  return { user };
}

export async function signInWithEmailAndPassword(
  auth: DemoAuth,
  email: string,
  password: string
): Promise<{ user: DemoUser }> {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized.includes('@')) {
    throw Object.assign(new Error('auth/invalid-email'), { code: 'auth/invalid-email' });
  }
  if (!password) {
    throw Object.assign(new Error('auth/missing-password'), { code: 'auth/missing-password' });
  }

  const uid = UID_BY_EMAIL[normalized] || `demo-${normalized.split('@')[0].replace(/[^a-z0-9]/g, '')}`;
  const displayName = NAME_BY_EMAIL[normalized] || normalized.split('@')[0].replace(/[._]/g, ' ');
  const user = buildUser(uid, normalized, displayName, false);
  auth.setUser(user);
  return { user };
}

export async function createUserWithEmailAndPassword(
  auth: DemoAuth,
  email: string,
  password: string
): Promise<{ user: DemoUser }> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOut(auth: DemoAuth): Promise<void> {
  auth.setUser(null);
}

export function isSignInWithEmailLink(): boolean {
  return false;
}

/* Compatibility placeholders for type-only imports. */
export const Auth: any = undefined;
export const User: any = undefined;
export const UserCredential: any = undefined;
export const AuthError: any = undefined;
