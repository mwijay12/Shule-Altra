/// Unit tests for the single-school workspace, NECTA CSEE division calculator,
/// adaptive ThemeController, and vector PDF builders.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/theme_controller.dart';
import 'package:shule_altra_mobile/data/demo_school_store.dart';
import 'package:shule_altra_mobile/services/device_services.dart';

void main() {
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

  test('SchoolWorkspace enrols learners, records payments and updates attendance', () {
    final workspace = SchoolWorkspace();
    final initialCount = workspace.learners.length;

    final created = workspace.enrolLearner(
      name: 'Neema Mwakalinga',
      className: 'Form 2',
      stream: 'A',
      type: 'Boarding',
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
      paymentMethod: 'M-Pesa',
    );
    expect(tx.amount, 200000);
    final updated = workspace.learners.firstWhere((l) => l.id == created.id);
    expect(updated.balance, 250000);

    workspace.setAttendance(created.id, 'Late');
    expect(workspace.attendanceFor(created.id), 'Late');
  });

  test('ThemeController defaults to system and switches modes cleanly', () {
    final controller = ThemeController(persist: false);
    expect(controller.mode, ThemeMode.system);
    controller.setMode(ThemeMode.dark);
    expect(controller.mode, ThemeMode.dark);
    controller.setMode(ThemeMode.light);
    expect(controller.mode, ThemeMode.light);
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
      learners: workspace.learners,
      attendanceOf: workspace.attendanceFor,
    );
    final timetable = await ShulePdfService.buildTimetablePdf(className: 'Form 4', stream: 'A');

    for (final pdf in [report, statement, idCard, register, timetable]) {
      expect(pdf.length, greaterThan(500));
      // Every valid PDF starts with %PDF
      expect(String.fromCharCodes(pdf.take(4)), '%PDF');
    }
  });
}
