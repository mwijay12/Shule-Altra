/// What the app knows about a learner, and where it comes from.
///
/// The stored shape is the web product's: `students/{id}` with `class` (not
/// `className`), `guardianName`, `status`, `balance`, `totalPaid`. Reading the
/// wrong key is how a register prints "Unassigned" for every learner, so the
/// field names are declared once, here, and a test feeds a real document through
/// [Learner.fromDocument] to prove the mapping.
library;

import 'package:characters/characters.dart';
import 'package:flutter/foundation.dart';

/// A learner row, read-only in this pilot.
@immutable
class Learner {
  const Learner({
    required this.id,
    required this.name,
    required this.className,
    required this.status,
    required this.guardianName,
    required this.guardianPhone,
    required this.guardianEmail,
    required this.balance,
    required this.type,
    this.stream = '',
    this.attendanceStatus = '',
  });

  final String id;
  final String name;

  /// The class, from the stored `class` field.
  final String className;

  final String status;
  final String guardianName;
  final String guardianPhone;
  final String guardianEmail;

  /// Outstanding balance in TZS, or null when the record has no fee figures.
  final double? balance;

  final String type;

  /// Stored stream and latest attendance status; neither is inferred.
  final String stream;
  final String attendanceStatus;

  /// Read one Firestore document, tolerating the misses a real school produces:
  /// a missing name, a number stored as a string, a null field.
  ///
  /// Deliberately does **not** fall back quietly: if the class is missing the
  /// row says so in words, rather than pretending the learner is assigned.
  factory Learner.fromDocument(String id, Map<String, dynamic> data) {
    String text(String key) {
      final value = data[key];
      if (value is String) return value.trim();
      if (value is num) return value.toString();
      return '';
    }

    final rawName = text('name');
    final className = text('class');
    return Learner(
      id: id,
      name: rawName.isEmpty ? missingName : rawName,
      className: className.isEmpty ? missingClass : className,
      status: text('status').isEmpty ? 'Status not recorded' : text('status'),
      guardianName: text('guardianName'),
      guardianPhone: text('guardianPhone'),
      guardianEmail: text('guardianEmail'),
      balance: _money(data['balance']),
      type: text('type'),
      stream: data['stream'] is String ? (data['stream'] as String).trim() : '',
      attendanceStatus: data['attendanceStatus'] is String
          ? (data['attendanceStatus'] as String).trim()
          : '',
    );
  }

  static double? _money(Object? value) {
    final parsed = value is num ? value.toDouble() : value is String ? double.tryParse(value.trim()) : null;
    return parsed != null && parsed.isFinite ? parsed : null;
  }

  /// Initials for the avatar, without inventing a surname that is not there.
  ///
  /// A record with no name gets a question mark, not the initials of the words
  /// this app uses to say the name is missing.
  String get initials {
    final parts = name.split(RegExp(r'\s+')).where((part) => part.isNotEmpty).toList();
    if (parts.isEmpty || name == missingName) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts.last.characters.first).toUpperCase();
  }

  /// The words shown when a stored record has no name.
  static const String missingName = 'Unnamed learner';
  static const String missingClass = 'Class not recorded';

  /// True when the row matches a query across loaded name, class, stream or ID.
  bool matches(String query) {
    final needle = query.trim().toLowerCase();
    if (needle.isEmpty) return true;
    return name.toLowerCase().contains(needle) || className.toLowerCase().contains(needle) ||
        stream.toLowerCase().contains(needle) || id.toLowerCase().contains(needle);
  }
}

/// One page of the register, and how to ask for the next one.
class LearnerPage {
  const LearnerPage({required this.rows, this.nextCursor});

  final List<Learner> rows;

  /// Opaque page cursor. Null means this is the last page.
  final Object? nextCursor;

  bool get hasMore => nextCursor != null;
}
