export interface Student {
  id: string;
  name: string;
  searchName: string;
  class: string;
  type: 'Boarder' | 'Day';
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  enrollmentDate: string;
  status: string;
  balance: number;
  conductPoints: number;
  photoUrl: string;
  attendanceStatus?: string;
  lastAttendanceUpdate?: string;
  performance?: string;
  points?: number;
  division?: string;
  totalFeesExpected?: number;
  totalPaid?: number;
  arrears?: number;
  hostel?: string;
  route?: string;
}