
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  type User 
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const { auth, firestore: db } = initializeFirebase();

export type UserRole = 'ADMIN' | 'TEACHER' | 'ACCOUNTANT' | 'BURSAR' | 'VIEWER';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  schoolId: string | null;
  staffProfile: any | null;
  loading: boolean;
  error: string | null;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
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
          setState({
            user,
            role: profileData.role as UserRole,
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

      const ACCESS_MATRIX: Record<string, UserRole[]> = {
        dashboard: ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'BURSAR', 'VIEWER'],
        students: ['ADMIN', 'TEACHER'],
        finance: ['ADMIN', 'ACCOUNTANT', 'BURSAR'],
        canteen: ['ADMIN', 'ACCOUNTANT', 'BURSAR'],
        academics: ['ADMIN', 'TEACHER'],
        staff: ['ADMIN'],
        settings: ['ADMIN'],
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
    signOut,
    hasPermission,
    canAccess,
  };
}
