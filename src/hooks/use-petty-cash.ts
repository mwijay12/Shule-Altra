
'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, where } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { z } from 'zod';

const ExpenseSchema = z.object({
  department: z.string(),
  category: z.string(),
  description: z.string().min(3),
  amount: z.number().positive(),
  recordedBy: z.string(),
});

export function usePettyCash(schoolId: string = 'school-001') {
  const db = useFirestore();

  const expensesQuery = useMemoFirebase(() => 
    query(
      collection(db, 'schools', schoolId, 'petty_cash'),
      orderBy('date', 'desc')
    ), [db, schoolId]
  );

  const { data: expenses, isLoading } = useCollection(expensesQuery);

  const stats = useMemo(() => {
    if (!expenses) return { totalApproved: 0, pendingCount: 0, deptSpending: {} as Record<string, number> };
    
    return expenses.reduce((acc, curr) => {
      if (curr.status === 'Approved') {
        acc.totalApproved += curr.amount || 0;
        acc.deptSpending[curr.department] = (acc.deptSpending[curr.department] || 0) + curr.amount;
      } else if (curr.status === 'Pending') {
        acc.pendingCount += 1;
      }
      return acc;
    }, { totalApproved: 0, pendingCount: 0, deptSpending: {} as Record<string, number> });
  }, [expenses]);

  const addExpense = (input: any) => {
    const data = ExpenseSchema.parse(input);
    
    // Approval logic
    let status = 'Pending';
    if (data.amount < 50000) status = 'Approved';

    return addDocumentNonBlocking(collection(db, 'schools', schoolId, 'petty_cash'), {
      ...data,
      status,
      date: new Date().toISOString(),
      createdAt: serverTimestamp(),
      schoolId
    });
  };

  const updateStatus = (id: string, status: 'Approved' | 'Rejected', adminEmail: string) => {
    updateDocumentNonBlocking(doc(db, 'schools', schoolId, 'petty_cash', id), {
      status,
      approvedBy: adminEmail,
      updatedAt: serverTimestamp()
    });
  };

  return {
    expenses: expenses || [],
    isLoading,
    stats,
    addExpense,
    updateStatus
  };
}
