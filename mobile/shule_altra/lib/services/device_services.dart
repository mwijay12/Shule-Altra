/// Native device capabilities: website-parity vector PDF engine, Android
/// printing, local notifications, gallery & camera passport photos, and
/// runtime Android permissions.
///
/// Every PDF follows the exact design system of the website's `src/lib/pdf/`
/// vector kit (`kit.ts`, `report-card.ts`, `fee-statement.ts`, `id-card.ts`,
/// `timetable.ts`, `tabular-report.ts`) branded strictly as **Shule Altra**.
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

/// Vector PDF builders matching `src/lib/pdf/*.ts` on the live website.
abstract final class ShulePdfService {
  // Exact website PDF palette (`src/lib/pdf/kit.ts` COLORS & CREST)
  static final PdfColor _navy = PdfColor.fromHex('#12315E'); // shade(primary, 0.55)
  static final PdfColor _primary = PdfColor.fromHex('#1F5AA8'); // --primary
  static final PdfColor _accent = PdfColor.fromHex('#7D5CE0'); // --accent
  static final PdfColor _gold = PdfColor.fromHex('#D4B04F'); // CREST.gold
  static final PdfColor _ink = PdfColor.fromHex('#1F1F1F');
  static final PdfColor _muted = PdfColor.fromHex('#666666');
  static final PdfColor _line = PdfColor.fromHex('#DEDEDE');
  static final PdfColor _soft = PdfColor.fromHex('#F7F7F7');
  static final PdfColor _success = PdfColor.fromHex('#179966');
  static final PdfColor _danger = PdfColor.fromHex('#CC383D');
  static final PdfColor _warning = PdfColor.fromHex('#D98C1A');

  static String _ascii(String text) => text
      .replaceAll('·', '|')
      .replaceAll('–', '-')
      .replaceAll('—', '-')
      .replaceAll('−', '-')
      .replaceAll('‘', "'")
      .replaceAll('’', "'")
      .replaceAll('“', '"')
      .replaceAll('”', '"')
      .replaceAll(RegExp(r'[^\x20-\x7E]'), '');

  static String _issuedDate() {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final now = DateTime.now();
    return '${now.day.toString().padLeft(2, '0')} ${months[now.month - 1]} ${now.year}';
  }

  /// Vector school crest emblem (shield + gold rim + SA monogram) matching `drawCrest`.
  static pw.Widget _crest({double size = 40}) {
    return pw.Container(
      width: size,
      height: size * 1.12,
      decoration: pw.BoxDecoration(
        color: PdfColors.white,
        borderRadius: pw.BorderRadius.only(
          topLeft: const pw.Radius.circular(5),
          topRight: const pw.Radius.circular(5),
          bottomLeft: pw.Radius.circular(size * 0.48),
          bottomRight: pw.Radius.circular(size * 0.48),
        ),
        border: pw.Border.all(color: _gold, width: 1.8),
      ),
      alignment: pw.Alignment.center,
      child: pw.Column(
        mainAxisAlignment: pw.MainAxisAlignment.center,
        children: [
          pw.Container(
            width: size * 0.24,
            height: size * 0.24,
            decoration: pw.BoxDecoration(color: _gold, shape: pw.BoxShape.circle),
          ),
          pw.SizedBox(height: 2),
          pw.Container(
            width: size * 0.56,
            height: size * 0.26,
            decoration: pw.BoxDecoration(
              color: _navy,
              borderRadius: pw.BorderRadius.circular(2),
            ),
            alignment: pw.Alignment.center,
            child: pw.Text(
              'SA',
              style: pw.TextStyle(
                color: _gold,
                fontSize: (size * 0.20).clamp(5.0, 9.5),
                fontWeight: pw.FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Exact website letterhead: deep navy band + 62%/38% primary/accent bar + crest.
  static pw.Widget _letterhead({
    required String title,
    required String subtitle,
    required String reference,
  }) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.stretch,
      children: [
        pw.Container(
          color: _navy,
          padding: const pw.EdgeInsets.fromLTRB(18, 14, 18, 14),
          child: pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              _crest(size: 38),
              pw.SizedBox(width: 14),
              pw.Expanded(
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      _ascii(SchoolProfile.schoolName.toUpperCase()),
                      style: pw.TextStyle(
                        color: PdfColors.white,
                        fontSize: 13.5,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      _ascii(SchoolProfile.location),
                      style: const pw.TextStyle(color: PdfColors.white, fontSize: 7.5),
                    ),
                    pw.Text(
                      _ascii(SchoolProfile.contacts),
                      style: const pw.TextStyle(color: PdfColors.white, fontSize: 7.5),
                    ),
                    pw.Text(
                      _ascii(SchoolProfile.registration),
                      style: const pw.TextStyle(color: PdfColors.grey300, fontSize: 6.8),
                    ),
                  ],
                ),
              ),
              pw.SizedBox(width: 10),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.end,
                children: [
                  pw.Text(
                    _ascii(title.toUpperCase()),
                    style: pw.TextStyle(
                      color: PdfColors.white,
                      fontSize: 10,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.SizedBox(height: 3),
                  pw.Text(
                    _ascii('Ref $reference'),
                    style: const pw.TextStyle(color: PdfColors.grey300, fontSize: 7),
                  ),
                  pw.Text(
                    _ascii('Issued ${_issuedDate()}'),
                    style: const pw.TextStyle(color: PdfColors.grey300, fontSize: 7),
                  ),
                ],
              ),
            ],
          ),
        ),
        // Exact website 62% primary blue + 38% brand violet bar
        pw.Row(
          children: [
            pw.Expanded(flex: 62, child: pw.Container(height: 5, color: _primary)),
            pw.Expanded(flex: 38, child: pw.Container(height: 5, color: _accent)),
          ],
        ),
        pw.SizedBox(height: 8),
        pw.Text(
          _ascii(subtitle),
          style: pw.TextStyle(fontSize: 8.5, color: _muted),
        ),
        pw.SizedBox(height: 10),
      ],
    );
  }

  static pw.Widget _sectionTitle(String title) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(top: 10, bottom: 8),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.stretch,
        children: [
          pw.Row(
            children: [
              pw.Container(width: 3, height: 12, color: _primary),
              pw.SizedBox(width: 6),
              pw.Text(
                _ascii(title.toUpperCase()),
                style: pw.TextStyle(
                  fontSize: 8.8,
                  fontWeight: pw.FontWeight.bold,
                  color: _navy,
                ),
              ),
            ],
          ),
          pw.SizedBox(height: 4),
          pw.Container(height: 0.7, color: _line),
        ],
      ),
    );
  }

  static pw.Widget _keyValueGrid(List<({String label, String value, bool emphasis})> entries) {
    final rows = <pw.Widget>[];
    for (var i = 0; i < entries.length; i += 3) {
      final slice = entries.skip(i).take(3).toList();
      rows.add(
        pw.Padding(
          padding: const pw.EdgeInsets.only(bottom: 8),
          child: pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              for (var c = 0; c < 3; c++) ...[
                if (c > 0)
                  pw.Container(
                    width: 0.6,
                    height: 24,
                    margin: const pw.EdgeInsets.symmetric(horizontal: 8),
                    color: _line,
                  ),
                pw.Expanded(
                  child: c < slice.length
                      ? pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Text(
                              _ascii(slice[c].label.toUpperCase()),
                              style: pw.TextStyle(
                                fontSize: 6.5,
                                fontWeight: pw.FontWeight.bold,
                                color: _muted,
                              ),
                            ),
                            pw.SizedBox(height: 2),
                            pw.Text(
                              _ascii(slice[c].value),
                              style: pw.TextStyle(
                                fontSize: slice[c].emphasis ? 9.5 : 8.8,
                                fontWeight: slice[c].emphasis
                                    ? pw.FontWeight.bold
                                    : pw.FontWeight.normal,
                                color: slice[c].emphasis ? _navy : _ink,
                              ),
                            ),
                          ],
                        )
                      : pw.SizedBox(),
                ),
              ],
            ],
          ),
        ),
      );
    }
    return pw.Column(children: rows);
  }

  static pw.Widget _summaryCard(String label, String value, PdfColor accent) {
    return pw.Expanded(
      child: pw.Container(
        decoration: pw.BoxDecoration(
          color: _soft,
          border: pw.Border.all(color: _line, width: 0.6),
        ),
        child: pw.Row(
          children: [
            pw.Container(width: 3, height: 42, color: accent),
            pw.Expanded(
              child: pw.Padding(
                padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      _ascii(label.toUpperCase()),
                      style: pw.TextStyle(
                        fontSize: 6.5,
                        fontWeight: pw.FontWeight.bold,
                        color: _muted,
                      ),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      _ascii(value),
                      style: pw.TextStyle(
                        fontSize: 12,
                        fontWeight: pw.FontWeight.bold,
                        color: accent,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static pw.Widget _signatureRow(List<({String role, String name})> signatures) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(top: 18),
      child: pw.Row(
        children: [
          for (var i = 0; i < signatures.length; i++) ...[
            if (i > 0) pw.SizedBox(width: 18),
            pw.Expanded(
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Container(height: 0.7, color: _muted),
                  pw.SizedBox(height: 4),
                  pw.Text(
                    _ascii(signatures[i].name),
                    style: pw.TextStyle(
                      fontSize: 7.8,
                      fontWeight: pw.FontWeight.bold,
                      color: _ink,
                    ),
                  ),
                  pw.Text(
                    _ascii(signatures[i].role.toUpperCase()),
                    style: pw.TextStyle(fontSize: 6.3, color: _muted),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  static pw.Widget _footer(pw.Context context, String note) {
    return pw.Container(
      margin: const pw.EdgeInsets.only(top: 10),
      padding: const pw.EdgeInsets.fromLTRB(10, 6, 10, 6),
      decoration: pw.BoxDecoration(
        color: _soft,
        border: pw.Border(top: pw.BorderSide(color: _line, width: 0.8)),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(_ascii(note), style: pw.TextStyle(fontSize: 6.5, color: _muted)),
              pw.Text(
                'Page ${context.pageNumber} of ${context.pagesCount}',
                style: pw.TextStyle(fontSize: 6.2, color: _muted),
              ),
            ],
          ),
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.end,
            children: [
              pw.Text(
                _ascii('${SchoolProfile.schoolName} | ${SchoolProfile.brandTagline}'),
                style: pw.TextStyle(
                  fontSize: 6.5,
                  fontStyle: pw.FontStyle.italic,
                  color: _muted,
                ),
              ),
              pw.Text(
                _ascii(SchoolProfile.registration),
                style: pw.TextStyle(fontSize: 6, color: _muted),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Assessment Report Card matching `src/lib/pdf/report-card.ts`.
  static Future<Uint8List> buildReportCardPdf({
    required Learner learner,
    required Map<String, int> scores,
    required NectaDivisionResult result,
  }) async {
    final doc = pw.Document(
      title: _ascii('Report card - ${learner.name}'),
      author: SchoolProfile.schoolName,
      creator: 'Shule Altra Command OS',
    );
    final sorted = scores.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    final best = sorted.isNotEmpty ? sorted.first : null;
    final weakest = sorted.isNotEmpty ? sorted.last : null;
    final ref = 'RC-2026-${learner.id.replaceAll(RegExp(r'[^A-Za-z0-9]'), '')}';

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.fromLTRB(32, 24, 32, 24),
        footer: (ctx) => _footer(
          ctx,
          'Assessment report | verify marks and school grading policy before use',
        ),
        build: (context) => [
          _letterhead(
            title: 'Assessment report',
            subtitle: 'Term 2 | ${SchoolProfile.termLabel} | School grade scale',
            reference: ref,
          ),
          _sectionTitle('Learner particulars'),
          _keyValueGrid([
            (label: 'Learner', value: learner.name, emphasis: true),
            (label: 'Admission no.', value: learner.id, emphasis: false),
            (label: 'Class / stream', value: '${learner.className} ${learner.stream}', emphasis: false),
            (label: 'Category', value: learner.type, emphasis: false),
            (label: 'Subjects assessed', value: '${sorted.length}', emphasis: false),
            (label: 'Attendance', value: learner.attendanceStatus, emphasis: false),
          ]),
          _sectionTitle('Academic performance'),
          pw.TableHelper.fromTextArray(
            headerStyle: pw.TextStyle(
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.white,
              fontSize: 7.5,
            ),
            headerDecoration: pw.BoxDecoration(color: _navy),
            cellStyle: pw.TextStyle(fontSize: 8.2, color: _ink),
            oddRowDecoration: pw.BoxDecoration(color: _soft),
            border: pw.TableBorder.symmetric(
              inside: pw.BorderSide(color: _line, width: 0.4),
              outside: pw.BorderSide(color: _line, width: 0.6),
            ),
            headers: const ['SUBJECT', 'SCORE', 'GRADE', 'POINTS', 'REMARK'],
            data: sorted.map((entry) {
              final grade = NectaGrading.gradeLetter(entry.value);
              final pts = NectaGrading.gradePoints(entry.value);
              final remark = switch (grade) {
                'A' => 'Excellent',
                'B' => 'Very Good',
                'C' => 'Good',
                'D' => 'Satisfactory',
                _ => 'Fail',
              };
              return [_ascii(entry.key), '${entry.value}%', grade, '$pts', remark];
            }).toList(),
          ),
          pw.SizedBox(height: 12),
          pw.Row(
            children: [
              _summaryCard('Average score', '${result.average.toStringAsFixed(1)}%', _primary),
              pw.SizedBox(width: 10),
              _summaryCard('Division', result.division, _navy),
              pw.SizedBox(width: 10),
              _summaryCard('Aggregate points', '${result.points} pts', _accent),
            ],
          ),
          if (best != null && weakest != null) ...[
            pw.SizedBox(height: 10),
            pw.Text(
              _ascii(
                'Strongest subject: ${best.key} (${best.value}%). Focus area: ${weakest.key} (${weakest.value}%).',
              ),
              style: pw.TextStyle(fontSize: 8.2, color: _ink),
            ),
          ],
          _sectionTitle('Conduct & remarks'),
          pw.Text(
            'CLASS TEACHER: Consistent participation in class assessments. Maintain study discipline.',
            style: pw.TextStyle(fontSize: 8, color: _ink),
          ),
          pw.SizedBox(height: 4),
          pw.Text(
            'HEAD OF SCHOOL: Commendable effort recorded for this academic term.',
            style: pw.TextStyle(fontSize: 8, color: _ink),
          ),
          _signatureRow(const [
            (role: 'Class teacher', name: '________________'),
            (role: 'Head of school', name: 'Dr. J. Mwakalinga'),
            (role: 'Guardian', name: '________________'),
          ]),
        ],
      ),
    );
    return doc.save();
  }

  /// Official Fee Statement matching `src/lib/pdf/fee-statement.ts`.
  static Future<Uint8List> buildFeeStatementPdf({
    required Learner learner,
    required double annualFee,
    required double paid,
    required List<FeeTransaction> transactions,
  }) async {
    final doc = pw.Document(
      title: _ascii('Fee statement - ${learner.name}'),
      author: SchoolProfile.schoolName,
      creator: 'Shule Altra Command OS',
    );
    final learnerTxs = transactions.where((tx) => tx.studentId == learner.id).toList();
    final balance = learner.balance ?? 0;
    final pendingAmt = learnerTxs
        .where((tx) => tx.status == 'Pending')
        .fold<double>(0, (s, t) => s + t.amount);
    final ref = 'FEE-2026-${learner.id.replaceAll(RegExp(r'[^A-Za-z0-9]'), '')}';

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.fromLTRB(32, 24, 32, 24),
        footer: (ctx) => _footer(
          ctx,
          'Computer-generated fee statement | vector PDF | verify against the institutional ledger',
        ),
        build: (context) => [
          _letterhead(
            title: 'Fee statement of account',
            subtitle: 'Term 2 | ${SchoolProfile.termLabel}',
            reference: ref,
          ),
          _sectionTitle('Learner particulars'),
          _keyValueGrid([
            (label: 'Learner', value: learner.name, emphasis: true),
            (label: 'Admission no.', value: learner.id, emphasis: false),
            (label: 'Class / stream', value: '${learner.className} ${learner.stream}', emphasis: false),
            (label: 'Guardian', value: learner.guardianName, emphasis: false),
            (label: 'Guardian contact', value: learner.guardianPhone, emphasis: false),
            (label: 'Statement ref.', value: ref, emphasis: false),
          ]),
          pw.SizedBox(height: 6),
          pw.Row(
            children: [
              _summaryCard('Total billed', formatTzs(annualFee), _navy),
              pw.SizedBox(width: 10),
              _summaryCard('Total paid', formatTzs(paid), _success),
              pw.SizedBox(width: 10),
              _summaryCard('Outstanding', formatTzs(balance), balance > 0 ? _danger : _success),
            ],
          ),
          _sectionTitle('Payment history (${learnerTxs.length} entries)'),
          if (learnerTxs.isEmpty)
            pw.Text(
              'No individual payment entries recorded yet for this term.',
              style: pw.TextStyle(fontSize: 8.5, color: _muted),
            )
          else
            pw.TableHelper.fromTextArray(
              headerStyle: pw.TextStyle(
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.white,
                fontSize: 7.2,
              ),
              headerDecoration: pw.BoxDecoration(color: _navy),
              cellStyle: pw.TextStyle(fontSize: 7.8, color: _ink),
              oddRowDecoration: pw.BoxDecoration(color: _soft),
              border: pw.TableBorder.symmetric(
                inside: pw.BorderSide(color: _line, width: 0.4),
                outside: pw.BorderSide(color: _line, width: 0.6),
              ),
              headers: const ['DATE', 'REFERENCE', 'FEE TYPE', 'METHOD', 'STATUS', 'AMOUNT'],
              data: learnerTxs
                  .take(24)
                  .map(
                    (tx) => [
                      _ascii(tx.dateLabel),
                      _ascii(tx.controlNumber),
                      _ascii(tx.feeType),
                      _ascii(tx.paymentMethod),
                      _ascii(tx.status),
                      _ascii(formatTzs(tx.amount)),
                    ],
                  )
                  .toList(),
            ),
          if (pendingAmt > 0) ...[
            pw.SizedBox(height: 8),
            pw.Text(
              _ascii(
                'Note: ${formatTzs(pendingAmt)} is recorded but awaiting bank/ClickPesa verification.',
              ),
              style: pw.TextStyle(
                fontSize: 7.8,
                fontStyle: pw.FontStyle.italic,
                color: _warning,
              ),
            ),
          ],
          _sectionTitle('Declaration'),
          pw.Text(
            '- This statement is produced from the Shule Altra institutional ledger and reflects every payment captured to date.',
            style: pw.TextStyle(fontSize: 7.8, color: _ink),
          ),
          pw.SizedBox(height: 3),
          pw.Text(
            '- Payments should quote the learner admission number and ClickPesa control number shown on the fee bill.',
            style: pw.TextStyle(fontSize: 7.8, color: _ink),
          ),
          pw.SizedBox(height: 3),
          pw.Text(
            '- Any discrepancy must be reported to the bursar within 14 days of the issue date.',
            style: pw.TextStyle(fontSize: 7.8, color: _ink),
          ),
          _signatureRow([
            (role: 'Bursar', name: 'CPA. A. Mtenga'),
            (role: 'Head of school', name: 'Dr. J. Mwakalinga'),
            (role: 'Guardian acknowledgement', name: learner.guardianName),
          ]),
        ],
      ),
    );
    return doc.save();
  }

  /// Learner Identity Card matching `src/lib/pdf/id-card.ts` (ID-1 card on A4).
  static Future<Uint8List> buildStudentIdCardPdf({
    required Learner learner,
    Uint8List? photoBytes,
  }) async {
    final doc = pw.Document(
      title: _ascii('Learner ID - ${learner.name}'),
      author: SchoolProfile.schoolName,
      creator: 'Shule Altra Command OS',
    );
    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(36),
        build: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              _ascii('LEARNER IDENTITY CARD | ${SchoolProfile.termLabel} | ${SchoolProfile.schoolName.toUpperCase()}'),
              style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: _navy),
            ),
            pw.SizedBox(height: 3),
            pw.Text(
              'Cut along the border guide. Print at 100% scale on 300gsm card stock.',
              style: pw.TextStyle(fontSize: 7, color: _muted),
            ),
            pw.SizedBox(height: 28),
            pw.Center(
              child: pw.Container(
                width: 268,
                decoration: pw.BoxDecoration(
                  color: PdfColors.white,
                  border: pw.Border.all(color: _line, width: 0.9),
                ),
                child: pw.Column(
                  mainAxisSize: pw.MainAxisSize.min,
                  children: [
                    pw.Container(
                      color: _navy,
                      padding: const pw.EdgeInsets.fromLTRB(10, 8, 10, 8),
                      child: pw.Row(
                        children: [
                          _crest(size: 24),
                          pw.SizedBox(width: 8),
                          pw.Expanded(
                            child: pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text(
                                  _ascii(SchoolProfile.schoolName.toUpperCase()),
                                  style: pw.TextStyle(
                                    color: PdfColors.white,
                                    fontSize: 9,
                                    fontWeight: pw.FontWeight.bold,
                                  ),
                                ),
                                pw.Text(
                                  _ascii(SchoolProfile.location),
                                  style: const pw.TextStyle(color: PdfColors.grey300, fontSize: 5.8),
                                ),
                                pw.Text(
                                  'LEARNER IDENTITY CARD',
                                  style: pw.TextStyle(
                                    color: PdfColors.white,
                                    fontSize: 6.2,
                                    fontWeight: pw.FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    pw.Row(
                      children: [
                        pw.Expanded(flex: 60, child: pw.Container(height: 4, color: _primary)),
                        pw.Expanded(flex: 40, child: pw.Container(height: 4, color: _accent)),
                      ],
                    ),
                    pw.Padding(
                      padding: const pw.EdgeInsets.all(12),
                      child: pw.Row(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Expanded(
                            child: pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text(
                                  _ascii(learner.name.toUpperCase()),
                                  style: pw.TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: pw.FontWeight.bold,
                                    color: _navy,
                                  ),
                                ),
                                pw.SizedBox(height: 4),
                                pw.Text(
                                  _ascii(learner.id),
                                  style: pw.TextStyle(
                                    fontSize: 8.5,
                                    fontWeight: pw.FontWeight.bold,
                                    color: _primary,
                                  ),
                                ),
                                pw.SizedBox(height: 3),
                                pw.Text(
                                  _ascii('${learner.className} ${learner.stream} | ${learner.type}'),
                                  style: pw.TextStyle(fontSize: 7.5, color: _muted),
                                ),
                                pw.Text(
                                  _ascii('Guardian: ${learner.guardianPhone}'),
                                  style: pw.TextStyle(fontSize: 7, color: _muted),
                                ),
                                pw.SizedBox(height: 3),
                                pw.Text(
                                  _ascii(SchoolProfile.termLabel),
                                  style: pw.TextStyle(fontSize: 6.5, color: _muted),
                                ),
                              ],
                            ),
                          ),
                          pw.SizedBox(width: 10),
                          pw.Container(
                            width: 56,
                            height: 64,
                            decoration: pw.BoxDecoration(
                              color: _soft,
                              border: pw.Border.all(color: _line, width: 0.7),
                            ),
                            alignment: pw.Alignment.center,
                            child: photoBytes != null
                                ? pw.Image(
                                    pw.MemoryImage(photoBytes),
                                    width: 54,
                                    height: 62,
                                    fit: pw.BoxFit.cover,
                                  )
                                : pw.Text(
                                    learner.initials,
                                    style: pw.TextStyle(
                                      fontSize: 18,
                                      fontWeight: pw.FontWeight.bold,
                                      color: _navy,
                                    ),
                                  ),
                          ),
                        ],
                      ),
                    ),
                    pw.Container(
                      padding: const pw.EdgeInsets.fromLTRB(12, 4, 12, 7),
                      decoration: pw.BoxDecoration(
                        border: pw.Border(top: pw.BorderSide(color: _line, width: 0.5)),
                      ),
                      child: pw.Row(
                        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                        children: [
                          pw.Text(
                            _ascii('${SchoolProfile.contacts} | ${SchoolProfile.registration}'),
                            style: pw.TextStyle(fontSize: 5, color: _muted),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
    return doc.save();
  }

  /// Tabular Institutional Report matching `src/lib/pdf/tabular-report.ts`.
  static Future<Uint8List> buildClassRegisterPdf({
    required String title,
    required List<Learner> learners,
    required String Function(String id) attendanceOf,
  }) async {
    final doc = pw.Document(
      title: _ascii(title),
      author: SchoolProfile.schoolName,
      creator: 'Shule Altra Command OS',
    );
    final present = learners.where((l) => attendanceOf(l.id) == 'Present').length;
    final totalBalance = learners.fold<double>(0, (s, l) => s + (l.balance ?? 0));
    final ref = 'REG-2026-${learners.length.toString().padLeft(3, '0')}';

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.fromLTRB(28, 24, 28, 24),
        footer: (ctx) => _footer(
          ctx,
          'Computer-generated report | vector PDF | official institutional copy',
        ),
        build: (context) => [
          _letterhead(
            title: title,
            subtitle: '${learners.length} learners | ${SchoolProfile.termLabel}',
            reference: ref,
          ),
          pw.Row(
            children: [
              _summaryCard('Total learners', '${learners.length}', _navy),
              pw.SizedBox(width: 10),
              _summaryCard('Present today', '$present', _success),
              pw.SizedBox(width: 10),
              _summaryCard('Outstanding fees', formatTzs(totalBalance), totalBalance > 0 ? _danger : _success),
            ],
          ),
          _sectionTitle('Institutional register'),
          pw.TableHelper.fromTextArray(
            headerStyle: pw.TextStyle(
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.white,
              fontSize: 7.5,
            ),
            headerDecoration: pw.BoxDecoration(color: _navy),
            cellStyle: pw.TextStyle(fontSize: 7.8, color: _ink),
            oddRowDecoration: pw.BoxDecoration(color: _soft),
            border: pw.TableBorder.symmetric(
              inside: pw.BorderSide(color: _line, width: 0.4),
              outside: pw.BorderSide(color: _line, width: 0.6),
            ),
            headers: const ['ID', 'STUDENT NAME', 'CLASS', 'TYPE', 'ATTENDANCE', 'BALANCE'],
            data: learners
                .map(
                  (l) => [
                    _ascii(l.id),
                    _ascii(l.name),
                    _ascii('${l.className} ${l.stream}'),
                    _ascii(l.type),
                    _ascii(attendanceOf(l.id)),
                    (l.balance ?? 0) == 0 ? 'Cleared' : _ascii(formatTzs(l.balance)),
                  ],
                )
                .toList(),
          ),
          _signatureRow(const [
            (role: 'Prepared by', name: 'Registry / Accounts office'),
            (role: 'Head of school', name: 'Dr. J. Mwakalinga'),
          ]),
        ],
      ),
    );
    return doc.save();
  }

  /// Landscape A4 Master Class Timetable matching `src/lib/pdf/timetable.ts`.
  static Future<Uint8List> buildTimetablePdf({
    required String className,
    required String stream,
  }) async {
    final doc = pw.Document(
      title: _ascii('Timetable - $className $stream'),
      author: SchoolProfile.schoolName,
      creator: 'Shule Altra Command OS',
    );
    final days = sampleTimetable.keys.toList();
    final periods = sampleTimetable[days.first]?.length ?? 0;
    final ref = 'TT-${className.replaceAll(' ', '')}-$stream-2026';

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4.landscape,
        margin: const pw.EdgeInsets.fromLTRB(28, 20, 28, 20),
        footer: (ctx) => _footer(
          ctx,
          'Master class timetable | verify assignments and period times with the academic office',
        ),
        build: (context) => [
          _letterhead(
            title: 'Master class timetable',
            subtitle: '$className | Stream $stream | ${SchoolProfile.termLabel}',
            reference: ref,
          ),
          pw.TableHelper.fromTextArray(
            headerStyle: pw.TextStyle(
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.white,
              fontSize: 7.6,
            ),
            headerDecoration: pw.BoxDecoration(color: _navy),
            cellStyle: pw.TextStyle(fontSize: 7.4, color: _ink),
            oddRowDecoration: pw.BoxDecoration(color: _soft),
            border: pw.TableBorder.all(color: _line, width: 0.5),
            headers: ['TIME SLOT', ...days.map((d) => d.toUpperCase())],
            data: List.generate(periods, (rowIdx) {
              final time = sampleTimetable[days.first]![rowIdx].time;
              return [
                _ascii(time),
                for (final day in days)
                  _ascii(
                    '${sampleTimetable[day]![rowIdx].subject}\n${sampleTimetable[day]![rowIdx].teacher}',
                  ),
              ];
            }),
          ),
        ],
      ),
    );
    return doc.save();
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
