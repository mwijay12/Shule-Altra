import './dom';

import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase, useCollection, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, doc, query, orderBy, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, getAuth } from 'firebase/auth';
import { useAuth } from '@/hooks/use-auth';
import { useInstitutionalReconciliation, useStudentBalance } from '@/hooks/use-finance';
import { usePettyCash } from '@/hooks/use-petty-cash';
import { useIntegrations } from '@/hooks/use-integrations';

const services = initializeFirebase();
const container = document.getElementById('root')!;
const root = createRoot(container);

function Probe() {
  const auth = useAuth();
  const db = useFirestore();
  const studentsQ = useMemoFirebase(() => query(collection(db, 'schools', 'school-001', 'students'), orderBy('name', 'asc')), [db]);
  const { data: students } = useCollection<any>(studentsQ);
  const identityRef = useMemoFirebase(() => doc(db, 'schools', 'school-001', 'config', 'identity'), [db]);
  const { data: identity } = useDoc<any>(identityRef);
  const finance = useInstitutionalReconciliation();
  const petty = usePettyCash();
  const integrations = useIntegrations();
  const balance = useStudentBalance('ALT-2026-001');

  useEffect(() => {
    (globalThis as any).__state = {
      auth: { role: auth.role, loading: auth.loading, schoolId: auth.schoolId, email: auth.user?.email ?? null, error: auth.error },
      students: students?.length ?? null,
      firstName: students?.[0]?.name ?? null,
      identity: identity?.name ?? null,
      demoMode: identity?.demoMode ?? null,
      finance: { collected: finance.collected, outstanding: finance.outstanding, rate: finance.collectionRate, transactions: finance.transactions.length, pending: finance.pending },
      petty: { expenses: petty.expenses?.length ?? null, totalApproved: petty.stats.totalApproved },
      integrations: { url: integrations.config.n8nWebhookUrl, loading: integrations.loading },
      balance: { balance: balance.balance, paid: balance.totalPaid, history: balance.history.length },
      canAccess: { finance: auth.canAccess('finance'), settings: auth.canAccess('settings'), students: auth.canAccess('students') },
    };
  });

  return null;
}

const flush = async (ms = 120) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
};

async function main() {
  console.log('signed-in user before mount:', getAuth().currentUser);

  await act(async () => {
    root.render(
      <FirebaseProvider firebaseApp={services.firebaseApp} auth={services.auth} firestore={services.firestore}>
        <Probe />
      </FirebaseProvider>
    );
  });
  await flush(300);
  let state = (globalThis as any).__state;
  console.log('1) anonymous-free boot:', JSON.stringify(state.auth));
  console.log('2) registry:', state.students, '| first:', state.firstName, '| identity:', state.identity, '| demoMode:', state.demoMode);
  console.log('3) finance:', JSON.stringify(state.finance));
  console.log('4) petty cash:', JSON.stringify(state.petty));
  console.log('5) integrations:', JSON.stringify(state.integrations));
  console.log('6) student balance:', JSON.stringify(state.balance));

  // --- teacher session ---
  await act(async () => {
    await signInWithEmailAndPassword(services.auth as any, 'teacher@shule.pro', 'demo2026');
  });
  await flush(300);
  state = (globalThis as any).__state;
  console.log('7) teacher session:', JSON.stringify(state.auth), 'access:', JSON.stringify(state.canAccess));

  // --- writes flow through snapshots ---
  await act(async () => {
    const db = services.firestore;
    const created = await addDoc(collection(db, 'schools', 'school-001', 'students'), {
      id: 'ALT-2026-777',
      name: 'ZUHURA TEST NODE',
      class: 'Form 4',
      type: 'Day',
      totalPaid: 100000,
      balance: 350000,
      attendanceStatus: 'Present',
      createdAt: serverTimestamp(),
    });
    await updateDoc(created, { balance: 250000 });
  });
  await flush(300);
  state = (globalThis as any).__state;
  console.log('8) after insert:', state.students, '(expected 151)');

  // --- sign out ---
  await act(async () => {
    await signOut(services.auth as any);
  });
  await flush(250);
  state = (globalThis as any).__state;
  console.log('9) after sign-out:', JSON.stringify(state.auth));

  root.unmount();
  process.exit(0);
}

main().catch((error) => {
  console.error('HARNESS FAILURE', error);
  process.exit(1);
});
