/// Single-school Shule Altra workspace & website-aligned demo data store.
///
/// Models Mwalimu Nyerere Secondary School (Kinondoni, Dar es Salaam) — the
/// exact school identity, demo roles, fee structure, NECTA O-Level grading,
/// staff roster, hostels, bus routes and timetables used by the Shule Altra
/// web hub (`src/lib/demo/seed-data.ts` & `config/demo-account.json`).
library;

import 'package:flutter/foundation.dart';

import 'demo_account.g.dart';
import 'demo_credentials.dart';
import 'learner.dart';

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
class StaffMember {
  const StaffMember({
    required this.id,
    required this.fullName,
    required this.role,
    required this.department,
    required this.title,
    required this.email,
    required this.phone,
  });

  final String id;
  final String fullName;
  final String role;
  final String department;
  final String title;
  final String email;
  final String phone;
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
    required this.recordedBy,
    required this.dateLabel,
  });

  final String id;
  final String studentId;
  final String studentName;
  final String className;
  final double amount;
  final String feeType;
  final String paymentMethod;
  final String controlNumber;
  final String recordedBy;
  final String dateLabel;
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
    required this.warden,
    required this.block,
    required this.rooms,
    required this.occupied,
    required this.capacity,
  });

  final String name;
  final String warden;
  final String block;
  final int rooms;
  final int occupied;
  final int capacity;
}

@immutable
class TransportRoute {
  const TransportRoute({
    required this.name,
    required this.driver,
    required this.phone,
    required this.vehicle,
    required this.riders,
  });

  final String name;
  final String driver;
  final String phone;
  final String vehicle;
  final int riders;
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

/// NECTA CSEE O-Level grading helpers matching `src/lib/necta-logic.ts`.
abstract final class NectaGrading {
  static const List<String> subjects = <String>[
    'Mathematics',
    'English',
    'Kiswahili',
    'Physics',
    'Chemistry',
    'Biology',
    'Civics',
    'Geography',
    'History',
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
    // NECTA O-Level division sums the best 7 subjects.
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

/// School profile & demo roles matching the website (`config/demo-account.json`
/// and `src/app/login/page.tsx`).
abstract final class SchoolProfile {
  static const String schoolId = DemoAccount.schoolId;
  static const String schoolName = DemoAccount.schoolName;
  static const String location = 'Kinondoni, Dar es Salaam · TZ';
  static const String motto = 'Excellence, Discipline & Service';
  static const String termLabel = 'Term 2 · 2026';

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
      scope: 'Finance · Fees · Statements',
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

  static const List<StaffMember> staffRoster = <StaffMember>[
    StaffMember(
      id: 'demo-admin',
      fullName: 'Dr. Josephat Mwakalinga',
      role: 'ADMIN',
      department: 'Administration',
      title: 'Head Master',
      email: 'admin@shule.pro',
      phone: '+255 712 410 100',
    ),
    StaffMember(
      id: 'demo-teacher',
      fullName: 'Mwl. Neema Kessy',
      role: 'TEACHER',
      department: 'Sciences',
      title: 'Academic Master',
      email: 'teacher@shule.pro',
      phone: '+255 754 220 315',
    ),
    StaffMember(
      id: 'demo-bursar',
      fullName: 'CPA. Abdulrazaq Mtenga',
      role: 'BURSAR',
      department: 'Accounts',
      title: 'Bursar',
      email: 'bursar@shule.pro',
      phone: '+255 765 890 421',
    ),
    StaffMember(
      id: 'staff-005',
      fullName: 'Mwl. Emmanuel Komba',
      role: 'TEACHER',
      department: 'Mathematics',
      title: 'Senior Teacher',
      email: 'e.komba@mnyerere.sc.tz',
      phone: '+255 784 311 089',
    ),
    StaffMember(
      id: 'staff-006',
      fullName: 'Mwl. Agnes Kimaro',
      role: 'TEACHER',
      department: 'Languages',
      title: 'Kiswahili Master',
      email: 'a.kimaro@mnyerere.sc.tz',
      phone: '+255 713 502 918',
    ),
    StaffMember(
      id: 'staff-007',
      fullName: 'Mwl. Patrick Lyimo',
      role: 'TEACHER',
      department: 'Humanities',
      title: 'Geography Master',
      email: 'p.lyimo@mnyerere.sc.tz',
      phone: '+255 756 914 203',
    ),
    StaffMember(
      id: 'staff-008',
      fullName: 'Mwl. Zainab Ally',
      role: 'TEACHER',
      department: 'Sciences',
      title: 'Chemistry Mistress',
      email: 'z.ally@mnyerere.sc.tz',
      phone: '+255 742 781 664',
    ),
    StaffMember(
      id: 'staff-009',
      fullName: 'Mwl. Deogratius Mushi',
      role: 'TEACHER',
      department: 'Sciences',
      title: 'Physics Master',
      email: 'd.mushi@mnyerere.sc.tz',
      phone: '+255 788 129 440',
    ),
  ];

  static const List<HostelWing> hostels = <HostelWing>[
    HostelWing(name: 'Kilimanjaro Wing', warden: 'Mwl. Elizabeth Mushi', block: 'Block A', rooms: 24, occupied: 84, capacity: 96),
    HostelWing(name: 'Serengeti Wing', warden: 'Mwl. Hamisi Msuya', block: 'Block B', rooms: 20, occupied: 72, capacity: 80),
    HostelWing(name: 'Lake Victoria Wing', warden: 'Mwl. Grace Ndosi', block: 'Block C', rooms: 18, occupied: 61, capacity: 72),
    HostelWing(name: 'Zanzibar Wing', warden: 'Mwl. Salum Kivuyo', block: 'Block D', rooms: 16, occupied: 54, capacity: 64),
  ];

  static const List<TransportRoute> routes = <TransportRoute>[
    TransportRoute(name: 'Mbezi Beach - Kawe', driver: 'Bakari Said', phone: '0712 333 444', vehicle: 'T 442 ABC', riders: 38),
    TransportRoute(name: 'Kijitonyama - Sinza', driver: 'John Mrema', phone: '0754 111 222', vehicle: 'T 119 XYZ', riders: 34),
    TransportRoute(name: 'Posta - Kariakoo', driver: 'Athumani Juma', phone: '0765 877 001', vehicle: 'T 908 KLM', riders: 29),
    TransportRoute(name: 'Ubungo - Kimara', driver: 'Salum Kizinga', phone: '0742 660 913', vehicle: 'T 330 PQR', riders: 41),
  ];
}

/// Interactive single-school workspace holding learners, photos, attendance,
/// NECTA scores, fee transactions and notifications.
class SchoolWorkspace extends ChangeNotifier {
  SchoolWorkspace() {
    _seedInitialState();
  }

  DemoRoleAccount _activeStaff = SchoolProfile.demoRoles.first;
  final List<Learner> _learners = <Learner>[];
  final Map<String, Uint8List> _photos = <String, Uint8List>{};
  final Map<String, Map<String, int>> _scores = <String, Map<String, int>>{};
  final Map<String, String> _attendance = <String, String>{};
  final List<FeeTransaction> _transactions = <FeeTransaction>[];
  final List<SchoolAnnouncement> _announcements = <SchoolAnnouncement>[];

  DemoRoleAccount get activeStaff => _activeStaff;
  List<Learner> get learners => List.unmodifiable(_learners);
  List<FeeTransaction> get transactions => List.unmodifiable(_transactions);
  List<SchoolAnnouncement> get announcements => List.unmodifiable(_announcements);
  int get unreadAnnouncements => _announcements.where((a) => a.unread).length;

  void setActiveStaff(DemoRoleAccount role) {
    _activeStaff = role;
    notifyListeners();
  }

  Uint8List? photoFor(String learnerId) => _photos[learnerId];

  void setLearnerPhoto(String learnerId, Uint8List bytes) {
    _photos[learnerId] = bytes;
    notifyListeners();
  }

  void removeLearnerPhoto(String learnerId) {
    if (_photos.remove(learnerId) != null) notifyListeners();
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
    }
    notifyListeners();
  }

  void markClassPresent(String className, {String? stream}) {
    for (final learner in _learners) {
      if (learner.className == className && (stream == null || learner.stream == stream)) {
        _attendance[learner.id] = 'Present';
      }
    }
    for (var i = 0; i < _learners.length; i++) {
      final row = _learners[i];
      if (row.className == className && (stream == null || row.stream == stream)) {
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
      }
    }
    notifyListeners();
  }

  int get presentCount => _learners.where((l) => attendanceFor(l.id) == 'Present').length;
  int get lateCount => _learners.where((l) => attendanceFor(l.id) == 'Late').length;
  int get absentCount => _learners.where((l) => attendanceFor(l.id) == 'Absent').length;

  double get attendanceRate =>
      _learners.isEmpty ? 0 : ((presentCount + lateCount) / _learners.length) * 100;

  double annualFeeFor(Learner learner) =>
      SchoolProfile.annualFeeByClass[learner.className] ?? 450000;

  double paidFor(Learner learner) {
    final target = annualFeeFor(learner);
    final bal = learner.balance ?? 0;
    return (target - bal).clamp(0, target);
  }

  double get totalTargetFees =>
      _learners.fold<double>(0, (sum, l) => sum + annualFeeFor(l));

  double get totalOutstandingFees =>
      _learners.fold<double>(0, (sum, l) => sum + (l.balance ?? 0));

  double get totalCollectedFees =>
      (totalTargetFees - totalOutstandingFees).clamp(0, totalTargetFees);

  double get feeCollectionRate =>
      totalTargetFees <= 0 ? 0 : (totalCollectedFees / totalTargetFees) * 100;

  Map<String, int> scoresFor(String learnerId) =>
      Map.unmodifiable(_scores[learnerId] ?? const <String, int>{});

  NectaDivisionResult resultFor(String learnerId) =>
      NectaGrading.evaluate(_scores[learnerId] ?? const <String, int>{});

  void updateScore(String learnerId, String subject, int score) {
    final clamped = score.clamp(0, 100);
    final current = Map<String, int>.from(_scores[learnerId] ?? const <String, int>{});
    current[subject] = clamped;
    _scores[learnerId] = current;
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
    Uint8List? photoBytes,
  }) {
    final id = 'MN-${(202600 + _learners.length + 1)}';
    final fee = SchoolProfile.annualFeeByClass[className] ?? 450000;
    final learner = Learner(
      id: id,
      name: name.trim(),
      className: className,
      status: 'Active',
      guardianName: guardianName.trim(),
      guardianPhone: guardianPhone.trim(),
      guardianEmail: guardianEmail.trim(),
      balance: fee,
      type: type,
      stream: stream,
      attendanceStatus: 'Present',
    );
    _learners.insert(0, learner);
    _attendance[id] = 'Present';
    if (photoBytes != null) _photos[id] = photoBytes;
    _scores[id] = <String, int>{
      for (final subject in NectaGrading.subjects.take(7)) subject: 68,
    };
    _announcements.insert(
      0,
      SchoolAnnouncement(
        id: 'ann-${DateTime.now().millisecondsSinceEpoch}',
        title: 'New learner enrolled',
        body: '${learner.name} joined ${learner.className} ${learner.stream} ($type).',
        audience: 'Administration',
        timeLabel: 'Just now',
        unread: true,
      ),
    );
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
    if (idx == -1) {
      throw ArgumentError('Student $studentId not found');
    }
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
    final ref = (controlNumber != null && controlNumber.trim().isNotEmpty)
        ? controlNumber.trim()
        : '99104${100000 + _transactions.length * 731}';
    final tx = FeeTransaction(
      id: 'TX-${1001 + _transactions.length}',
      studentId: learner.id,
      studentName: learner.name,
      className: learner.className,
      amount: amount,
      feeType: feeType,
      paymentMethod: paymentMethod,
      controlNumber: ref,
      recordedBy: _activeStaff.email,
      dateLabel: 'Today',
    );
    _transactions.insert(0, tx);
    notifyListeners();
    return tx;
  }

  void markAllAnnouncementsRead() {
    for (var i = 0; i < _announcements.length; i++) {
      _announcements[i] = _announcements[i].copyWith(unread: false);
    }
    notifyListeners();
  }

  void addAnnouncement(String title, String body, {String audience = 'All Staff'}) {
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
    notifyListeners();
  }

  void _seedInitialState() {
    const raw = <({
      String id,
      String name,
      String cls,
      String stream,
      String type,
      String att,
      double balance,
      String guardian,
      String phone,
      String email,
      int baseScore,
    })>[
      (id: 'MN-202601', name: 'Amina Juma', cls: 'Form 4', stream: 'A', type: 'Boarding', att: 'Present', balance: 150000, guardian: 'Fatuma Juma', phone: '+255 712 340 101', email: 'fatuma.juma@example.test', baseScore: 81),
      (id: 'MN-202602', name: 'Baraka John', cls: 'Form 4', stream: 'A', type: 'Day', att: 'Present', balance: 0, guardian: 'John Mushi', phone: '+255 754 210 202', email: 'john.mushi@example.test', baseScore: 76),
      (id: 'MN-202603', name: 'Neema Hassan', cls: 'Form 4', stream: 'B', type: 'Boarding', att: 'Late', balance: 240000, guardian: 'Hassan Ally', phone: '+255 765 890 303', email: 'hassan.ally@example.test', baseScore: 71),
      (id: 'MN-202604', name: 'Juma Bakari', cls: 'Form 4', stream: 'B', type: 'Day', att: 'Present', balance: 85000, guardian: 'Bakari Said', phone: '+255 784 551 404', email: 'bakari.said@example.test', baseScore: 64),
      (id: 'MN-202605', name: 'Halima Mushi', cls: 'Form 3', stream: 'A', type: 'Boarding', att: 'Present', balance: 0, guardian: 'Grace Mushi', phone: '+255 713 602 505', email: 'grace.mushi@example.test', baseScore: 79),
      (id: 'MN-202606', name: 'Josephat Lyimo', cls: 'Form 3', stream: 'A', type: 'Day', att: 'Present', balance: 180000, guardian: 'Patrick Lyimo', phone: '+255 742 330 606', email: 'patrick.lyimo@example.test', baseScore: 69),
      (id: 'MN-202607', name: 'Rehema Komba', cls: 'Form 3', stream: 'B', type: 'Boarding', att: 'Absent', balance: 300000, guardian: 'Asha Komba', phone: '+255 755 991 707', email: 'asha.komba@example.test', baseScore: 58),
      (id: 'MN-202608', name: 'Emmanuel Shayo', cls: 'Form 3', stream: 'B', type: 'Day', att: 'Present', balance: 0, guardian: 'Frank Shayo', phone: '+255 788 412 808', email: 'frank.shayo@example.test', baseScore: 74),
      (id: 'MN-202609', name: 'Zainab Kivuyo', cls: 'Form 2', stream: 'A', type: 'Boarding', att: 'Present', balance: 95000, guardian: 'Salum Kivuyo', phone: '+255 714 209 909', email: 'salum.kivuyo@example.test', baseScore: 83),
      (id: 'MN-202610', name: 'Kelvin Mrema', cls: 'Form 2', stream: 'A', type: 'Day', att: 'Present', balance: 0, guardian: 'Tumaini Mrema', phone: '+255 762 418 010', email: 'tumaini.mrema@example.test', baseScore: 66),
      (id: 'MN-202611', name: 'Upendo Materu', cls: 'Form 2', stream: 'B', type: 'Boarding', att: 'Late', balance: 120000, guardian: 'Daniel Materu', phone: '+255 753 774 111', email: 'daniel.materu@example.test', baseScore: 72),
      (id: 'MN-202612', name: 'Salum Ngowi', cls: 'Form 2', stream: 'B', type: 'Day', att: 'Present', balance: 50000, guardian: 'Said Ngowi', phone: '+255 782 610 212', email: 'said.ngowi@example.test', baseScore: 61),
      (id: 'MN-202613', name: 'Lightness Urio', cls: 'Form 1', stream: 'A', type: 'Boarding', att: 'Present', balance: 0, guardian: 'Godfrey Urio', phone: '+255 719 883 313', email: 'godfrey.urio@example.test', baseScore: 78),
      (id: 'MN-202614', name: 'Daniel Mwangosi', cls: 'Form 1', stream: 'A', type: 'Day', att: 'Present', balance: 150000, guardian: 'Asha Mwangosi', phone: '+255 758 145 414', email: 'asha.mwangosi@example.test', baseScore: 68),
      (id: 'MN-202615', name: 'Happiness Sanare', cls: 'Form 1', stream: 'B', type: 'Boarding', att: 'Present', balance: 75000, guardian: 'Peter Sanare', phone: '+255 744 509 515', email: 'peter.sanare@example.test', baseScore: 75),
      (id: 'MN-202616', name: 'Ibrahim Kizinga', cls: 'Form 1', stream: 'B', type: 'Day', att: 'Absent', balance: 200000, guardian: 'Mussa Kizinga', phone: '+255 786 301 616', email: 'mussa.kizinga@example.test', baseScore: 55),
    ];

    for (var i = 0; i < raw.length; i++) {
      final item = raw[i];
      _learners.add(
        Learner(
          id: item.id,
          name: item.name,
          className: item.cls,
          status: 'Active',
          guardianName: item.guardian,
          guardianPhone: item.phone,
          guardianEmail: item.email,
          balance: item.balance,
          type: item.type,
          stream: item.stream,
          attendanceStatus: item.att,
        ),
      );
      _attendance[item.id] = item.att;
      final subjectMap = <String, int>{};
      for (var s = 0; s < NectaGrading.subjects.length; s++) {
        final offset = ((i * 5 + s * 7) % 19) - 9;
        subjectMap[NectaGrading.subjects[s]] = (item.baseScore + offset).clamp(28, 96);
      }
      _scores[item.id] = subjectMap;
    }

    _transactions.addAll(const <FeeTransaction>[
      FeeTransaction(
        id: 'TX-1004',
        studentId: 'MN-202602',
        studentName: 'Baraka John',
        className: 'Form 4',
        amount: 300000,
        feeType: 'Tuition',
        paymentMethod: 'M-Pesa',
        controlNumber: '991042819402',
        recordedBy: 'bursar@shule.pro',
        dateLabel: 'Today · 09:15',
      ),
      FeeTransaction(
        id: 'TX-1003',
        studentId: 'MN-202605',
        studentName: 'Halima Mushi',
        className: 'Form 3',
        amount: 600000,
        feeType: 'Boarding & Tuition',
        paymentMethod: 'NMB Bank',
        controlNumber: '991042814118',
        recordedBy: 'bursar@shule.pro',
        dateLabel: 'Yesterday',
      ),
      FeeTransaction(
        id: 'TX-1002',
        studentId: 'MN-202601',
        studentName: 'Amina Juma',
        className: 'Form 4',
        amount: 450000,
        feeType: 'Tuition',
        paymentMethod: 'CRDB Bank',
        controlNumber: '991042809771',
        recordedBy: 'admin@shule.pro',
        dateLabel: '2 days ago',
      ),
      FeeTransaction(
        id: 'TX-1001',
        studentId: 'MN-202613',
        studentName: 'Lightness Urio',
        className: 'Form 1',
        amount: 450000,
        feeType: 'Tuition',
        paymentMethod: 'Tigo Pesa',
        controlNumber: '991042803510',
        recordedBy: 'bursar@shule.pro',
        dateLabel: '4 days ago',
      ),
    ]);

    _announcements.addAll(const <SchoolAnnouncement>[
      SchoolAnnouncement(
        id: 'ann-1',
        title: 'Form 4 NECTA Mock Timetable Published',
        body: 'All subject masters should verify lab apparatus allocations before Friday 15:00 EAT.',
        audience: 'Academic Staff',
        timeLabel: '2h ago',
        unread: true,
      ),
      SchoolAnnouncement(
        id: 'ann-2',
        title: 'Term 2 Fee Reconciliation Reminder',
        body: 'Bursar desk closes daily at 16:30. Print updated fee statements directly from the Learners tab.',
        audience: 'Administration & Bursar',
        timeLabel: 'Yesterday',
        unread: true,
      ),
      SchoolAnnouncement(
        id: 'ann-3',
        title: 'Morning Assembly & Roll Call',
        body: 'Class teachers are reminded to complete Form 1–4 attendance before 08:15 EAT.',
        audience: 'All Teachers',
        timeLabel: '2 days ago',
        unread: false,
      ),
    ]);
  }
}
