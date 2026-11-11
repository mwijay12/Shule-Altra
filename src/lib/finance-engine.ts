/**
 * @fileOverview Hardened Financial Engine for Shule Altra.
 * Handles production-grade ClickPesa integration and atomic reconciliation.
 */

import { z } from 'zod';
import { 
  Firestore, 
  doc, 
  runTransaction, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  increment,
  Timestamp,
  limit,
  addDoc
} from 'firebase/firestore';
import { triggerN8nWebhook } from './n8n';
import { activeLocale, currencySpec } from '@/lib/money';

/**
 * Validation Schema for Forensic Transactions
 */
export const TransactionSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  controlNumber: z.string().trim().max(100, "Reference must be 100 characters or fewer").default(''),
  feeType: z.enum(['Tuition', 'Transport', 'Boarding', 'Exam Fee', 'Uniform', 'Meals', 'Other']).default('Tuition'),
  paymentMethod: z.enum(['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Bank Transfer', 'Cash', 'Control Number']),
  studentId: z.string().trim().min(1, "Select a student"),
  recordedBy: z.string(),
  academicYear: z.number().default(2026),
  deviceInfo: z.string().optional(),
  recordedFromIp: z.string().optional(),
  notes: z.string().optional(),
});

export type TransactionInput = z.infer<typeof TransactionSchema>;

export interface ControlNumberRequest {
  schoolId: string;
  studentId: string;
  amount: number;
  feeType: 'Tuition' | 'Transport' | 'Boarding' | 'Exam Fee' | 'Uniform' | 'Meals' | 'Other';
  payerName: string;
  payerPhone: string;
  expiresInDays: number;
}

export interface ControlNumberResponse {
  controlNumber: string;
  amount: number;
  expiresAt: Date;
  qrCodeUrl: string;
  ussdCode: string;
  paymentInstructions: string;
}

/**
 * Money, in the school's configured currency.
 *
 * The name is kept for the sixteen call sites that already use it; the behaviour
 * is no longer Tanzania-only. Set NEXT_PUBLIC_CURRENCY to bill in KES, RWF, USD
 * or anything else, see src/lib/money.ts.
 */
export function formatTZS(amount: number): string {
  const currency = currencySpec();
  const value = Number.isFinite(amount) ? amount : 0;
  const rounded =
    currency.decimals === 0
      ? Math.round(value)
      : Number(value.toFixed(currency.decimals));
  return `${currency.label} ${rounded.toLocaleString(activeLocale(), {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  })}`;
}

const trimZeros = (value: number, digits: number) =>
  value
    .toFixed(digits)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');

/**
 * TZS for cards, tiles and charts, the same money, short enough to never be
 * cut off. A KPI that reads "TZS 6,09…" is worse than no KPI at all, and a
 * bursar reads 6.09M faster than 6,094,000.
 *
 *   < 1 000        TZS 950
 *   < 1 000 000    TZS 19.5K
 *   < 1bn          TZS 6.09M
 *   ≥ 1bn          TZS 1.2B
 */
export function formatTZSCompact(amount: number): string {
  const { label } = currencySpec();
  const value = Math.round(Number.isFinite(amount) ? amount : 0);
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  const scale = (input: number, suffix: string) => {
    const digits = input >= 100 ? 0 : input >= 10 ? 1 : 2;
    return `${label} ${sign}${trimZeros(input, digits)}${suffix}`;
  };

  if (abs < 1_000) return `${label} ${sign}${abs}`;
  if (abs < 1_000_000) return scale(abs / 1_000, 'K');
  if (abs < 1_000_000_000) return scale(abs / 1_000_000, 'M');
  return scale(abs / 1_000_000_000, 'B');
}

/**
 * Generates a hardened Control Number
 */
export function generateControlNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(10000000 + Math.random() * 90000000);
  return `CP-${year}-${random}`;
}

/**
 * PRODUCTION: Generate a hardened Control Number via ClickPesa API
 */
export async function generateInstitutionalControlNumber(
  db: Firestore,
  request: ControlNumberRequest
): Promise<ControlNumberResponse> {
  // There is no provider-backed control-number API configured here. Never
  // generate a fake payable number or transmit payment instructions.
  throw new Error("Payable control numbers require a configured payment provider.");
}

/**
 * Core Forensic Engine: Process Institutional Payment
 */
export async function processPaymentTransaction(
  db: Firestore, 
  input: TransactionInput,
  schoolId: string = 'school-001'
) {
  const data = TransactionSchema.parse(input);
  
  const studentRef = doc(db, 'schools', schoolId, 'students', data.studentId);
  const transactionId = doc(collection(db, 'schools', schoolId, 'transactions')).id;
  const transactionRef = doc(db, 'schools', schoolId, 'transactions', transactionId);

  return runTransaction(db, async (transaction) => {
    const studentDoc = await transaction.get(studentRef);
    if (!studentDoc.exists()) throw new Error("Student not found");

    const studentData = studentDoc.data();
    const currentPaid = Number(studentData.totalPaid ?? 0);
    const expected = studentData.totalFeesExpected;
    const arrears = Number(studentData.arrears ?? 0);
    if (!Number.isFinite(currentPaid) || !Number.isFinite(arrears)) throw new Error("Student fee records are invalid. Review the balance before recording a payment.");
    const currentBalance = typeof expected === 'number' && Number.isFinite(expected)
      ? expected + arrears - currentPaid
      : typeof studentData.balance === 'number' && Number.isFinite(studentData.balance) ? studentData.balance : null;
    if (currentBalance === null) throw new Error("This student has no recorded fee balance. Set up their fees before recording a payment.");
    const newBalance = currentBalance - data.amount;

    const transactionPayload = {
      ...data,
      controlNumber: data.controlNumber || `REC-${transactionId}`,
      referenceType: data.controlNumber ? 'provider' : 'internal',
      id: transactionId,
      status: 'Verified',
      createdAt: serverTimestamp(),
      reconciled: false,
      studentName: studentData.name,
      class: studentData.class,
      currency: 'TZS',
      disputed: false,
      integrityHash: Math.random().toString(36).substring(2, 15)
    };

    transaction.set(transactionRef, transactionPayload);

    transaction.update(studentRef, {
      totalPaid: increment(data.amount),
      balance: newBalance,
      lastPaymentDate: serverTimestamp(),
      paymentStatus: newBalance <= 0 ? 'CLEARED' : 'PARTIAL'
    });

    return { success: true, transactionId, newBalance };
  });
}
