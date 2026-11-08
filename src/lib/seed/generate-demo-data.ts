import { 
  MALE_FIRST_NAMES, 
  FEMALE_FIRST_NAMES, 
  LAST_NAMES, 
  SUBJECTS_SECONDARY, 
  FEE_TYPES, 
  PAYMENT_METHODS 
} from '@/data/fixtures/tanzanian-names';
import { generateControlNumber } from '@/lib/finance-engine';
import { O_LEVEL_CLASSES } from '@/lib/academics/config';
import { Timestamp } from 'firebase/firestore';

const randomFrom = <T>(arr: readonly T[] | T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomPhone = () => {
  const prefixes = ['0754', '0713', '0784', '0655', '0742'];
  return randomFrom(prefixes) + randomInt(100000, 999999);
};

export function generateSchool() {
  return {
    id: 'demo-school-001',
    name: 'Mwalimu Nyerere Secondary School',
    logoUrl: '',
    academicYear: '2026',
    type: 'secondary',
    address: 'Kinondoni, Dar es Salaam',
    phone: '+255 754 123 456',
    email: 'info@mwalimunyerere.sc.tz',
    motto: 'Elimu ni Ufunguo wa Maisha',
    createdAt: new Date()
  };
}

export function generateStaff() {
  const staff = [];
  
  // Head Teacher
  staff.push({
    staffNo: 'ALT-STF-2026-001',
    fullName: `MWALIMU MKUU ${randomFrom(MALE_FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`.toUpperCase(),
    email: 'head.teacher@mwalimunyerere.sc.tz',
    phone: randomPhone(),
    role: 'ADMIN',
    department: 'Administration',
    active: true,
    joinedDate: '2020-01-15'
  });

  // Accountant
  staff.push({
    staffNo: 'ALT-STF-2026-002',
    fullName: `${randomFrom(FEMALE_FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`.toUpperCase(),
    email: 'accounts@mwalimunyerere.sc.tz',
    phone: randomPhone(),
    role: 'ACCOUNTANT',
    department: 'Accounts',
    active: true,
    joinedDate: '2022-03-10'
  });

  // 6 Teachers
  for (let i = 1; i <= 6; i++) {
    const firstName = randomFrom([...MALE_FIRST_NAMES, ...FEMALE_FIRST_NAMES]);
    const lastName = randomFrom(LAST_NAMES);
    staff.push({
      staffNo: `ALT-STF-2026-00${i + 2}`,
      fullName: `${firstName} ${lastName}`.toUpperCase(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@mwalimunyerere.sc.tz`,
      phone: randomPhone(),
      role: 'TEACHER',
      department: randomFrom(SUBJECTS_SECONDARY),
      active: true,
      joinedDate: '2024-01-05'
    });
  }

  return staff;
}

export function generateStudents() {
  const students = [];
  const classes = O_LEVEL_CLASSES;
  
  let idCounter = 1;
  for (const className of classes) {
    for (let i = 0; i < 15; i++) {
      const gender = Math.random() > 0.5 ? 'Male' : 'Female';
      const firstName = randomFrom(gender === 'Male' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES);
      const lastName = randomFrom(LAST_NAMES);
      const name = `${firstName} ${lastName}`.toUpperCase();
      const studentId = `ALT-2026-${String(idCounter).padStart(3, '0')}`;
      
      const formYear = parseInt(className.split(' ')[1]);
      const age = 13 + formYear;
      const birthYear = 2026 - age;

      students.push({
        id: studentId,
        name,
        searchName: name,
        class: className,
        type: Math.random() > 0.4 ? 'Boarder' : 'Day',
        gender,
        dateOfBirth: `${birthYear}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
        guardianName: `${randomFrom(MALE_FIRST_NAMES)} ${lastName}`.toUpperCase(),
        guardianPhone: randomPhone(),
        enrollmentDate: '2026-01-10',
        status: 'Active',
        balance: Math.random() > 0.7 ? randomInt(50000, 350000) : 0,
        conductPoints: randomInt(70, 100),
        photoUrl: ''
      });
      idCounter++;
    }
  }
  return students;
}

const generateTieredScore = (tier: 'top' | 'average' | 'struggling') => {
  if (tier === 'top') return randomInt(65, 98);
  if (tier === 'average') return randomInt(40, 75);
  return randomInt(15, 52);
};

export function generateGrades(students: any[]) {
  const grades: any[] = [];
  students.forEach((student, index) => {
    // Assign a tier based on index to ensure distribution
    let tier: 'top' | 'average' | 'struggling' = 'average';
    if (index % 5 === 0) tier = 'top';
    else if (index % 5 === 4) tier = 'struggling';

    SUBJECTS_SECONDARY.forEach(subject => {
      grades.push({
        studentId: student.id,
        subject,
        score: generateTieredScore(tier),
        examType: 'Annual',
        term: 'Term 2',
        academicYear: '2026',
        createdAt: Timestamp.now()
      });
    });
  });
  return grades;
}

export function generateTransactions(students: any[], staff: any[]) {
  const transactions = [];
  const accountant = staff.find(s => s.role === 'ACCOUNTANT')?.fullName || 'SYSTEM';

  for (let i = 0; i < 45; i++) {
    const student = randomFrom(students);
    const feeType = randomFrom(FEE_TYPES);
    let amount = 0;
    
    switch (feeType) {
      case 'Tuition': amount = randomInt(150000, 500000); break;
      case 'Transport': amount = randomInt(20000, 50000); break;
      case 'Meals': amount = randomInt(30000, 80000); break;
      case 'Uniform': amount = randomInt(25000, 60000); break;
      case 'Examination': amount = randomInt(10000, 25000); break;
      case 'Boarding': amount = randomInt(200000, 400000); break;
    }

    const date = new Date();
    date.setDate(date.getDate() - randomInt(1, 60));

    transactions.push({
      controlNumber: generateControlNumber(),
      studentId: student.id,
      studentName: student.name,
      class: student.class,
      amount,
      feeType,
      status: Math.random() > 0.15 ? 'Verified' : 'Pending',
      paymentMethod: randomFrom(PAYMENT_METHODS),
      recordedBy: accountant,
      createdAt: Timestamp.fromDate(date),
      currency: 'TZS',
      reconciled: true
    });
  }
  return transactions;
}

export function generateAttendance(students: any[]) {
  const attendance: any[] = [];
  const dates = [];
  let curr = new Date();
  
  while (dates.length < 10) {
    if (curr.getDay() !== 0 && curr.getDay() !== 6) {
      dates.push(new Date(curr));
    }
    curr.setDate(curr.getDate() - 1);
  }

  dates.forEach(date => {
    students.forEach(student => {
      const roll = Math.random();
      const status = roll > 0.08 ? 'Present' : roll > 0.03 ? 'Absent' : 'Late';
      attendance.push({
        studentId: student.id,
        date: date.toISOString().split('T')[0],
        status,
        class: student.class,
        recordedBy: 'System Auto-Seed',
        createdAt: Timestamp.now()
      });
    });
  });

  return attendance;
}
