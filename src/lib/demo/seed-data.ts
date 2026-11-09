/**
 * @fileOverview Deterministic demo dataset for the Shule Altra offline demo.
 *
 * The dataset models a realistic Tanzanian secondary school
 * (Mwalimu Nyerere Secondary School, Kinondoni, Dar es Salaam) with a full
 * academic year of students, staff, NECTA grades, fee ledger, attendance,
 * boarding, transport, canteen and inventory records.
 *
 * Everything is generated from a fixed seed so the demo looks identical on
 * every machine and every refresh.
 */

import {
  FEMALE_FIRST_NAMES,
  LAST_NAMES,
  MALE_FIRST_NAMES,
  SUBJECTS_SECONDARY,
} from '@/data/fixtures/tanzanian-names';
import { DemoTimestamp } from './timestamp';
import { ACADEMIC_LEVEL, DEFAULT_SCHOOL_TYPE, O_LEVEL_CLASSES } from '@/lib/academics/config';

// v5 retires the mixed primary/secondary demo. Old caches are reseeded automatically.
export const DEMO_SCHEMA_VERSION = 6;
export const DEMO_SCHOOL_ID = 'school-001';

export interface DemoDataset {
  [path: string]: Record<string, any>;
}

/* -------------------------------------------------------------------------- */
/*  Deterministic helpers                                                      */
/* -------------------------------------------------------------------------- */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One seeded generator for the whole school.
 *
 * It used to live at module scope and simply keep advancing, so two calls in
 * the same process produced two different schools, a preview in the mail room
 * could promise 97 recipients and the send then hit 91. `buildDemoDataset()`
 * now rewinds the seed, which makes the demo deterministic: same names, same
 * balances, same counts, every build.
 */
const SEED = 20260406;
let rand = mulberry32(SEED);

const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (probability: number) => rand() < probability;

const daysAgo = (days: number) => DemoTimestamp.fromMillis(Date.now() - days * 86_400_000);
const minutesAgo = (minutes: number) => DemoTimestamp.fromMillis(Date.now() - minutes * 60_000);

const phone = () => `+255 7${between(1, 8)}${between(10, 99)} ${between(100, 999)} ${between(100, 999)}`;

const pad = (value: number, size = 3) => String(value).padStart(size, '0');

/** Lightweight generated portrait so the roster looks alive without photos. */
const avatarFor = (name: string) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const hue = (name.charCodeAt(0) * 37 + name.length * 11) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="26" fill="hsl(${hue},52%,42%)"/><text x="50" y="63" font-size="36" fill="white" text-anchor="middle" font-family="sans-serif" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const usedNames = new Set<string>();

const studentName = (gender: 'Male' | 'Female') => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const first = gender === 'Male' ? pick(MALE_FIRST_NAMES) : pick(FEMALE_FIRST_NAMES);
    const middle = pick(MALE_FIRST_NAMES);
    const last = pick(LAST_NAMES);
    if (first === middle) continue;
    const candidate = `${first} ${middle} ${last}`.toUpperCase();
    if (usedNames.has(candidate)) continue;
    usedNames.add(candidate);
    return candidate;
  }
  const fallback = `${pick(gender === 'Male' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES)} ${pick(LAST_NAMES)} ${usedNames.size}`.toUpperCase();
  usedNames.add(fallback);
  return fallback;
};

/* -------------------------------------------------------------------------- */
/*  Reference data                                                             */
/* -------------------------------------------------------------------------- */

const FEES_BY_CLASS: Record<string, number> = {
  'Form 1': 450_000,
  'Form 2': 450_000,
  'Form 3': 600_000,
  'Form 4': 600_000,
};

const HOSTELS = [
  { name: 'Kilimanjaro Wing', warden: 'Mwl. Elizabeth Mushi', rooms: 24, block: 'Block A', capacity: 96 },
  { name: 'Serengeti Wing', warden: 'Mwl. Hamisi Msuya', rooms: 20, block: 'Block B', capacity: 80 },
  { name: 'Lake Victoria Wing', warden: 'Mwl. Grace Ndosi', rooms: 18, block: 'Block C', capacity: 72 },
  { name: 'Zanzibar Wing', warden: 'Mwl. Salum Kivuyo', rooms: 16, block: 'Block D', capacity: 64 },
  { name: 'Ruaha Wing', warden: 'Mwl. Tumaini Mrema', rooms: 14, block: 'Block E', capacity: 56 },
];

const ROUTES = [
  { name: 'Mbezi Beach - Kawe', driver: 'Bakari Said', phone: '0712 333 444', vehicle: 'T 442 ABC' },
  { name: 'Kijitonyama - Sinza', driver: 'John Mrema', phone: '0754 111 222', vehicle: 'T 119 XYZ' },
  { name: 'Posta - Kariakoo', driver: 'Athumani Juma', phone: '0765 877 001', vehicle: 'T 908 KLM' },
  { name: 'Mbagala - Temeke', driver: 'Peter Mwakalinga', phone: '0784 552 118', vehicle: 'T 771 MNO' },
  { name: 'Ubungo - Kimara', driver: 'Salum Kizinga', phone: '0742 660 913', vehicle: 'T 330 PQR' },
];

const STAFF_SEED = [
  { id: 'demo-admin', fullName: 'DR. JOSEPHAT MWAKALINGA', role: 'ADMIN', department: 'Administration', title: 'Head Master', email: 'admin@shule.pro' },
  { id: 'demo-teacher', fullName: 'MWL. NEEMA KESSY', role: 'TEACHER', department: 'Sciences', title: 'Academic Master', email: 'teacher@shule.pro' },
  { id: 'demo-bursar', fullName: 'CPA. ABDULRAZAQ MTENGA', role: 'BURSAR', department: 'Accounts', title: 'Bursar', email: 'bursar@shule.pro' },
  { id: 'demo-accountant', fullName: 'BI. REHEMA SHAYO', role: 'ACCOUNTANT', department: 'Accounts', title: 'Accounts Officer', email: 'accounts@shule.pro' },
  { id: 'staff-005', fullName: 'MWL. EMMANUEL KOMBA', role: 'TEACHER', department: 'Mathematics', title: 'Senior Teacher', email: 'e.komba@mnyerere.sc.tz' },
  { id: 'staff-006', fullName: 'MWL. AGNES KIMARO', role: 'TEACHER', department: 'Languages', title: 'Kiswahili Master', email: 'a.kimaro@mnyerere.sc.tz' },
  { id: 'staff-007', fullName: 'MWL. PATRICK LYIMO', role: 'TEACHER', department: 'Humanities', title: 'Geography Master', email: 'p.lyimo@mnyerere.sc.tz' },
  { id: 'staff-008', fullName: 'MWL. ZAINAB ALLY', role: 'TEACHER', department: 'Sciences', title: 'Chemistry Mistress', email: 'z.ally@mnyerere.sc.tz' },
  { id: 'staff-009', fullName: 'MWL. DEOGRATIUS MUSHI', role: 'TEACHER', department: 'Sciences', title: 'Physics Master', email: 'd.mushi@mnyerere.sc.tz' },
  { id: 'staff-010', fullName: 'MWL. UPENDO MATERU', role: 'TEACHER', department: 'Humanities', title: 'History Mistress', email: 'u.materu@mnyerere.sc.tz' },
  { id: 'staff-011', fullName: 'MWL. FRANK SHAYO', role: 'TEACHER', department: 'Business', title: 'Commerce Master', email: 'f.shayo@mnyerere.sc.tz' },
  { id: 'staff-012', fullName: 'MWL. LIGHTNESS KIVUYO', role: 'TEACHER', department: 'Languages', title: 'English Mistress', email: 'l.kivuyo@mnyerere.sc.tz' },
  { id: 'staff-013', fullName: 'MWL. SAID NGOWI', role: 'TEACHER', department: 'Mathematics', title: 'Mathematics Master', email: 's.ngowi@mnyerere.sc.tz' },
  { id: 'staff-014', fullName: 'BI. HAPPINESS SANARE', role: 'BURSAR', department: 'Accounts', title: 'Fees Clerk', email: 'h.sanare@mnyerere.sc.tz' },
  { id: 'staff-015', fullName: 'MWL. GODFREY URIO', role: 'TEACHER', department: 'Sciences', title: 'Biology Master', email: 'g.urio@mnyerere.sc.tz' },
  { id: 'staff-016', fullName: 'MWL. ASHA MWANGOSI', role: 'TEACHER', department: 'Humanities', title: 'Civics Mistress', email: 'a.mwangosi@mnyerere.sc.tz' },
];

const ASSET_CATALOGUE = [
  { name: 'HP ProBook 450 Laptop', category: 'ICT Equipment', location: 'Computer Lab A' },
  { name: 'Epson EB-X51 Projector', category: 'ICT Equipment', location: 'Form 4 Classroom' },
  { name: 'Laboratory Microscope (Olympus)', category: 'Laboratory', location: 'Biology Lab' },
  { name: 'Chemistry Reagent Cabinet', category: 'Laboratory', location: 'Chemistry Lab' },
  { name: 'Dell PowerEdge Server Cabinet', category: 'ICT Equipment', location: 'Server Room' },
  { name: 'Wooden Dual Desk (Student)', category: 'Furniture', location: 'Form 2 Classroom' },
  { name: 'Staff Office Desk', category: 'Furniture', location: 'Administration Block' },
  { name: 'Water Pump Generator 5KVA', category: 'Machinery', location: 'Utility Yard' },
  { name: 'Samsung 55" Interactive Board', category: 'ICT Equipment', location: 'Science Auditorium' },
  { name: 'Library Steel Bookshelf', category: 'Furniture', location: 'Library' },
  { name: 'Sewing Machine (Industrial)', category: 'Machinery', location: 'Home Economics Room' },
  { name: 'School Bus T 442 ABC', category: 'Vehicle', location: 'Fleet Yard' },
  { name: 'First Aid Station Kit', category: 'Safety', location: 'Sick Bay' },
  { name: 'Solar Inverter 3KW', category: 'Machinery', location: 'Block C Roof' },
  { name: 'Printer HP LaserJet M404', category: 'ICT Equipment', location: 'Accounts Office' },
  { name: 'Canteen Deep Freezer', category: 'Kitchen', location: 'Canteen' },
  { name: 'Fire Extinguisher (CO2)', category: 'Safety', location: 'Dormitory Block A' },
  { name: 'Public Address System', category: 'ICT Equipment', location: 'Assembly Hall' },
];

const CANTEEN_ITEMS = [
  { item: 'Balanced lunch', amount: 2500 },
  { item: 'Healthy snack', amount: 1200 },
  { item: 'Chapati & Beans Plate', amount: 1800 },
  { item: 'Fresh Fruit Bowl', amount: 900 },
  { item: 'Milk Tea + Mandazi', amount: 700 },
  { item: 'Rice & Beef Stew', amount: 3000 },
  { item: 'Bottled Water 500ml', amount: 500 },
  { item: 'School Exercise Book', amount: 1500 },
];

const PETTY_CASH = [
  { department: 'Administration', category: 'Stationery', description: 'A4 printing paper (10 reams)' },
  { department: 'Sciences', category: 'Laboratory', description: 'Chemistry reagents restock' },
  { department: 'Accounts', category: 'Transport', description: 'Bank deposit runs (Dar es Salaam)' },
  { department: 'Boarding', category: 'Food', description: 'Fresh vegetables — Monday supply' },
  { department: 'Sports', category: 'Equipment', description: 'Two footballs for inter-house games' },
  { department: 'Administration', category: 'Utilities', description: 'LUKU token top-up — staff office' },
  { department: 'ICT', category: 'Maintenance', description: 'Network switch replacement' },
  { department: 'Boarding', category: 'Hygiene', description: 'Cleaning supplies for dormitories' },
  { department: 'Sciences', category: 'Laboratory', description: 'Microscope slide covers' },
  { department: 'Library', category: 'Books', description: 'NECTA past paper booklets' },
];

/* -------------------------------------------------------------------------- */
/*  Generators                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The demo school's identity. Exported so the printable generators stamp the
 * same school the dashboard shows, they used to fall back to the generic
 * Shule Altra letterhead, which named a different school on every sample.
 */
export function demoIdentity(): Record<string, any> {
  return buildIdentity();
}

function buildIdentity(): Record<string, any> {
  return {
    name: 'MWALIMU NYERERE SECONDARY SCHOOL',
    shortName: 'Mwalimu Nyerere',
    systemName: 'Shule Altra',
    centerId: 'SD-2026-0421',
    region: 'Dar es Salaam',
    district: 'Kinondoni',
    address: 'Plot 45, Ali Hassan Mwinyi Road, Kinondoni',
    contactPhone: '+255 754 123 456',
    contactEmail: 'info@mnyerere.sc.tz',
    tiers: [...O_LEVEL_CLASSES],
    academicLevel: ACADEMIC_LEVEL,
    type: DEFAULT_SCHOOL_TYPE,
    logo: '',
    demoMode: true,
    updatedAt: daysAgo(3),
  };
}

function buildStudents(): {
  records: Array<{ path: string; data: Record<string, any> }>;
  summary: Array<{ id: string; name: string; className: string; balance: number; totalPaid: number; expected: number; type: string; phone: string; route?: string }>;
} {
  const records: Array<{ path: string; data: Record<string, any> }> = [];
  const summary: Array<{ id: string; name: string; className: string; balance: number; totalPaid: number; expected: number; type: string; phone: string; route?: string }> = [];

  const classWeights = O_LEVEL_CLASSES.map((className, index) => ({
    className,
    count: [36, 38, 38, 38][index],
  }));

  let index = 0;
  classWeights.forEach(({ className, count }) => {
    for (let i = 0; i < count; i += 1) {
      index += 1;
      const gender: 'Male' | 'Female' = chance(0.5) ? 'Male' : 'Female';
      const name = studentName(gender);
      const id = `ALT-2026-${pad(index)}`;
      const boarder = chance(0.68);
      const form = Number(className.replace('Form ', ''));
      const hostel = boarder ? pick(HOSTELS).name : undefined;
      const route = boarder ? undefined : pick(ROUTES).name;

      const expected = FEES_BY_CLASS[className] || 450_000;
      const arrears = chance(0.22) ? between(5, 15) * 10_000 : 0;
      const paidRatio = chance(0.42) ? 1 : 0.25 + rand() * 0.7;
      const totalPaid = Math.min(expected + arrears, Math.round((expected * paidRatio) / 1000) * 1000);
      const balance = Math.max(expected + arrears - totalPaid, 0);
      const paymentStatus = balance <= 0 ? 'CLEARED' : totalPaid > 0 ? 'PARTIAL' : 'PENDING';

      const attendanceRoll = rand();
      const attendanceStatus = attendanceRoll > 0.96 ? 'Absent' : attendanceRoll > 0.92 ? 'Late' : 'Present';

      const data = {
        id,
        name,
        searchName: name,
        class: className,
        type: boarder ? 'Boarder' : 'Day',
        gender,
        dateOfBirth: `${2013 - form + between(0, 1)}-${pad(between(1, 12), 2)}-${pad(between(1, 28), 2)}`,
        guardianName: `${pick(MALE_FIRST_NAMES)} ${pick(LAST_NAMES)}`.toUpperCase(),
        guardianPhone: phone(),
        contact: phone(),
        enrollmentDate: `2026-01-${pad(between(6, 20), 2)}`,
        status: 'Active',
        balance,
        totalFeesExpected: expected,
        totalPaid,
        arrears,
        paymentStatus,
        conductPoints: between(78, 100),
        photoUrl: avatarFor(name),
        attendanceStatus,
        lastAttendanceUpdate: '08:15',
        hostel: hostel || '',
        route: route || '',
        academicYear: '2026',
        createdAt: daysAgo(between(30, 120)),
        updatedAt: daysAgo(between(0, 20)),
      };

      records.push({ path: `schools/${DEMO_SCHOOL_ID}/students/${id}`, data });
      summary.push({ id, name, className, balance, totalPaid, expected, type: data.type, phone: data.guardianPhone, route });
    }
  });

  return { records, summary };
}

function buildGrades(
  students: Array<{ id: string; name: string; className: string }>
): Array<{ path: string; data: Record<string, any> }> {
  const records: Array<{ path: string; data: Record<string, any> }> = [];
  let counter = 0;

  const subjectSets: Record<string, string[]> = {
    'Form 1': ['Mathematics', 'English', 'Kiswahili', 'Civics', 'Physics', 'Chemistry', 'Biology', 'Geography'],
    'Form 2': ['Mathematics', 'English', 'Kiswahili', 'Civics', 'Physics', 'Chemistry', 'Biology', 'Geography'],
    'Form 3': ['Mathematics', 'English', 'Kiswahili', 'Civics', 'Physics', 'Chemistry', 'Biology', 'History'],
    'Form 4': ['Mathematics', 'English', 'Kiswahili', 'Civics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History', 'Commerce'],
  };

  const exams: Array<{ term: string; examType: string }> = [
    { term: 'Term 1', examType: 'Mid-Term' },
    { term: 'Term 2', examType: 'Annual' },
  ];

  students.forEach((student) => {
    const subjects = subjectSets[student.className] || SUBJECTS_SECONDARY.slice(0, 6);
    exams.forEach(({ term, examType }) => {
      subjects.forEach((subject) => {
        counter += 1;
        // Stable per-student ability so rankings look believable
        const ability = 45 + (student.name.charCodeAt(0) % 35);
        const score = Math.max(18, Math.min(99, Math.round(ability + (rand() * 30 - 15))));
        records.push({
          path: `schools/${DEMO_SCHOOL_ID}/grades/grade-${pad(counter, 5)}`,
          data: {
            studentId: student.id,
            studentName: student.name,
            class: student.className,
            subject,
            score,
            term,
            examType,
            academicYear: '2026',
            recordedBy: 'Academic office',
            createdAt: daysAgo(examType === 'Annual' ? 18 : 64),
          },
        });
      });
    });

    if (student.className === 'Form 4') {
      subjectSets['Form 4'].forEach((subject) => {
        counter += 1;
        const ability = 45 + (student.name.charCodeAt(0) % 35);
        const score = Math.max(20, Math.min(99, Math.round(ability + (rand() * 26 - 13))));
        records.push({
          path: `schools/${DEMO_SCHOOL_ID}/grades/grade-${pad(counter, 5)}`,
          data: {
            studentId: student.id,
            studentName: student.name,
            class: student.className,
            subject,
            score,
            term: 'Term 2',
            examType: 'Mock',
            academicYear: '2026',
            recordedBy: 'Academic office',
            createdAt: daysAgo(9),
          },
        });
      });
    }
  });

  return records;
}

function buildTransactions(
  students: Array<{ id: string; name: string; className: string; balance: number; totalPaid: number }>
): Array<{ path: string; data: Record<string, any> }> {
  const records: Array<{ path: string; data: Record<string, any> }> = [];
  const feeTypes = ['Tuition', 'Boarding', 'Transport', 'Meals', 'Exam Fee', 'Uniform'];
  const methods = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Bank Transfer', 'Cash', 'Control Number'];

  const paying = students.filter((student) => student.totalPaid > 0);

  for (let i = 0; i < 140; i += 1) {
    const student = pick(paying);
    const roll = rand();
    const status = roll > 0.94 ? 'Disputed' : roll > 0.78 ? 'Pending' : 'Verified';
    const amount = between(5, 60) * 10_000;
    const createdAt = minutesAgo(between(30, 60 * 24 * 45));
    const controlNumber = `CP-2026-${between(10_000_000, 99_999_999)}`;

    records.push({
      path: `schools/${DEMO_SCHOOL_ID}/transactions/tx-${pad(i + 1, 4)}`,
      data: {
        id: `tx-${pad(i + 1, 4)}`,
        controlNumber,
        transactionReference: `${pick(['MPESA', 'TIGO', 'AIRTEL', 'CRDB', 'NMB'])}-${between(100_000, 999_999)}`,
        studentId: student.id,
        studentName: student.name,
        amount,
        feeType: pick(feeTypes),
        paymentMethod: pick(methods),
        status,
        disputed: status === 'Disputed',
        reconciled: status === 'Verified',
        currency: 'TZS',
        academicYear: 2026,
        recordedBy: chance(0.5) ? 'Accounts office' : 'ClickPesa',
        deviceInfo: 'Demo Terminal',
        notes: status === 'Disputed' ? 'Awaiting bank statement verification' : '',
        createdAt,
        reconciledAt: status === 'Verified' ? createdAt : null,
        expiresAt: DemoTimestamp.fromMillis(createdAt.toMillis() + 7 * 86_400_000),
        metadata: { class: student.className },
      },
    });
  }

  return records;
}

function buildAttendance(
  students: Array<{ id: string; name: string; className: string }>
): Array<{ path: string; data: Record<string, any> }> {
  const records: Array<{ path: string; data: Record<string, any> }> = [];
  const today = new Date();
  let counter = 0;

  for (let dayOffset = 0; dayOffset < 6; dayOffset += 1) {
    const date = new Date(today.getTime() - dayOffset * 86_400_000);
    const isoDate = date.toISOString().slice(0, 10);
    students.forEach((student) => {
      counter += 1;
      const roll = rand();
      const status = roll > 0.95 ? 'Absent' : roll > 0.9 ? 'Late' : 'Present';
      records.push({
        path: `schools/${DEMO_SCHOOL_ID}/attendance/att-${pad(counter, 6)}`,
        data: {
          studentId: student.id,
          studentName: student.name,
          class: student.className,
          date: isoDate,
          status,
          recordedBy: 'Front desk',
          createdAt: DemoTimestamp.fromMillis(date.getTime()),
        },
      });
    });
  }

  return records;
}

function buildStaff(): Array<{ path: string; data: Record<string, any> }> {
  return STAFF_SEED.map((member, index) => ({
    path: `schools/${DEMO_SCHOOL_ID}/staff/${member.id}`,
    data: {
      id: member.id,
      staffNo: `ALT-STF-2026-${pad(index + 1)}`,
      fullName: member.fullName,
      email: member.email.toLowerCase(),
      phone: phone(),
      role: member.role,
      department: member.department,
      title: member.title,
      active: index === 13 ? false : true,
      joinedDate: `20${between(12, 24)}-0${between(1, 9)}-${pad(between(1, 28), 2)}`,
      createdAt: daysAgo(between(30, 400)),
    },
  }));
}

function buildHostels(): Array<{ path: string; data: Record<string, any> }> {
  return HOSTELS.map((hostel, index) => ({
    path: `schools/${DEMO_SCHOOL_ID}/hostels/${['kilimanjaro', 'serengeti', 'victoria', 'zanzibar', 'ruaha'][index]}`,
    data: {
      name: hostel.name,
      type: index % 2 === 0 ? 'Boys' : 'Girls',
      capacity: hostel.capacity,
      warden: hostel.warden,
      rooms: hostel.rooms,
      block: hostel.block,
      status: 'Operational',
      createdAt: daysAgo(240),
    },
  }));
}

function buildRoutes(students: Array<{ type: string; route?: string }>): Array<{ path: string; data: Record<string, any> }> {
  return ROUTES.map((route, index) => ({
    path: `schools/${DEMO_SCHOOL_ID}/routes/route-${pad(index + 1, 2)}`,
    data: {
      name: route.name,
      driver: route.driver,
      phone: route.phone,
      vehicle: route.vehicle,
      students: students.filter((student) => student.type === 'Day' && student.route === route.name).length,
      capacity: between(48, 56),
      status: index === 4 ? 'Standby' : 'Active',
      departureTime: `${pad(between(5, 6), 2)}:${pick(['15', '30', '45'])} AM`,
      createdAt: daysAgo(180),
    },
  }));
}

function buildAssets(): Array<{ path: string; data: Record<string, any> }> {
  return ASSET_CATALOGUE.map((asset, index) => ({
    path: `schools/${DEMO_SCHOOL_ID}/assets/asset-${pad(index + 1, 3)}`,
    data: {
      name: asset.name,
      category: asset.category,
      location: asset.location,
      assetTag: `SD-2026-${pad(index + 1, 4)}`,
      qrCodeValue: `SD2026-${pad(index + 1, 4)}`,
      condition: pick(['New', 'Good', 'Good', 'Fair', 'Needs Repair']),
      status: index === 11 ? 'Under Maintenance' : 'Operational',
      purchasedAt: `20${between(18, 25)}-0${between(1, 9)}-${pad(between(1, 28), 2)}`,
      value: between(5, 350) * 10000,
      createdAt: daysAgo(between(20, 300)),
    },
  }));
}

function buildCanteenSales(
  students: Array<{ id: string; name: string }>
): Array<{ path: string; data: Record<string, any> }> {
  const records: Array<{ path: string; data: Record<string, any> }> = [];
  for (let i = 0; i < 18; i += 1) {
    const student = pick(students);
    const entry = pick(CANTEEN_ITEMS);
    records.push({
      path: `schools/${DEMO_SCHOOL_ID}/canteen_sales/sale-${pad(i + 1, 3)}`,
      data: {
        studentId: student.id,
        studentName: student.name,
        item: entry.item,
        amount: entry.amount,
        createdAt: minutesAgo(between(5, 60 * 30)),
        recordedBy: 'Canteen',
      },
    });
  }
  return records;
}

function buildPettyCash(): Array<{ path: string; data: Record<string, any> }> {
  return PETTY_CASH.map((entry, index) => {
    const amount = between(15, 180) * 1000;
    const status = index % 4 === 0 ? 'Pending' : index === 7 ? 'Rejected' : 'Approved';
    return {
      path: `schools/${DEMO_SCHOOL_ID}/petty_cash/cash-${pad(index + 1, 3)}`,
      data: {
        ...entry,
        amount,
        status,
        date: new Date(Date.now() - index * 86_400_000).toISOString(),
        recordedBy: 'Accounts office',
        approvedBy: status === 'Approved' ? 'CPA. ABDULRAZAQ MTENGA' : '',
        createdAt: daysAgo(index + 1),
      },
    };
  });
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

export function buildDemoDataset(): DemoDataset {
  rand = mulberry32(SEED);
  // The name register is module state too; rewinding the seed without clearing
  // it made the second build of a process skip every name the first had taken
  // and drift into different learners. Reset both, or neither.
  usedNames.clear();
  const dataset: DemoDataset = {};
  const put = (rows: Array<{ path: string; data: Record<string, any> }>) => {
    rows.forEach((row) => {
      dataset[row.path] = row.data;
    });
  };

  const { records: studentRecords, summary: studentSummary } = buildStudents();

  put(studentRecords);
  put(buildStaff());
  put(buildHostels());
  put(buildRoutes(studentSummary));
  put(buildAssets());
  put(
    buildGrades(
      studentSummary.map((student) => ({ id: student.id, name: student.name, className: student.className }))
    )
  );
  put(
    buildTransactions(
      studentSummary.map((student) => ({
        id: student.id,
        name: student.name,
        className: student.className,
        balance: student.balance,
        totalPaid: student.totalPaid,
      }))
    )
  );
  put(
    buildAttendance(
      studentSummary.map((student) => ({ id: student.id, name: student.name, className: student.className }))
    )
  );
  put(buildCanteenSales(studentSummary.map((student) => ({ id: student.id, name: student.name }))));
  put(buildPettyCash());

  dataset[`schools/${DEMO_SCHOOL_ID}/config/identity`] = buildIdentity();
  dataset[`schools/${DEMO_SCHOOL_ID}/config/utilities`] = {
    luku: 'Healthy',
    water: 'Normal Flow',
    hygiene: 'Verified Today',
    generator: 'Standby',
    updatedAt: daysAgo(1),
  };
  dataset[`schools/${DEMO_SCHOOL_ID}/config/integrations`] = {
    n8nWebhookUrl: 'https://n8n.shulealtra.tech/webhook/demo-node',
    n8nEnabled: true,
    smsProvider: 'Beem Africa',
    smsSenderId: 'SHULEALTRA',
    clickpesaEnabled: true,
    paymentGateway: 'ClickPesa',
    updatedAt: daysAgo(2),
  };
  dataset[`schools/${DEMO_SCHOOL_ID}`] = {
    id: DEMO_SCHOOL_ID,
    name: 'MWALIMU NYERERE SECONDARY SCHOOL',
    academicYear: '2026',
    type: DEFAULT_SCHOOL_TYPE,
    academicLevel: ACADEMIC_LEVEL,
    region: 'Dar es Salaam',
    district: 'Kinondoni',
    motto: 'Elimu ni Ufunguo wa Maisha',
    createdAt: daysAgo(400),
  };

  return dataset;
}

/** Number of demo documents (used on the landing / settings page). */
export function demoDatasetSize(): number {
  return Object.keys(buildDemoDataset()).length;
}
