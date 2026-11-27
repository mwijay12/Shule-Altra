/// Native device capabilities: PDF printing, local notifications, gallery &
/// camera passport photos, and runtime Android permissions.
///
/// Every native bridge fails gracefully when run inside headless widget tests
/// or unsupported platforms so CI tests never throw MissingPluginException.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:image_picker/image_picker.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:permission_handler/permission_handler.dart';
import 'package:printing/printing.dart';

import '../data/demo_school_store.dart';
import '../data/learner.dart';
import '../data/sample_timetable.dart';
import '../format.dart';

bool get _isMobilePlatform =>
    !kIsWeb &&
    (defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS);

/// Vector PDF builders and native Android print / share launcher.
abstract final class ShulePdfService {
  static final PdfColor _navy = PdfColor.fromHex('#1256C4');
  static final PdfColor _sky = PdfColor.fromHex('#EAF3FF');
  static final PdfColor _ink = PdfColor.fromHex('#131820');
  static final PdfColor _muted = PdfColor.fromHex('#506077');
  static final PdfColor _border = PdfColor.fromHex('#D8E2EE');

  static pw.Widget _letterhead(String title, String subtitle) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(16),
      decoration: pw.BoxDecoration(
        color: _navy,
        borderRadius: pw.BorderRadius.circular(10),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                SchoolProfile.schoolName.toUpperCase(),
                style: pw.TextStyle(
                  color: PdfColors.white,
                  fontSize: 15,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 3),
              pw.Text(
                '${SchoolProfile.location} · ${SchoolProfile.motto}',
                style: const pw.TextStyle(color: PdfColors.white, fontSize: 9),
              ),
            ],
          ),
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.end,
            children: [
              pw.Text(
                title,
                style: pw.TextStyle(
                  color: PdfColors.white,
                  fontSize: 12,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 2),
              pw.Text(
                subtitle,
                style: const pw.TextStyle(color: PdfColors.white, fontSize: 9),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static Future<Uint8List> buildReportCardPdf({
    required Learner learner,
    required Map<String, int> scores,
    required NectaDivisionResult result,
  }) async {
    final doc = pw.Document(title: 'Report Card - ${learner.name}');
    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(28),
        build: (context) => [
          _letterhead('STUDENT REPORT CARD', SchoolProfile.termLabel),
          pw.SizedBox(height: 16),
          pw.Container(
            padding: const pw.EdgeInsets.all(12),
            decoration: pw.BoxDecoration(
              color: _sky,
              borderRadius: pw.BorderRadius.circular(8),
              border: pw.Border.all(color: _border),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      learner.name,
                      style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: _ink),
                    ),
                    pw.Text(
                      'ID: ${learner.id} · ${learner.className} ${learner.stream} · ${learner.type}',
                      style: pw.TextStyle(fontSize: 10, color: _muted),
                    ),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    pw.Text(
                      result.division,
                      style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold, color: _navy),
                    ),
                    pw.Text(
                      'Points: ${result.points} · Avg: ${result.average.toStringAsFixed(1)}%',
                      style: pw.TextStyle(fontSize: 10, color: _ink),
                    ),
                  ],
                ),
              ],
            ),
          ),
          pw.SizedBox(height: 16),
          pw.TableHelper.fromTextArray(
            headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 10),
            headerDecoration: pw.BoxDecoration(color: _navy),
            cellStyle: pw.TextStyle(fontSize: 10, color: _ink),
            border: pw.TableBorder.all(color: _border),
            headers: const ['Subject', 'Score (%)', 'NECTA Grade', 'Points', 'Remark'],
            data: scores.entries.map((entry) {
              final grade = NectaGrading.gradeLetter(entry.value);
              final pts = NectaGrading.gradePoints(entry.value);
              final remark = switch (grade) {
                'A' => 'Excellent',
                'B' => 'Very Good',
                'C' => 'Good',
                'D' => 'Satisfactory',
                _ => 'Needs Improvement',
              };
              return [entry.key, '${entry.value}', grade, '$pts', remark];
            }).toList(),
          ),
          pw.SizedBox(height: 24),
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text('Class Teacher Signature: _______________________', style: pw.TextStyle(fontSize: 10, color: _muted)),
              pw.Text('Head Master Signature: _______________________', style: pw.TextStyle(fontSize: 10, color: _muted)),
            ],
          ),
        ],
      ),
    );
    return doc.save();
  }

  static Future<Uint8List> buildFeeStatementPdf({
    required Learner learner,
    required double annualFee,
    required double paid,
    required List<FeeTransaction> transactions,
  }) async {
    final doc = pw.Document(title: 'Fee Statement - ${learner.name}');
    final learnerTxs = transactions.where((tx) => tx.studentId == learner.id).toList();
    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(28),
        build: (context) => [
          _letterhead('OFFICIAL FEE STATEMENT', SchoolProfile.termLabel),
          pw.SizedBox(height: 16),
          pw.Text(learner.name, style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: _ink)),
          pw.Text(
            'ID: ${learner.id} · ${learner.className} ${learner.stream} · Guardian: ${learner.guardianName} (${learner.guardianPhone})',
            style: pw.TextStyle(fontSize: 10, color: _muted),
          ),
          pw.SizedBox(height: 14),
          pw.Row(
            children: [
              _pdfMetric('Annual Fee', formatTzs(annualFee)),
              pw.SizedBox(width: 10),
              _pdfMetric('Total Paid', formatTzs(paid)),
              pw.SizedBox(width: 10),
              _pdfMetric('Balance Due', formatTzs(learner.balance ?? 0)),
            ],
          ),
          pw.SizedBox(height: 16),
          pw.Text('Payment History', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: _ink)),
          pw.SizedBox(height: 8),
          if (learnerTxs.isEmpty)
            pw.Text('No individual payment entries recorded yet for this term.', style: pw.TextStyle(fontSize: 10, color: _muted))
          else
            pw.TableHelper.fromTextArray(
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 10),
              headerDecoration: pw.BoxDecoration(color: _navy),
              cellStyle: pw.TextStyle(fontSize: 10, color: _ink),
              border: pw.TableBorder.all(color: _border),
              headers: const ['Receipt', 'Date', 'Fee Type', 'Method', 'Control No.', 'Amount'],
              data: learnerTxs
                  .map((tx) => [tx.id, tx.dateLabel, tx.feeType, tx.paymentMethod, tx.controlNumber, formatTzs(tx.amount)])
                  .toList(),
            ),
        ],
      ),
    );
    return doc.save();
  }

  static Future<Uint8List> buildStudentIdCardPdf({
    required Learner learner,
    Uint8List? photoBytes,
  }) async {
    final doc = pw.Document(title: 'Student ID - ${learner.name}');
    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a5,
        margin: const pw.EdgeInsets.all(24),
        build: (context) => pw.Center(
          child: pw.Container(
            width: 310,
            padding: const pw.EdgeInsets.all(16),
            decoration: pw.BoxDecoration(
              borderRadius: pw.BorderRadius.circular(14),
              border: pw.Border.all(color: _navy, width: 1.5),
            ),
            child: pw.Column(
              mainAxisSize: pw.MainAxisSize.min,
              children: [
                pw.Container(
                  width: double.infinity,
                  padding: const pw.EdgeInsets.all(10),
                  decoration: pw.BoxDecoration(color: _navy, borderRadius: pw.BorderRadius.circular(8)),
                  child: pw.Column(
                    children: [
                      pw.Text(
                        SchoolProfile.schoolName.toUpperCase(),
                        style: pw.TextStyle(color: PdfColors.white, fontSize: 10, fontWeight: pw.FontWeight.bold),
                      ),
                      pw.Text('OFFICIAL STUDENT IDENTITY CARD', style: const pw.TextStyle(color: PdfColors.white, fontSize: 8)),
                    ],
                  ),
                ),
                pw.SizedBox(height: 14),
                pw.Row(
                  children: [
                    pw.Container(
                      width: 68,
                      height: 82,
                      decoration: pw.BoxDecoration(
                        color: _sky,
                        borderRadius: pw.BorderRadius.circular(8),
                        border: pw.Border.all(color: _border),
                      ),
                      alignment: pw.Alignment.center,
                      child: photoBytes != null
                          ? pw.ClipRRect(
                              horizontalRadius: 8,
                              verticalRadius: 8,
                              child: pw.Image(pw.MemoryImage(photoBytes), fit: pw.BoxFit.cover, width: 68, height: 82),
                            )
                          : pw.Text(learner.initials, style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold, color: _navy)),
                    ),
                    pw.SizedBox(width: 14),
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(learner.name, style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold, color: _ink)),
                          pw.SizedBox(height: 4),
                          pw.Text('ID: ${learner.id}', style: pw.TextStyle(fontSize: 9.5, color: _navy, fontWeight: pw.FontWeight.bold)),
                          pw.Text('Class: ${learner.className} ${learner.stream}', style: pw.TextStyle(fontSize: 9.5, color: _ink)),
                          pw.Text('Category: ${learner.type}', style: pw.TextStyle(fontSize: 9.5, color: _muted)),
                          pw.Text('Guardian: ${learner.guardianPhone}', style: pw.TextStyle(fontSize: 9, color: _muted)),
                        ],
                      ),
                    ),
                  ],
                ),
                pw.SizedBox(height: 12),
                pw.Divider(color: _border),
                pw.Text('Valid for Academic Year 2026 · Shule Altra', style: pw.TextStyle(fontSize: 8, color: _muted)),
              ],
            ),
          ),
        ),
      ),
    );
    return doc.save();
  }

  static Future<Uint8List> buildClassRegisterPdf({
    required String title,
    required List<Learner> learners,
    required String Function(String id) attendanceOf,
  }) async {
    final doc = pw.Document(title: title);
    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(24),
        build: (context) => [
          _letterhead(title.toUpperCase(), '${learners.length} learners · ${SchoolProfile.termLabel}'),
          pw.SizedBox(height: 16),
          pw.TableHelper.fromTextArray(
            headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 9.5),
            headerDecoration: pw.BoxDecoration(color: _navy),
            cellStyle: pw.TextStyle(fontSize: 9, color: _ink),
            border: pw.TableBorder.all(color: _border),
            headers: const ['ID', 'Student Name', 'Class', 'Type', 'Attendance', 'Balance'],
            data: learners
                .map(
                  (l) => [
                    l.id,
                    l.name,
                    '${l.className} ${l.stream}',
                    l.type,
                    attendanceOf(l.id),
                    (l.balance ?? 0) == 0 ? 'Paid' : formatTzs(l.balance),
                  ],
                )
                .toList(),
          ),
        ],
      ),
    );
    return doc.save();
  }

  static Future<Uint8List> buildTimetablePdf({required String className, required String stream}) async {
    final doc = pw.Document(title: 'Timetable - $className $stream');
    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4.landscape,
        margin: const pw.EdgeInsets.all(24),
        build: (context) => [
          _letterhead('CLASS TIMETABLE · $className $stream', SchoolProfile.termLabel),
          pw.SizedBox(height: 16),
          for (final entry in sampleTimetable.entries) ...[
            pw.Text(entry.key, style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: _navy)),
            pw.SizedBox(height: 4),
            pw.TableHelper.fromTextArray(
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 9),
              headerDecoration: pw.BoxDecoration(color: _navy),
              cellStyle: pw.TextStyle(fontSize: 9, color: _ink),
              border: pw.TableBorder.all(color: _border),
              headers: const ['Time', 'Subject', 'Teacher'],
              data: entry.value.map((l) => [l.time, l.subject, l.teacher]).toList(),
            ),
            pw.SizedBox(height: 10),
          ],
        ],
      ),
    );
    return doc.save();
  }

  static pw.Widget _pdfMetric(String label, String value) {
    return pw.Expanded(
      child: pw.Container(
        padding: const pw.EdgeInsets.all(10),
        decoration: pw.BoxDecoration(
          color: _sky,
          borderRadius: pw.BorderRadius.circular(8),
          border: pw.Border.all(color: _border),
        ),
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(label, style: pw.TextStyle(fontSize: 8.5, color: _muted)),
            pw.SizedBox(height: 3),
            pw.Text(value, style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: _navy)),
          ],
        ),
      ),
    );
  }

  /// Opens the native Android print preview / Save-as-PDF sheet.
  static Future<bool> printDocument({
    required String name,
    required Future<Uint8List> Function() build,
  }) async {
    try {
      await Printing.layoutPdf(name: name, onLayout: (_) => build());
      return true;
    } on MissingPluginException {
      return false;
    } catch (_) {
      return false;
    }
  }
}

/// Native Android local notification helper.
abstract final class ShuleNotificationService {
  static final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized || !_isMobilePlatform) return;
    try {
      const settings = InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      );
      await _plugin.initialize(settings);
      _initialized = true;
    } on MissingPluginException {
      // Ignored in tests.
    } catch (_) {
      // Keep app booting even if notification setup is unavailable.
    }
  }

  static Future<bool> sendAlert({required String title, required String body}) async {
    if (!_isMobilePlatform) return false;
    try {
      await initialize();
      const details = NotificationDetails(
        android: AndroidNotificationDetails(
          'shule_altra_alerts',
          'Shule Altra School Alerts',
          channelDescription: 'Attendance reminders, fee receipts and school notices',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
      );
      await _plugin.show(
        DateTime.now().millisecondsSinceEpoch.remainder(100000),
        title,
        body,
        details,
      );
      return true;
    } on MissingPluginException {
      return false;
    } catch (_) {
      return false;
    }
  }
}

@immutable
class DevicePermissionSnapshot {
  const DevicePermissionSnapshot({
    required this.notifications,
    required this.photos,
    required this.camera,
  });

  final String notifications;
  final String photos;
  final String camera;

  static const DevicePermissionSnapshot initial = DevicePermissionSnapshot(
    notifications: 'Ask on tap',
    photos: 'Ask on tap',
    camera: 'Ask on tap',
  );
}

/// Gallery/camera photo picker and runtime permission manager.
abstract final class ShuleMediaService {
  static final ImagePicker _picker = ImagePicker();

  static String _label(PermissionStatus status) {
    if (status.isGranted || status.isLimited) return 'Allowed';
    if (status.isPermanentlyDenied) return 'Blocked in Settings';
    if (status.isRestricted) return 'Restricted';
    return 'Not allowed yet';
  }

  static Future<DevicePermissionSnapshot> readStatus() async {
    if (!_isMobilePlatform) return DevicePermissionSnapshot.initial;
    try {
      final notif = await Permission.notification.status;
      final photos = await Permission.photos.status;
      final camera = await Permission.camera.status;
      return DevicePermissionSnapshot(
        notifications: _label(notif),
        photos: _label(photos),
        camera: _label(camera),
      );
    } on MissingPluginException {
      return DevicePermissionSnapshot.initial;
    } catch (_) {
      return DevicePermissionSnapshot.initial;
    }
  }

  static Future<String> requestNotifications() async {
    if (!_isMobilePlatform) return 'Supported on Android / iOS devices';
    try {
      final status = await Permission.notification.request();
      return _label(status);
    } on MissingPluginException {
      return 'Unavailable';
    } catch (_) {
      return 'Unavailable';
    }
  }

  static Future<String> requestPhotos() async {
    if (!_isMobilePlatform) return 'Supported on Android / iOS devices';
    try {
      var status = await Permission.photos.request();
      if (!status.isGranted && !status.isLimited) {
        status = await Permission.storage.request();
      }
      return _label(status);
    } on MissingPluginException {
      return 'Unavailable';
    } catch (_) {
      return 'Unavailable';
    }
  }

  static Future<String> requestCamera() async {
    if (!_isMobilePlatform) return 'Supported on Android / iOS devices';
    try {
      final status = await Permission.camera.request();
      return _label(status);
    } on MissingPluginException {
      return 'Unavailable';
    } catch (_) {
      return 'Unavailable';
    }
  }

  static Future<Uint8List?> pickPhoto({required bool fromCamera}) async {
    if (!_isMobilePlatform) return null;
    try {
      final picked = await _picker.pickImage(
        source: fromCamera ? ImageSource.camera : ImageSource.gallery,
        maxWidth: 720,
        maxHeight: 720,
        imageQuality: 84,
      );
      if (picked == null) return null;
      return await picked.readAsBytes();
    } on MissingPluginException {
      return null;
    } catch (_) {
      return null;
    }
  }
}
