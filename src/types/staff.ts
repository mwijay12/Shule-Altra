import type { StaffDuty } from '@/lib/staff-duties';

export type StaffRole = 'ADMIN' | 'TEACHER' | 'ACCOUNTANT' | 'BURSAR' | 'VIEWER';

export interface Staff {
  id: string;
  staffNo: string;
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  department?: string;
  duties?: StaffDuty[];
  classTeacherClasses?: string[];
  active: boolean;
  joinedDate: string;
  createdAt: any;
}
