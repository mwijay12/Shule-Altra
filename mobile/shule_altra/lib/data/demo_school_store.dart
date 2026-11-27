/// Single-school Shule Altra workspace & EXACT website-parity dataset engine.
///
/// Ports the exact `mulberry32(20260406)` deterministic generator from the web
/// dashboard (`src/lib/demo/seed-data.ts`) so the Flutter app shows the EXACT
/// same 150 O-Level students (`ALT-2026-001` – `ALT-2026-150`), exact fee
/// balances (`TZS 20,247,000` outstanding, `101` boarders, `96.7%` presence),
/// exact top-6 follow-up queue (`FARAJA MUSSA SHAYO · ALT-2026-107`, etc.),
/// 140 ClickPesa/Accounts office ledger entries (`CP-2026-...`), 16 staff,
/// 5 hostel wings, 5 transport routes, 18 inventory assets, canteen POS,
/// petty cash expenses, NECTA O-Level grades, and live audit trail.
library;

import 'package:flutter/foundation.dart';

import 'demo_account.g.dart';
import 'demo_credentials.dart';
import 'learner.dart';

/* -------------------------------------------------------------------------- */
/*  Exact Mulberry32 PRNG matching JavaScript Math.imul & >>> 0               */
/* -------------------------------------------------------------------------- */

class _Mulberry32 {
  _Mulberry32(int seed) : _a = seed & 0xFFFFFFFF;
  int _a;

  static int _imul(int x, int y) {
    final xLo = x & 0xFFFF;
    final xHi = (x >>> 16) & 0xFFFF;
    final yLo = y & 0xFFFF;
    final yHi = (y >>> 16) & 0xFFFF;
    return ((xLo * yLo) + (((xHi * yLo + xLo * yHi) & 0xFFFF) << 16)) & 0xFFFFFFFF;
  }

  double next() {
    _a = (_a + 0x6D2B79F5) & 0xFFFFFFFF;
    var t = _imul(_a ^ (_a >>> 15), _a | 1);
    t = ((t + _imul(t ^ (t >>> 7), t | 61)) & 0xFFFFFFFF) ^ t;
    return ((t ^ (t >>> 14)) & 0xFFFFFFFF) / 4294967296.0;
  }

  T pick<T>(List<T> items) => items[(next() * items.length).floor()];
  int between(int min, int max) => (next() * (max - min + 1)).floor() + min;
  bool chance(double p) => next() < p;
}

/* -------------------------------------------------------------------------- */
/*  Domain Models                                                             */
/* -------------------------------------------------------------------------- */

@immutable
class DemoRoleAccount {
  const DemoRoleAccount({
    required this.uid,
    required this.email,
    required this.fullName,
    required this.role,
    required this.label,
    required this.title,
    required this.department,
    required this.scope,
  });

  final String uid;
  final String email;
  final String fullName;
  final String role;
  final String label;
  final String title;
  final String department;
  final String scope;
}

@immutable
class LearnerExtra {
  const LearnerExtra({
    required this.expectedFee,
    required this.arrears,
    required this.totalPaid,
    required this.conductPoints,
    required this.hostel,
    required this.route,
    required this.lastAttendanceUpdate,
    required this.gender,
  });

  final double expectedFee;
  final double arrears;
  final double totalPaid;
  final int conductPoints;
  final String hostel;
  final String route;
  final String lastAttendanceUpdate;
  final String gender;

  LearnerExtra copyWith({
    double? totalPaid,
    int? conductPoints,
    String? lastAttendanceUpdate,
  }) =>
      LearnerExtra(
        expectedFee: expectedFee,
        arrears: arrears,
        totalPaid: totalPaid ?? this.totalPaid,
        conductPoints: conductPoints ?? this.conductPoints,
        hostel: hostel,
        route: route,
        lastAttendanceUpdate: lastAttendanceUpdate ?? this.lastAttendanceUpdate,
        gender: gender,
      );
}

@immutable
class StaffMember {
  const StaffMember({
    required this.id,
    required this.staffNo,
    required this.fullName,
    required this.role,
    required this.department,
    required this.title,
    required this.email,
    required this.phone,
    required this.active,
  });

  final String id;
  final String staffNo;
  final String fullName;
  final String role;
  final String department;
  final String title;
  final String email;
  final String phone;
  final bool active;
}

@immutable
class FeeTransaction {
  const FeeTransaction({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.className,
    required this.amount,
    required this.feeType,
    required this.paymentMethod,
    required this.controlNumber,
    required this.status,
    required this.recordedBy,
    required this.dateLabel,
    required this.sortOrder,
  });

  final String id;
  final String studentId;
  final String studentName;
  final String className;
  final double amount;
  final String feeType;
  final String paymentMethod;
  final String controlNumber;
  final String status; // Verified, Pending, Disputed
  final String recordedBy;
  final String dateLabel;
  final int sortOrder; // Lower = more recent

  FeeTransaction copyWith({String? status}) => FeeTransaction(
        id: id,
        studentId: studentId,
        studentName: studentName,
        className: className,
        amount: amount,
        feeType: feeType,
        paymentMethod: paymentMethod,
        controlNumber: controlNumber,
        status: status ?? this.status,
        recordedBy: recordedBy,
        dateLabel: dateLabel,
        sortOrder: sortOrder,
      );
}

@immutable
class SchoolAnnouncement {
  const SchoolAnnouncement({
    required this.id,
    required this.title,
    required this.body,
    required this.audience,
    required this.timeLabel,
    required this.unread,
  });

  final String id;
  final String title;
  final String body;
  final String audience;
  final String timeLabel;
  final bool unread;

  SchoolAnnouncement copyWith({bool? unread}) => SchoolAnnouncement(
        id: id,
        title: title,
        body: body,
        audience: audience,
        timeLabel: timeLabel,
        unread: unread ?? this.unread,
      );
}

@immutable
class HostelWing {
  const HostelWing({
    required this.name,
    required this.type,
    required this.warden,
    required this.block,
    required this.rooms,
    required this.capacity,
  });

  final String name;
  final String type;
  final String warden;
  final String block;
  final int rooms;
  final int capacity;
}

@immutable
class TransportRoute {
  const TransportRoute({
    required this.name,
    required this.driver,
    required this.phone,
    required this.vehicle,
    required this.status,
    required this.departureTime,
  });

  final String name;
  final String driver;
  final String phone;
  final String vehicle;
  final String status;
  final String departureTime;
}

@immutable
class SchoolAsset {
  const SchoolAsset({
    required this.tag,
    required this.name,
    required this.category,
    required this.location,
    required this.condition,
    required this.status,
    required this.value,
  });

  final String tag;
  final String name;
  final String category;
  final String location;
  final String condition;
  final String status;
  final double value;
}

@immutable
class CanteenMenuItem {
  const CanteenMenuItem({required this.item, required this.amount});
  final String item;
  final double amount;
}

@immutable
class CanteenSale {
  const CanteenSale({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.item,
    required this.amount,
    required this.timeLabel,
  });

  final String id;
  final String studentId;
  final String studentName;
  final String item;
  final double amount;
  final String timeLabel;
}

@immutable
class PettyCashExpense {
  const PettyCashExpense({
    required this.id,
    required this.department,
    required this.category,
    required this.description,
    required this.amount,
    required this.status,
    required this.dateLabel,
  });

  final String id;
  final String department;
  final String category;
  final String description;
  final double amount;
  final String status;
  final String dateLabel;
}

@immutable
class AuditEntry {
  const AuditEntry({
    required this.actor,
    required this.action,
    required this.target,
    required this.timeLabel,
  });

  final String actor;
  final String action;
  final String target;
  final String timeLabel;
}

@immutable
class NectaDivisionResult {
  const NectaDivisionResult({
    required this.average,
    required this.points,
    required this.division,
  });

  final double average;
  final int points;
  final String division;
}

/// NECTA CSEE O-Level grading logic matching `src/lib/necta-logic.ts`.
abstract final class NectaGrading {
  static const List<String> subjects = <String>[
    'Mathematics',
    'English',
    'Kiswahili',
    'Civics',
    'Physics',
    'Chemistry',
    'Biology',
    'Geography',
    'History',
    'Commerce',
  ];

  static String gradeLetter(int score) {
    if (score >= 75) return 'A';
    if (score >= 65) return 'B';
    if (score >= 45) return 'C';
    if (score >= 30) return 'D';
    return 'F';
  }

  static int gradePoints(int score) {
    if (score >= 75) return 1;
    if (score >= 65) return 2;
    if (score >= 45) return 3;
    if (score >= 30) return 4;
    return 5;
  }

  static NectaDivisionResult evaluate(Map<String, int> scores) {
    if (scores.isEmpty) {
      return const NectaDivisionResult(average: 0, points: 35, division: 'Not graded');
    }
    final values = scores.values.toList();
    final avg = values.reduce((a, b) => a + b) / values.length;
    final pts = values.map(gradePoints).toList()..sort();
    final bestSeven = pts.take(7).toList();
    while (bestSeven.length < 7) {
      bestSeven.add(5);
    }
    final total = bestSeven.reduce((a, b) => a + b);
    final div = switch (total) {
      <= 17 => 'Division I',
      <= 21 => 'Division II',
      <= 25 => 'Division III',
      <= 33 => 'Division IV',
      _ => 'Division 0',
    };
    return NectaDivisionResult(average: avg, points: total, division: div);
  }
}

/// Exact website institutional identity & demo accounts.
abstract final class SchoolProfile {
  static const String schoolId = DemoAccount.schoolId;
  static const String brandName = 'SHule Altra';
  static const String brandTagline = 'Elimu Kwanza';
  static const String schoolName = DemoAccount.schoolName;
  static const String location = 'Kinondoni, Dar es Salaam · TZ';
  static const String motto = 'Elimu Kwanza · Excellence & Discipline';
  static const String termLabel = '2026 Academic Year';

  static const Map<String, double> annualFeeByClass = <String, double>{
    'Form 1': 450000,
    'Form 2': 450000,
    'Form 3': 600000,
    'Form 4': 600000,
  };

  static const List<DemoRoleAccount> demoRoles = <DemoRoleAccount>[
    DemoRoleAccount(
      uid: DemoAccount.uid,
      email: DemoAccount.email,
      fullName: 'DR. JOSEPHAT MWAKALINGA',
      role: DemoAccount.role,
      label: 'Administrator',
      title: 'Head Master',
      department: 'Administration',
      scope: 'Full institutional control',
    ),
    DemoRoleAccount(
      uid: 'demo-teacher',
      email: 'teacher@shule.pro',
      fullName: 'MWL. NEEMA KESSY',
      role: 'TEACHER',
      label: 'Teacher',
      title: 'Academic Master',
      department: 'Sciences',
      scope: 'Students · Attendance · Academics',
    ),
    DemoRoleAccount(
      uid: 'demo-bursar',
      email: 'bursar@shule.pro',
      fullName: 'CPA. ABDULRAZAQ MTENGA',
      role: 'BURSAR',
      label: 'Bursar',
      title: 'School Bursar',
      department: 'Accounts',
      scope: 'Finance · Fees · Reconciliation',
    ),
  ];

  static DemoRoleAccount? matchDemoLogin(String email, String password) {
    final normalized = email.trim().toLowerCase();
    if (password != DemoCredentials.demoPassword) return null;
    for (final role in demoRoles) {
      if (role.email == normalized) return role;
    }
    return null;
  }

  static const List<HostelWing> hostels = <HostelWing>[
    HostelWing(name: 'Kilimanjaro Wing', type: 'Boys', warden: 'Mwl. Elizabeth Mushi', block: 'Block A', rooms: 24, capacity: 96),
    HostelWing(name: 'Serengeti Wing', type: 'Girls', warden: 'Mwl. Hamisi Msuya', block: 'Block B', rooms: 20, capacity: 80),
    HostelWing(name: 'Lake Victoria Wing', type: 'Boys', warden: 'Mwl. Grace Ndosi', block: 'Block C', rooms: 18, capacity: 72),
    HostelWing(name: 'Zanzibar Wing', type: 'Girls', warden: 'Mwl. Salum Kivuyo', block: 'Block D', rooms: 16, capacity: 64),
    HostelWing(name: 'Ruaha Wing', type: 'Boys', warden: 'Mwl. Tumaini Mrema', block: 'Block E', rooms: 14, capacity: 56),
  ];

  static const List<TransportRoute> routes = <TransportRoute>[
    TransportRoute(name: 'Mbezi Beach - Kawe', driver: 'Bakari Said', phone: '0712 333 444', vehicle: 'T 442 ABC', status: 'Active', departureTime: '06:15 AM'),
    TransportRoute(name: 'Kijitonyama - Sinza', driver: 'John Mrema', phone: '0754 111 222', vehicle: 'T 119 XYZ', status: 'Active', departureTime: '06:30 AM'),
    TransportRoute(name: 'Posta - Kariakoo', driver: 'Athumani Juma', phone: '0765 877 001', vehicle: 'T 908 KLM', status: 'Active', departureTime: '06:15 AM'),
    TransportRoute(name: 'Mbagala - Temeke', driver: 'Peter Mwakalinga', phone: '0784 552 118', vehicle: 'T 771 MNO', status: 'Active', departureTime: '05:45 AM'),
    TransportRoute(name: 'Ubungo - Kimara', driver: 'Salum Kizinga', phone: '0742 660 913', vehicle: 'T 330 PQR', status: 'Standby', departureTime: '06:00 AM'),
  ];

  static const List<CanteenMenuItem> canteenMenu = <CanteenMenuItem>[
    CanteenMenuItem(item: 'Balanced lunch', amount: 2500),
    CanteenMenuItem(item: 'Healthy snack', amount: 1200),
    CanteenMenuItem(item: 'Chapati & Beans Plate', amount: 1800),
    CanteenMenuItem(item: 'Fresh Fruit Bowl', amount: 900),
    CanteenMenuItem(item: 'Milk Tea + Mandazi', amount: 700),
    CanteenMenuItem(item: 'Rice & Beef Stew', amount: 3000),
    CanteenMenuItem(item: 'Bottled Water 500ml', amount: 500),
    CanteenMenuItem(item: 'School Exercise Book', amount: 1500),
  ];

  static const List<StaffMember> staffRoster = <StaffMember>[
    StaffMember(id: 'demo-admin', staffNo: 'ALT-STF-2026-001', fullName: 'DR. JOSEPHAT MWAKALINGA', role: 'ADMIN', department: 'Administration', title: 'Head Master', email: 'admin@shule.pro', phone: '+255 712 410 100', active: true),
    StaffMember(id: 'demo-teacher', staffNo: 'ALT-STF-2026-002', fullName: 'MWL. NEEMA KESSY', role: 'TEACHER', department: 'Sciences', title: 'Academic Master', email: 'teacher@shule.pro', phone: '+255 754 220 315', active: true),
    StaffMember(id: 'demo-bursar', staffNo: 'ALT-STF-2026-003', fullName: 'CPA. ABDULRAZAQ MTENGA', role: 'BURSAR', department: 'Accounts', title: 'Bursar', email: 'bursar@shule.pro', phone: '+255 765 890 421', active: true),
    StaffMember(id: 'demo-accountant', staffNo: 'ALT-STF-2026-004', fullName: 'BI. REHEMA SHAYO', role: 'ACCOUNTANT', department: 'Accounts', title: 'Accounts Officer', email: 'accounts@shule.pro', phone: '+255 714 550 201', active: true),
    StaffMember(id: 'staff-005', staffNo: 'ALT-STF-2026-005', fullName: 'MWL. EMMANUEL KOMBA', role: 'TEACHER', department: 'Mathematics', title: 'Senior Teacher', email: 'e.komba@mnyerere.sc.tz', phone: '+255 784 311 089', active: true),
    StaffMember(id: 'staff-006', staffNo: 'ALT-STF-2026-006', fullName: 'MWL. AGNES KIMARO', role: 'TEACHER', department: 'Languages', title: 'Kiswahili Master', email: 'a.kimaro@mnyerere.sc.tz', phone: '+255 713 502 918', active: true),
    StaffMember(id: 'staff-007', staffNo: 'ALT-STF-2026-007', fullName: 'MWL. PATRICK LYIMO', role: 'TEACHER', department: 'Humanities', title: 'Geography Master', email: 'p.lyimo@mnyerere.sc.tz', phone: '+255 756 914 203', active: true),
    StaffMember(id: 'staff-008', staffNo: 'ALT-STF-2026-008', fullName: 'MWL. ZAINAB ALLY', role: 'TEACHER', department: 'Sciences', title: 'Chemistry Mistress', email: 'z.ally@mnyerere.sc.tz', phone: '+255 742 781 664', active: true),
    StaffMember(id: 'staff-009', staffNo: 'ALT-STF-2026-009', fullName: 'MWL. DEOGRATIUS MUSHI', role: 'TEACHER', department: 'Sciences', title: 'Physics Master', email: 'd.mushi@mnyerere.sc.tz', phone: '+255 788 129 440', active: true),
    StaffMember(id: 'staff-010', staffNo: 'ALT-STF-2026-010', fullName: 'MWL. UPENDO MATERU', role: 'TEACHER', department: 'Humanities', title: 'History Mistress', email: 'u.materu@mnyerere.sc.tz', phone: '+255 755 301 921', active: true),
    StaffMember(id: 'staff-011', staffNo: 'ALT-STF-2026-011', fullName: 'MWL. FRANK SHAYO', role: 'TEACHER', department: 'Business', title: 'Commerce Master', email: 'f.shayo@mnyerere.sc.tz', phone: '+255 717 624 880', active: true),
    StaffMember(id: 'staff-012', staffNo: 'ALT-STF-2026-012', fullName: 'MWL. LIGHTNESS KIVUYO', role: 'TEACHER', department: 'Languages', title: 'English Mistress', email: 'l.kivuyo@mnyerere.sc.tz', phone: '+255 768 109 412', active: true),
    StaffMember(id: 'staff-013', staffNo: 'ALT-STF-2026-013', fullName: 'MWL. SAID NGOWI', role: 'TEACHER', department: 'Mathematics', title: 'Mathematics Master', email: 's.ngowi@mnyerere.sc.tz', phone: '+255 782 440 715', active: true),
    StaffMember(id: 'staff-014', staffNo: 'ALT-STF-2026-014', fullName: 'BI. HAPPINESS SANARE', role: 'BURSAR', department: 'Accounts', title: 'Fees Clerk', email: 'h.sanare@mnyerere.sc.tz', phone: '+255 719 882 301', active: false),
    StaffMember(id: 'staff-015', staffNo: 'ALT-STF-2026-015', fullName: 'MWL. GODFREY URIO', role: 'TEACHER', department: 'Sciences', title: 'Biology Master', email: 'g.urio@mnyerere.sc.tz', phone: '+255 744 217 990', active: true),
    StaffMember(id: 'staff-016', staffNo: 'ALT-STF-2026-016', fullName: 'MWL. ASHA MWANGOSI', role: 'TEACHER', department: 'Humanities', title: 'Civics Mistress', email: 'a.mwangosi@mnyerere.sc.tz', phone: '+255 758 903 114', active: true),
  ];
}

/* -------------------------------------------------------------------------- */
/*  Interactive Single-School Workspace (100% Website Parity)                 */
/* -------------------------------------------------------------------------- */

class SchoolWorkspace extends ChangeNotifier {
  SchoolWorkspace() {
    _seedFromWebsiteAlgorithm();
  }

  static const List<String> _maleFirst = [
    'Juma', 'Baraka', 'Emmanuel', 'Hamisi', 'Said', 'Yusuf', 'Daudi',
    'Ally', 'Mussa', 'Ibrahim', 'Godfrey', 'Patrick', 'Augustino',
    'Frank', 'Deogratius', 'Shabani', 'Rashid', 'Jackson', 'Edward', 'Castro',
  ];

  static const List<String> _femaleFirst = [
    'Neema', 'Zainab', 'Asha', 'Mwanaisha', 'Grace', 'Happiness', 'Faraja',
    'Fatuma', 'Agnes', 'Veronica', 'Esther', 'Upendo', 'Consolata',
    'Beatrice', 'Salma', 'Rehema', 'Tumaini', 'Lightness', 'Magreth', 'Joyce',
  ];

  static const List<String> _lastNames = [
    'Mushi', 'Kessy', 'Mwakalinga', 'Komba', 'Shayo', 'Mbwambo', 'Kimaro',
    'Mallya', 'Mrema', 'Lyimo', 'Ndosi', 'Kilonzo', 'Mapunda', 'Chuma',
    'Ngowi', 'Masawe', 'Materu', 'Sanga', 'Massawe', 'Mwangosi', 'Temba',
    'Urio', 'Minja', 'Swai', 'Mosha', 'Kivuyo', 'Laizer', 'Sanare',
  ];

  DemoRoleAccount _activeStaff = SchoolProfile.demoRoles.first;
  final List<Learner> _learners = <Learner>[];
  final Map<String, LearnerExtra> _extras = <String, LearnerExtra>{};
  final Map<String, Uint8List> _photos = <String, Uint8List>{};
  final Map<String, Map<String, int>> _scores = <String, Map<String, int>>{};
  final Map<String, String> _attendance = <String, String>{};
  final List<FeeTransaction> _transactions = <FeeTransaction>[];
  final List<SchoolAsset> _assets = <SchoolAsset>[];
  final List<CanteenSale> _canteenSales = <CanteenSale>[];
  final List<PettyCashExpense> _pettyCash = <PettyCashExpense>[];
  final List<SchoolAnnouncement> _announcements = <SchoolAnnouncement>[];
  final List<AuditEntry> _auditTrail = <AuditEntry>[];

  DemoRoleAccount get activeStaff => _activeStaff;
  List<Learner> get learners => List.unmodifiable(_learners);
  List<FeeTransaction> get transactions => List.unmodifiable(_transactions);
  List<SchoolAsset> get assets => List.unmodifiable(_assets);
  List<CanteenSale> get canteenSales => List.unmodifiable(_canteenSales);
  List<PettyCashExpense> get pettyCash => List.unmodifiable(_pettyCash);
  List<SchoolAnnouncement> get announcements => List.unmodifiable(_announcements);
  List<AuditEntry> get auditTrail => List.unmodifiable(_auditTrail);
  int get unreadAnnouncements => _announcements.where((a) => a.unread).length;

  void setActiveStaff(DemoRoleAccount role) {
    _activeStaff = role;
    _logAudit('Switched active session role', '${role.label} (${role.email})');
    notifyListeners();
  }

  LearnerExtra extraFor(String learnerId) =>
      _extras[learnerId] ??
      const LearnerExtra(
        expectedFee: 450000,
        arrears: 0,
        totalPaid: 0,
        conductPoints: 90,
        hostel: '',
        route: '',
        lastAttendanceUpdate: '08:15',
        gender: 'Female',
      );

  Uint8List? photoFor(String learnerId) => _photos[learnerId];

  void setLearnerPhoto(String learnerId, Uint8List bytes) {
    _photos[learnerId] = bytes;
    _logAudit('Updated passport photo', learnerId);
    notifyListeners();
  }

  String attendanceFor(String learnerId) => _attendance[learnerId] ?? 'Present';

  void setAttendance(String learnerId, String status) {
    _attendance[learnerId] = status;
    final idx = _learners.indexWhere((row) => row.id == learnerId);
    if (idx != -1) {
      final current = _learners[idx];
      _learners[idx] = Learner(
        id: current.id,
        name: current.name,
        className: current.className,
        status: current.status,
        guardianName: current.guardianName,
        guardianPhone: current.guardianPhone,
        guardianEmail: current.guardianEmail,
        balance: current.balance,
        type: current.type,
        stream: current.stream,
        attendanceStatus: status,
      );
      _logAudit('Marked attendance $status', '${current.name} (${current.id})');
    }
    notifyListeners();
  }

  void markClassPresent(String className) {
    var count = 0;
    for (var i = 0; i < _learners.length; i++) {
      final row = _learners[i];
      if (className == 'All' || row.className == className) {
        _attendance[row.id] = 'Present';
        _learners[i] = Learner(
          id: row.id,
          name: row.name,
          className: row.className,
          status: row.status,
          guardianName: row.guardianName,
          guardianPhone: row.guardianPhone,
          guardianEmail: row.guardianEmail,
          balance: row.balance,
          type: row.type,
          stream: row.stream,
          attendanceStatus: 'Present',
        );
        count++;
      }
    }
    _logAudit('Marked matching present', '$className ($count learners)');
    notifyListeners();
  }

  int get boarderCount => _learners.where((l) => l.type == 'Boarder').length;
  int get dayScholarCount => _learners.where((l) => l.type != 'Boarder').length;
  int get presentCount => _learners.where((l) => attendanceFor(l.id) == 'Present').length;
  int get lateCount => _learners.where((l) => attendanceFor(l.id) == 'Late').length;
  int get absentCount => _learners.where((l) => attendanceFor(l.id) == 'Absent').length;
  double get attendanceRate =>
      _learners.isEmpty ? 0 : ((presentCount + lateCount) / _learners.length) * 100;

  double annualFeeFor(Learner learner) => extraFor(learner.id).expectedFee;
  double paidFor(Learner learner) => extraFor(learner.id).totalPaid;

  double get totalTargetFees => _learners.fold<double>(
        0,
        (sum, l) => sum + extraFor(l.id).expectedFee + extraFor(l.id).arrears,
      );

  double get totalOutstandingFees =>
      _learners.fold<double>(0, (sum, l) => sum + (l.balance ?? 0));

  double get totalCollectedFees =>
      _learners.fold<double>(0, (sum, l) => sum + extraFor(l.id).totalPaid);

  double get feeCollectionRate =>
      totalTargetFees <= 0 ? 0 : (totalCollectedFees / totalTargetFees) * 100;

  int get learnersWithBalanceCount =>
      _learners.where((l) => (l.balance ?? 0) > 0).length;

  int get verifiedReceiptCount =>
      _transactions.where((t) => t.status == 'Verified').length;

  int get pendingReceiptCount =>
      _transactions.where((t) => t.status == 'Pending').length;

  int get disputedReceiptCount =>
      _transactions.where((t) => t.status == 'Disputed').length;

  double get pendingPaymentsAmount => _transactions
      .where((t) => t.status == 'Pending')
      .fold<double>(0, (sum, t) => sum + t.amount);

  Map<String, double> get outstandingByClass {
    final map = <String, double>{
      'Form 4': 0,
      'Form 3': 0,
      'Form 2': 0,
      'Form 1': 0,
    };
    for (final l in _learners) {
      map[l.className] = (map[l.className] ?? 0) + (l.balance ?? 0);
    }
    return map;
  }

  List<Learner> get topFollowUpQueue {
    final owing = _learners.where((l) => (l.balance ?? 0) > 0).toList()
      ..sort((a, b) => (b.balance ?? 0).compareTo(a.balance ?? 0));
    return owing.take(6).toList();
  }

  int hostelOccupancy(String hostelName) =>
      _learners.where((l) => extraFor(l.id).hostel == hostelName).length;

  int routeRiders(String routeName) =>
      _learners.where((l) => extraFor(l.id).route == routeName).length;

  Map<String, int> scoresFor(String learnerId) =>
      Map.unmodifiable(_scores[learnerId] ?? const <String, int>{});

  NectaDivisionResult resultFor(String learnerId) =>
      NectaGrading.evaluate(_scores[learnerId] ?? const <String, int>{});

  void updateScore(String learnerId, String subject, int score) {
    final clamped = score.clamp(0, 100);
    final current = Map<String, int>.from(_scores[learnerId] ?? const <String, int>{});
    current[subject] = clamped;
    _scores[learnerId] = current;
    _logAudit('Updated $subject score to $clamped%', learnerId);
    notifyListeners();
  }

  Learner enrolLearner({
    required String name,
    required String className,
    required String stream,
    required String type,
    required String guardianName,
    required String guardianPhone,
    required String guardianEmail,
    String? hostel,
    String? route,
    Uint8List? photoBytes,
  }) {
    final nextNum = _learners.length + 1;
    final id = 'ALT-2026-${nextNum.toString().padLeft(3, '0')}';
    final fee = SchoolProfile.annualFeeByClass[className] ?? 450000;
    final upperName = name.trim().toUpperCase();
    final isBoarder = type == 'Boarder' || type == 'Boarding';
    final learner = Learner(
      id: id,
      name: upperName,
      className: className,
      status: 'Active',
      guardianName: guardianName.trim().toUpperCase(),
      guardianPhone: guardianPhone.trim(),
      guardianEmail: guardianEmail.trim(),
      balance: fee,
      type: isBoarder ? 'Boarder' : 'Day',
      stream: stream,
      attendanceStatus: 'Present',
    );
    _learners.insert(0, learner);
    _extras[id] = LearnerExtra(
      expectedFee: fee,
      arrears: 0,
      totalPaid: 0,
      conductPoints: 100,
      hostel: isBoarder ? (hostel ?? SchoolProfile.hostels.first.name) : '',
      route: isBoarder ? '' : (route ?? SchoolProfile.routes.first.name),
      lastAttendanceUpdate: '08:15',
      gender: 'Female',
    );
    _attendance[id] = 'Present';
    if (photoBytes != null) _photos[id] = photoBytes;
    _scores[id] = <String, int>{
      for (final subject in NectaGrading.subjects.take(8)) subject: 70,
    };
    _announcements.insert(
      0,
      SchoolAnnouncement(
        id: 'ann-${DateTime.now().millisecondsSinceEpoch}',
        title: 'New learner enrolled',
        body: '${learner.name} ($id) joined ${learner.className} (${learner.type}).',
        audience: 'Administration',
        timeLabel: 'Just now',
        unread: true,
      ),
    );
    _logAudit('Enrolled new learner', '${learner.name} ($id · $className)');
    notifyListeners();
    return learner;
  }

  FeeTransaction recordPayment({
    required String studentId,
    required double amount,
    required String feeType,
    required String paymentMethod,
    String? controlNumber,
  }) {
    final idx = _learners.indexWhere((l) => l.id == studentId);
    if (idx == -1) throw ArgumentError('Student $studentId not found');
    final learner = _learners[idx];
    final currentBalance = learner.balance ?? 0;
    final nextBalance = (currentBalance - amount).clamp(0.0, double.infinity);
    _learners[idx] = Learner(
      id: learner.id,
      name: learner.name,
      className: learner.className,
      status: learner.status,
      guardianName: learner.guardianName,
      guardianPhone: learner.guardianPhone,
      guardianEmail: learner.guardianEmail,
      balance: nextBalance,
      type: learner.type,
      stream: learner.stream,
      attendanceStatus: learner.attendanceStatus,
    );
    final prevExtra = extraFor(learner.id);
    _extras[learner.id] = prevExtra.copyWith(totalPaid: prevExtra.totalPaid + amount);

    final ref = (controlNumber != null && controlNumber.trim().isNotEmpty)
        ? controlNumber.trim()
        : 'CP-2026-${(50000000 + _transactions.length * 1371)}';
    final tx = FeeTransaction(
      id: 'tx-${(_transactions.length + 1).toString().padLeft(4, '0')}',
      studentId: learner.id,
      studentName: learner.name,
      className: learner.className,
      amount: amount,
      feeType: feeType,
      paymentMethod: paymentMethod,
      controlNumber: ref,
      status: 'Verified',
      recordedBy: 'Accounts office',
      dateLabel: 'Today',
      sortOrder: -_transactions.length - 1,
    );
    _transactions.insert(0, tx);
    _logAudit('Recorded Verified payment', '${learner.name} · TZS ${amount.round()} ($ref)');
    notifyListeners();
    return tx;
  }

  void setTransactionStatus(String txId, String status) {
    final idx = _transactions.indexWhere((t) => t.id == txId);
    if (idx == -1) return;
    final tx = _transactions[idx];
    _transactions[idx] = tx.copyWith(status: status);
    _logAudit('Updated ledger status to $status', '${tx.controlNumber} · ${tx.studentName}');
    notifyListeners();
  }

  void recordCanteenSale({
    required Learner learner,
    required CanteenMenuItem menuItem,
  }) {
    _canteenSales.insert(
      0,
      CanteenSale(
        id: 'sale-${_canteenSales.length + 1}',
        studentId: learner.id,
        studentName: learner.name,
        item: menuItem.item,
        amount: menuItem.amount,
        timeLabel: 'Just now',
      ),
    );
    _logAudit('Canteen basket sale', '${learner.name} · ${menuItem.item}');
    notifyListeners();
  }

  void markAllAnnouncementsRead() {
    for (var i = 0; i < _announcements.length; i++) {
      _announcements[i] = _announcements[i].copyWith(unread: false);
    }
    notifyListeners();
  }

  void addAnnouncement(String title, String body, {String audience = 'All Guardians & Staff'}) {
    _announcements.insert(
      0,
      SchoolAnnouncement(
        id: 'ann-${DateTime.now().millisecondsSinceEpoch}',
        title: title,
        body: body,
        audience: audience,
        timeLabel: 'Just now',
        unread: true,
      ),
    );
    _logAudit('Sent communication broadcast', '$title ($audience)');
    notifyListeners();
  }

  void _logAudit(String action, String target) {
    _auditTrail.insert(
      0,
      AuditEntry(
        actor: _activeStaff.label,
        action: action,
        target: target,
        timeLabel: 'Just now',
      ),
    );
  }

  /* ------------------------------------------------------------------------ */
  /*  Exact Deterministic Seed Matching `src/lib/demo/seed-data.ts`           */
  /* ------------------------------------------------------------------------ */

  void _seedFromWebsiteAlgorithm() {
    final rng = _Mulberry32(20260406);
    final usedNames = <String>{};

    String nextPhone() =>
        '+255 7${rng.between(1, 8)}${rng.between(10, 99)} ${rng.between(100, 999)} ${rng.between(100, 999)}';

    String nextStudentName(String gender) {
      for (var attempt = 0; attempt < 60; attempt++) {
        final first = gender == 'Male' ? rng.pick(_maleFirst) : rng.pick(_femaleFirst);
        final middle = rng.pick(_maleFirst);
        final last = rng.pick(_lastNames);
        if (first == middle) continue;
        final candidate = '$first $middle $last'.toUpperCase();
        if (usedNames.add(candidate)) return candidate;
      }
      final fallback =
          '${gender == 'Male' ? rng.pick(_maleFirst) : rng.pick(_femaleFirst)} ${rng.pick(_lastNames)} ${usedNames.length}'
              .toUpperCase();
      usedNames.add(fallback);
      return fallback;
    }

    final hostelNames = SchoolProfile.hostels.map((h) => h.name).toList();
    final routeNames = SchoolProfile.routes.map((r) => r.name).toList();

    const classWeights = <(String, int)>[
      ('Form 1', 36),
      ('Form 2', 38),
      ('Form 3', 38),
      ('Form 4', 38),
    ];

    var index = 0;
    for (final (className, count) in classWeights) {
      for (var i = 0; i < count; i++) {
        index++;
        final gender = rng.chance(0.5) ? 'Male' : 'Female';
        final name = nextStudentName(gender);
        final id = 'ALT-2026-${index.toString().padLeft(3, '0')}';
        final boarder = rng.chance(0.68);
        final hostel = boarder ? rng.pick(hostelNames) : '';
        final route = boarder ? '' : rng.pick(routeNames);

        final expected = SchoolProfile.annualFeeByClass[className] ?? 450000;
        final arrears = rng.chance(0.22) ? rng.between(5, 15) * 10000.0 : 0.0;
        final paidRatio = rng.chance(0.42) ? 1.0 : 0.25 + rng.next() * 0.7;
        final roundedPaid = ((expected * paidRatio) / 1000).round() * 1000.0;
        final totalPaid = roundedPaid > expected + arrears ? expected + arrears : roundedPaid;
        final balance = (expected + arrears - totalPaid) < 0 ? 0.0 : (expected + arrears - totalPaid);

        final attRoll = rng.next();
        final attStatus = attRoll > 0.96
            ? 'Absent'
            : attRoll > 0.92
                ? 'Late'
                : 'Present';

        // Match exact RNG calls for DOB, guardian, phone, contact, enrolment date, conduct, timestamps.
        rng.between(0, 1);
        rng.between(1, 12);
        rng.between(1, 28);
        final guardianName = '${rng.pick(_maleFirst)} ${rng.pick(_lastNames)}'.toUpperCase();
        final guardianPhone = nextPhone();
        nextPhone(); // secondary contact
        rng.between(6, 20);
        final conductPoints = rng.between(78, 100);
        rng.between(30, 120);
        rng.between(0, 20);

        final learner = Learner(
          id: id,
          name: name,
          className: className,
          status: 'Active',
          guardianName: guardianName,
          guardianPhone: guardianPhone,
          guardianEmail: '${id.toLowerCase()}@shulealtra.tz',
          balance: balance,
          type: boarder ? 'Boarder' : 'Day',
          stream: (i % 2 == 0) ? 'A' : 'B',
          attendanceStatus: attStatus,
        );

        _learners.add(learner);
        _attendance[id] = attStatus;
        _extras[id] = LearnerExtra(
          expectedFee: expected,
          arrears: arrears,
          totalPaid: totalPaid,
          conductPoints: conductPoints,
          hostel: hostel,
          route: route,
          lastAttendanceUpdate: '08:15',
          gender: gender,
        );
      }
    }

    // Consume exact RNG calls for staff, routes, assets to keep grade & transaction seed aligned!
    for (var i = 0; i < SchoolProfile.staffRoster.length; i++) {
      nextPhone();
      rng.between(12, 24);
      rng.between(1, 9);
      rng.between(1, 28);
      rng.between(30, 400);
    }
    for (var i = 0; i < SchoolProfile.routes.length; i++) {
      rng.between(48, 56);
      rng.between(5, 6);
      rng.pick(const ['15', '30', '45']);
    }

    // Build all 18 inventory assets from ASSET_CATALOGUE
    const assetSeed = <(String, String, String)>[
      ('HP ProBook 450 Laptop', 'ICT Equipment', 'Computer Lab A'),
      ('Epson EB-X51 Projector', 'ICT Equipment', 'Form 4 Classroom'),
      ('Laboratory Microscope (Olympus)', 'Laboratory', 'Biology Lab'),
      ('Chemistry Reagent Cabinet', 'Laboratory', 'Chemistry Lab'),
      ('Dell PowerEdge Server Cabinet', 'ICT Equipment', 'Server Room'),
      ('Wooden Dual Desk (Student)', 'Furniture', 'Form 2 Classroom'),
      ('Staff Office Desk', 'Furniture', 'Administration Block'),
      ('Water Pump Generator 5KVA', 'Machinery', 'Utility Yard'),
      ('Samsung 55" Interactive Board', 'ICT Equipment', 'Science Auditorium'),
      ('Library Steel Bookshelf', 'Furniture', 'Library'),
      ('Sewing Machine (Industrial)', 'Machinery', 'Home Economics Room'),
      ('School Bus T 442 ABC', 'Vehicle', 'Fleet Yard'),
      ('First Aid Station Kit', 'Safety', 'Sick Bay'),
      ('Solar Inverter 3KW', 'Machinery', 'Block C Roof'),
      ('Printer HP LaserJet M404', 'ICT Equipment', 'Accounts Office'),
      ('Canteen Deep Freezer', 'Kitchen', 'Canteen'),
      ('Fire Extinguisher (CO2)', 'Safety', 'Dormitory Block A'),
      ('Public Address System', 'ICT Equipment', 'Assembly Hall'),
    ];
    for (var i = 0; i < assetSeed.length; i++) {
      final (name, category, location) = assetSeed[i];
      final condition = rng.pick(const ['New', 'Good', 'Good', 'Fair', 'Needs Repair']);
      rng.between(18, 25);
      rng.between(1, 9);
      rng.between(1, 28);
      final value = rng.between(5, 350) * 10000.0;
      rng.between(20, 300);
      _assets.add(
        SchoolAsset(
          tag: 'SD-2026-${(i + 1).toString().padLeft(4, '0')}',
          name: name,
          category: category,
          location: location,
          condition: condition,
          status: i == 11 ? 'Under Maintenance' : 'Operational',
          value: value,
        ),
      );
    }

    // Build NECTA grades for all 150 students (matching `buildGrades` in seed-data.ts)
    const subjectSets = <String, List<String>>{
      'Form 1': ['Mathematics', 'English', 'Kiswahili', 'Civics', 'Physics', 'Chemistry', 'Biology', 'Geography'],
      'Form 2': ['Mathematics', 'English', 'Kiswahili', 'Civics', 'Physics', 'Chemistry', 'Biology', 'Geography'],
      'Form 3': ['Mathematics', 'English', 'Kiswahili', 'Civics', 'Physics', 'Chemistry', 'Biology', 'History'],
      'Form 4': ['Mathematics', 'English', 'Kiswahili', 'Civics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History', 'Commerce'],
    };
    for (final student in _learners) {
      final subjects = subjectSets[student.className] ?? NectaGrading.subjects.take(8).toList();
      final ability = 45 + (student.name.codeUnitAt(0) % 35);
      final latestScores = <String, int>{};
      for (var examIdx = 0; examIdx < 2; examIdx++) {
        for (final subject in subjects) {
          final raw = (ability + (rng.next() * 30 - 15)).round().clamp(18, 99);
          if (examIdx == 1) latestScores[subject] = raw;
        }
      }
      if (student.className == 'Form 4') {
        for (final subject in subjects) {
          latestScores[subject] = (ability + (rng.next() * 26 - 13)).round().clamp(20, 99);
        }
      }
      _scores[student.id] = latestScores;
    }

    // Build all 140 ClickPesa / Accounts office ledger entries (`buildTransactions`)
    const feeTypes = ['Tuition', 'Boarding', 'Transport', 'Meals', 'Exam Fee', 'Uniform'];
    const methods = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Bank Transfer', 'Cash', 'Control Number'];
    const prefixes = ['MPESA', 'TIGO', 'AIRTEL', 'CRDB', 'NMB'];
    final paying = _learners.where((s) => extraFor(s.id).totalPaid > 0).toList();
    final baseDate = DateTime(2026, 11, 10, 12, 0);

    for (var i = 0; i < 140; i++) {
      final student = rng.pick(paying);
      final roll = rng.next();
      final status = roll > 0.94
          ? 'Disputed'
          : roll > 0.78
              ? 'Pending'
              : 'Verified';
      final amount = rng.between(5, 60) * 10000.0;
      final minsAgo = rng.between(30, 60 * 24 * 45);
      final cp = 'CP-2026-${rng.between(10000000, 99999999)}';
      rng.pick(prefixes);
      rng.between(100000, 999999);
      final feeType = rng.pick(feeTypes);
      final method = rng.pick(methods);
      final recordedBy = rng.chance(0.5) ? 'Accounts office' : 'ClickPesa';
      final dt = baseDate.subtract(Duration(minutes: minsAgo));
      final dateLabel =
          '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';

      _transactions.add(
        FeeTransaction(
          id: 'tx-${(i + 1).toString().padLeft(4, '0')}',
          studentId: student.id,
          studentName: student.name,
          className: student.className,
          amount: amount,
          feeType: feeType,
          paymentMethod: method,
          controlNumber: cp,
          status: status,
          recordedBy: recordedBy,
          dateLabel: dateLabel,
          sortOrder: minsAgo,
        ),
      );
    }
    _transactions.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));

    // Skip attendance history RNG (6 days * 150) to match website sequence
    for (var d = 0; d < 6 * _learners.length; d++) {
      rng.next();
    }

    // Build 18 Canteen sales
    for (var i = 0; i < 18; i++) {
      final student = rng.pick(_learners);
      final menu = rng.pick(SchoolProfile.canteenMenu);
      final mins = rng.between(5, 60 * 30);
      _canteenSales.add(
        CanteenSale(
          id: 'sale-${(i + 1).toString().padLeft(3, '0')}',
          studentId: student.id,
          studentName: student.name,
          item: menu.item,
          amount: menu.amount,
          timeLabel: mins < 60 ? '${mins}m ago' : '${(mins / 60).floor()}h ago',
        ),
      );
    }

    // Build 10 Petty Cash expenses
    const pettySeed = <(String, String, String)>[
      ('Administration', 'Stationery', 'A4 printing paper (10 reams)'),
      ('Sciences', 'Laboratory', 'Chemistry reagents restock'),
      ('Accounts', 'Transport', 'Bank deposit runs (Dar es Salaam)'),
      ('Boarding', 'Food', 'Fresh vegetables — Monday supply'),
      ('Sports', 'Equipment', 'Two footballs for inter-house games'),
      ('Administration', 'Utilities', 'LUKU token top-up — staff office'),
      ('ICT', 'Maintenance', 'Network switch replacement'),
      ('Boarding', 'Hygiene', 'Cleaning supplies for dormitories'),
      ('Sciences', 'Laboratory', 'Microscope slide covers'),
      ('Library', 'Books', 'NECTA past paper booklets'),
    ];
    for (var i = 0; i < pettySeed.length; i++) {
      final (dept, cat, desc) = pettySeed[i];
      final amt = rng.between(15, 180) * 1000.0;
      final status = i % 4 == 0
          ? 'Pending'
          : i == 7
              ? 'Rejected'
              : 'Approved';
      _pettyCash.add(
        PettyCashExpense(
          id: 'cash-${(i + 1).toString().padLeft(3, '0')}',
          department: dept,
          category: cat,
          description: desc,
          amount: amt,
          status: status,
          dateLabel: i == 0 ? 'Today' : '${i + 1}d ago',
        ),
      );
    }

    // Sort learners alphabetically A–Z just like the website Student Directory!
    _learners.sort((a, b) => a.name.compareTo(b.name));

    _announcements.addAll(const <SchoolAnnouncement>[
      SchoolAnnouncement(
        id: 'ann-1',
        title: 'Form 4 NECTA Mock Examination Timetable',
        body: 'All subject masters should verify laboratory apparatus allocations before Friday 15:00 EAT.',
        audience: 'Academic Staff',
        timeLabel: '2h ago',
        unread: true,
      ),
      SchoolAnnouncement(
        id: 'ann-2',
        title: 'ClickPesa & Accounts Reconciliation Notice',
        body: 'Review disputed and pending fee entries inside Finance before end-of-month TRA audit export.',
        audience: 'Administration & Bursar',
        timeLabel: 'Yesterday',
        unread: true,
      ),
      SchoolAnnouncement(
        id: 'ann-3',
        title: 'Daily Register Roll Call (08:15 EAT)',
        body: 'Class teachers are reminded to mark absent learners so follow-up calls go out promptly.',
        audience: 'All Teachers',
        timeLabel: '2 days ago',
        unread: false,
      ),
    ]);

    _auditTrail.addAll(<AuditEntry>[
      AuditEntry(
        actor: 'ClickPesa',
        action: 'Synced payment ledger batch',
        target: '${_transactions.length} institutional receipts',
        timeLabel: 'Today · 08:20',
      ),
      const AuditEntry(
        actor: 'Front desk',
        action: 'Completed morning presence register',
        target: '150 active O-Level learners',
        timeLabel: 'Today · 08:15',
      ),
      const AuditEntry(
        actor: 'Academic office',
        action: 'Published Term 2 & Form 4 Mock grades',
        target: 'NECTA CSEE Division calculator',
        timeLabel: 'Yesterday',
      ),
      const AuditEntry(
        actor: 'Accounts office',
        action: 'Reconciled verified receipts',
        target: 'school-001 · 2026 Registry',
        timeLabel: '2 days ago',
      ),
    ]);
  }
}
