/**
 * @fileOverview Official Financial Transaction Types for Shule Altra.
 */

import { Timestamp } from 'firebase/firestore';

export type TransactionStatus = 'Pending' | 'Verified' | 'Partial' | 'Disputed' | 'Failed';
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'M-Pesa' | 'Tigo Pesa' | 'Airtel Money' | 'Control Number';
export type FeeType = 'Tuition' | 'Transport' | 'Boarding' | 'Exam Fee' | 'Uniform' | 'Meals' | 'Other';

export interface Transaction {
  id: string;
  controlNumber: string;
  referenceType?: 'internal' | 'provider';
  studentId: string;
  studentName: string;
  class: string;
  amount: number;
  currency: string;
  feeType: FeeType;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  recordedBy: string;
  createdAt: Timestamp;
  reconciled: boolean;
  reconciledAt?: Timestamp;
  reconciledBy?: string;
  transactionReference?: string;
  integrityHash?: string;
  notes?: string;
}
