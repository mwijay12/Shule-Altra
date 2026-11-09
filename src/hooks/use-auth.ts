'use client';

/**
 * @fileOverview Session and role, resolved once for the whole app.
 *
 * This used to be a plain hook, so each of the seven components calling it open
 * its own onAuthStateChanged + staff onSnapshot pair. Worse, signing out never
 * tore the staff listener down: a later snapshot could fire and repopulate the
 * UI with the previous user's role after they had signed out.
 *
 * It is now a ref-counted module store read through useSyncExternalStore. One
 * auth subscription, one staff subscription, every consumer sees the same
 * object, and switching users always drops the previous profile listener first.
 *
 * Role truth is `schools/<id>/staff/<uid>`. The only exceptions are the install
 * owner (verified Google email, mirrored in firestore.rules) and the offline
 * demo bypass, which is compiled out of behaviour when DEMO_MODE is false.
 */

import { useCallback, useSyncExternalStore } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { isSuperAdminEmail } from '@/lib/auth/super-admin';
import { DEMO_MODE } from '@/lib/demo/config';
import { setAuditActor } from '@/lib/audit/record';

const { auth, firestore: db } = initializeFirebase();

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'ACCOUNTANT' | 'BURSAR' | 'VIEWER';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  schoolId: string | null;
  staffProfile: any | null;
  loading: boolean;
  error: string | null;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 200,
  ADMIN: 100,
  ACCOUNTANT: 50,
  BURSAR: 50,
  TEACHER: 30,
  VIEWER: 10,
};

const SCHOOL_ID = 'school-001';

const INITIAL: AuthState = {
  user: null,
  role: null,
  schoolId: SCHOOL_ID,
  staffProfile: null,
  loading: true,
  error: null,
};

const SIGNED_OUT: AuthState = {
  user: null,
  role: null,
  schoolId: null,
  staffProfile: null,
  loading: false,
  error: null,
};

// ── shared store ───────────────────────────────────────────────────────────
let current: AuthState = INITIAL;
const listeners = new Set<() => void>();
let refCount = 0;
let stopAuth: (() => void) | null = null;
let stopProfile: (() => void) | null = null;

function emit(next: AuthState) {
  current = next;
  // The audit recorder attributes writes to whoever is signed in. Setting it
  // here means every transition — sign-in, role change, sign-out — is covered
  // by one line rather than by remembering at each call site.
  setAuditActor(
    next.user && next.role
      ? {
          uid: next.user.uid,
          name: next.staffProfile?.fullName || next.user.displayName || next.user.email || 'Staff',
          email: next.user.email || '',
          role: next.role,
        }
      : null
  );
  listeners.forEach((listener) => listener());
}

function dropProfile() {
  stopProfile?.();
  stopProfile = null;
}

function start() {
  stopAuth = onAuthStateChanged(auth, (user) => {
    // Whatever happened before, the old profile subscription must not outlive
    // the session it belonged to.
    dropProfile();

    if (!user) {
      emit(SIGNED_OUT);
      return;
    }

    // The install owner. UI only — firestore.rules enforces the same address.
    if (isSuperAdminEmail(user.email) && user.emailVerified) {
      emit({
        user,
        role: 'SUPER_ADMIN',
        schoolId: SCHOOL_ID,
        staffProfile: {
          fullName: user.displayName || 'Super administrator',
          role: 'SUPER_ADMIN',
          email: user.email,
          photoURL: user.photoURL,
        },
        loading: false,
        error: null,
      });
      return;
    }

    // Offline demo only. Against a real project an anonymous session or a
    // look-alike address must never be handed administrator UI.
    if (DEMO_MODE && (user.email === 'admin@shule.pro' || user.isAnonymous)) {
      emit({
        user,
        role: 'ADMIN',
        schoolId: SCHOOL_ID,
        staffProfile: { fullName: 'Institutional Administrator', role: 'ADMIN' },
        loading: false,
        error: null,
      });
      return;
    }

    const profileRef = doc(db, 'schools', SCHOOL_ID, 'staff', user.uid);
    stopProfile = onSnapshot(
      profileRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          emit({
            user,
            role: 'VIEWER',
            schoolId: SCHOOL_ID,
            staffProfile: null,
            loading: false,
            error: null,
          });
          return;
        }
        const profile = snapshot.data();
        const declared = profile.role as UserRole;
        emit({
          user,
          role: declared in ROLE_HIERARCHY ? declared : 'VIEWER',
          schoolId: SCHOOL_ID,
          staffProfile: profile,
          loading: false,
          error: null,
        });
      },
      (error) => {
        console.error('[AUTH] Staff profile listener failed:', error);
        emit({
          user,
          role: null,
          schoolId: SCHOOL_ID,
          staffProfile: null,
          loading: false,
          error: 'Could not read your staff record. Ask an administrator to check your access.',
        });
      }
    );
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  refCount += 1;
  if (refCount === 1) start();

  return () => {
    listeners.delete(listener);
    refCount -= 1;
    if (refCount === 0) {
      dropProfile();
      stopAuth?.();
      stopAuth = null;
      current = INITIAL;
    }
  };
}

function getSnapshot(): AuthState {
  return current;
}

const ACCESS_MATRIX: Record<string, UserRole[]> = {
  dashboard: ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'BURSAR', 'VIEWER'],
  students: ['ADMIN', 'TEACHER'],
  finance: ['ADMIN', 'ACCOUNTANT', 'BURSAR'],
  canteen: ['ADMIN', 'ACCOUNTANT', 'BURSAR'],
  academics: ['ADMIN', 'TEACHER'],
  staff: ['ADMIN'],
  settings: ['ADMIN'],
  themeStudio: ['ADMIN'],
  attendance: ['ADMIN', 'TEACHER'],
  assets: ['ADMIN', 'ACCOUNTANT', 'BURSAR'],
  reports: ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'BURSAR'],
  audit: ['ADMIN', 'ACCOUNTANT', 'BURSAR'],
  analytics: ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'BURSAR'],
  transport: ['ADMIN', 'BURSAR'],
  hostel: ['ADMIN', 'BURSAR'],
  timetable: ['ADMIN', 'TEACHER'],
  communications: ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'BURSAR'],
};

export function useAuth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const hasPermission = useCallback(
    (requiredRole: UserRole): boolean => {
      if (!state.role) return false;
      return ROLE_HIERARCHY[state.role] >= ROLE_HIERARCHY[requiredRole];
    },
    [state.role]
  );

  const canAccess = useCallback(
    (module: string): boolean => {
      if (!state.role) return false;
      if (state.role === 'SUPER_ADMIN') return true;
      const allowed = ACCESS_MATRIX[module];
      if (!allowed) return true;
      return allowed.includes(state.role);
    },
    [state.role]
  );

  const signOut = useCallback(async () => {
    // Clear the UI immediately; the auth listener confirms it a moment later.
    emit(SIGNED_OUT);
    await firebaseSignOut(auth);
  }, []);

  return {
    ...state,
    isSuperAdmin: state.role === 'SUPER_ADMIN',
    signOut,
    hasPermission,
    canAccess,
  };
}

/**
 * Google popup sign-in. Popup rather than redirect so the operator keeps the
 * dashboard tab (and any unsaved form) they were working in.
 */
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

/** Human-readable reasons for the failures an operator actually hits. */
export function googleSignInError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/popup-blocked':
      return 'The browser blocked the sign-in window. Allow popups for this site and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled before it finished.';
    case 'auth/unauthorized-domain':
      return 'This domain is not in the Firebase authorised domains list. Add it under Authentication → Settings → Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is disabled for this Firebase project. Enable it under Authentication → Sign-in method.';
    case 'auth/network-request-failed':
      return 'Could not reach Google. Check the connection and try again.';
    default:
      return 'Google sign-in failed. Please try again.';
  }
}
