
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { isSuperAdminEmail } from '@/lib/auth/super-admin';

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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    schoolId: 'school-001',
    staffProfile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({
          user: null,
          role: null,
          schoolId: null,
          staffProfile: null,
          loading: false,
          error: null,
        });
        return;
      }

      try {
        const schoolId = 'school-001'; // Default demo tenant

        // The owner signs in with Google and owns branding across the install.
        // This only picks the UI role; firestore.rules enforces the same list.
        if (isSuperAdminEmail(user.email) && user.emailVerified) {
          setState({
            user,
            role: 'SUPER_ADMIN',
            schoolId,
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

        // Handle official admin or anonymous demo bypass
        if (user.email === 'admin@shule.pro' || user.isAnonymous) {
          // Note: In a real multi-tenant app, roles are NEVER in localStorage.
          // For this demo, we allow the role to be derived from the Auth State or Profile only.
          setState({
            user,
            role: 'ADMIN', // Default for demo/admin email
            schoolId,
            staffProfile: { fullName: 'Institutional Administrator', role: 'ADMIN' },
            loading: false,
            error: null,
          });
          return;
        }

        // Real-time listener for staff profile (Sole source of role truth)
        const profileRef = doc(db, 'schools', schoolId, 'staff', user.uid);
        unsubProfile = onSnapshot(profileRef, (profileSnap) => {
          if (!profileSnap.exists()) {
            setState(prev => ({
              ...prev,
              user,
              role: 'VIEWER', // Fallback for unknown staff
              loading: false,
              error: null,
            }));
            return;
          }

          const profileData = profileSnap.data();
          const declared = profileData.role as UserRole;
          const role: UserRole = declared in ROLE_HIERARCHY ? declared : 'VIEWER';
          setState({
            user,
            role,
            schoolId,
            staffProfile: profileData,
            loading: false,
            error: null,
          });
        });
      } catch (error) {
        console.error('[AUTH] Profile fetch failed:', error);
        setState(prev => ({ ...prev, loading: false, error: 'Auth verification failed' }));
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

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
        analytics: ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'BURSAR'],
        transport: ['ADMIN', 'BURSAR'],
        hostel: ['ADMIN', 'BURSAR'],
        timetable: ['ADMIN', 'TEACHER'],
        communications: ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'BURSAR'],
      };

      const allowedRoles = ACCESS_MATRIX[module];
      if (!allowedRoles) return true;

      return allowedRoles.includes(state.role);
    },
    [state.role]
  );

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

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
