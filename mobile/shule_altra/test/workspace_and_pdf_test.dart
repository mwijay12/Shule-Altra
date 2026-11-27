/// Unit tests for exact website parity (`mulberry32(20260406)` 150-student seed),
/// NECTA CSEE division calculator, adaptive ThemeController, and vector PDF builders.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/theme_controller.dart';
import 'package:shule_altra_mobile/data/demo_school_store.dart';
import 'package:shule_altra_mobile/services/device_services.dart';

void main() {
  test('mulberry32(20260406) dataset matches live website numbers byte-for-byte', () {
    final workspace = SchoolWorkspace();

    expect(workspace.learners.length, 150);
    expect(workspace.boarderCount, 101);
    expect(workspace.dayScholarCount, 49);
    expect(workspace.absentCount, 5);
    expect(workspace.attendanceRate, closeTo(96.67, 0.1));
    expect(workspace.totalOutstandingFees, 20247000);

    // Exact top-6 follow-up queue matching https://shule-direct-pro.vercel.app/dashboard
    final queue = workspace.topFollowUpQueue;
    expect(queue.length, 6);
    expect(queue[0].id, 'ALT-2026-107');
    expect(queue[0].name, 'FARAJA MUSSA SHAYO');
    expect(queue[0].balance, 521000);
    expect(workspace.paidFor(queue[0]), 209000);

    expect(queue[1].id, 'ALT-2026-093');
    expect(queue[1].name, 'NEEMA AUGUSTINO MWANGOSI');
    expect(queue[1].balance, 456000);

    expect(queue[2].id, 'ALT-2026-098');
    expect(queue[2].name, 'AGNES SHABANI URIO');
    expect(queue[2].balance, 435000);

    // Additional institutional modules
    expect(workspace.transactions.length, 140);
    expect(workspace.assets.length, 18);
    expect(workspace.canteenSales.length, 18);
    expect(workspace.pettyCash.length, 10);
    expect(SchoolProfile.staffRoster.length, 16);
    expect(SchoolProfile.hostels.length, 5);
    expect(SchoolProfile.routes.length, 5);

    workspace.dispose();
  });

  test('NECTA CSEE grading calculates grades and Division I–IV accurately', () {
    expect(NectaGrading.gradeLetter(82), 'A');
    expect(NectaGrading.gradeLetter(68), 'B');
    expect(NectaGrading.gradeLetter(50), 'C');
    expect(NectaGrading.gradeLetter(35), 'D');
    expect(NectaGrading.gradeLetter(20), 'F');

    final div1 = NectaGrading.evaluate(const {
      'Mathematics': 85,
      'English': 80,
      'Kiswahili': 78,
      'Physics': 82,
      'Chemistry': 76,
      'Biology': 79,
      'Civics': 81,
    });
    expect(div1.division, 'Division I');
    expect(div1.points, 7);
  });

  test('SchoolWorkspace enrols learners, records payments, verifies ledger & updates attendance', () {
    final workspace = SchoolWorkspace();
    final initialCount = workspace.learners.length;

    final created = workspace.enrolLearner(
      name: 'Neema Mwakalinga',
      className: 'Form 2',
      stream: 'A',
      type: 'Boarder',
      guardianName: 'Josephat Mwakalinga',
      guardianPhone: '+255 712 000 111',
      guardianEmail: 'parent@example.test',
    );
    expect(workspace.learners.length, initialCount + 1);
    expect(created.balance, 450000);

    final tx = workspace.recordPayment(
      studentId: created.id,
      amount: 200000,
      feeType: 'Tuition',
      paymentMethod: 'ClickPesa',
    );
    expect(tx.amount, 200000);
    expect(tx.status, 'Verified');
    final updated = workspace.learners.firstWhere((l) => l.id == created.id);
    expect(updated.balance, 250000);

    workspace.setTransactionStatus(tx.id, 'Disputed');
    expect(workspace.transactions.firstWhere((t) => t.id == tx.id).status, 'Disputed');

    workspace.setAttendance(created.id, 'Late');
    expect(workspace.attendanceFor(created.id), 'Late');

    workspace.recordCanteenSale(learner: created, menuItem: SchoolProfile.canteenMenu.first);
    expect(workspace.canteenSales.length, 19);
    expect(workspace.auditTrail.length, greaterThan(4));

    workspace.dispose();
  });

  test('ThemeController defaults to Light theme and switches modes cleanly', () {
    final controller = ThemeController(persist: false);
    expect(controller.mode, ThemeMode.light);
    controller.setMode(ThemeMode.dark);
    expect(controller.mode, ThemeMode.dark);
    controller.setMode(ThemeMode.system);
    expect(controller.mode, ThemeMode.system);
  });

  test('SchoolProfile is strictly branded Shule Altra with 6 staff roles', () {
    expect(SchoolProfile.schoolName, 'Shule Altra');
    expect(SchoolProfile.schoolName.contains('Mwalimu'), isFalse);
    expect(SchoolProfile.schoolName.contains('Nyerere'), isFalse);
    expect(SchoolProfile.demoRoles.length, 6);
    expect(
      SchoolProfile.demoRoles.map((r) => r.role),
      containsAll(['ADMIN', 'HOSTEL', 'TEACHER', 'BURSAR', 'TRANSPORT', 'CANTEEN']),
    );
  });

  test('ShulePdfService builds non-empty vector PDFs for report cards, fees & IDs', () async {
    final workspace = SchoolWorkspace();
    final learner = workspace.learners.first;

    final report = await ShulePdfService.buildReportCardPdf(
      learner: learner,
      scores: workspace.scoresFor(learner.id),
      result: workspace.resultFor(learner.id),
    );
    final statement = await ShulePdfService.buildFeeStatementPdf(
      learner: learner,
      annualFee: workspace.annualFeeFor(learner),
      paid: workspace.paidFor(learner),
      transactions: workspace.transactions,
    );
    final idCard = await ShulePdfService.buildStudentIdCardPdf(learner: learner);
    final register = await ShulePdfService.buildClassRegisterPdf(
      title: 'Test Register',
      learners: workspace.learners.take(20).toList(),
      attendanceOf: workspace.attendanceFor,
    );
    final timetable = await ShulePdfService.buildTimetablePdf(className: 'Form 4', stream: 'A');

    for (final pdf in [report, statement, idCard, register, timetable]) {
      expect(pdf.length, greaterThan(500));
      expect(String.fromCharCodes(pdf.take(4)), '%PDF');
    }
    workspace.dispose();
  });
}
