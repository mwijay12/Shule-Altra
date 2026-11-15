/// The register's field names, tested against a document shaped like the ones
/// the web product actually stores.
///
/// This is the bug the review found in the web app: code reading `className`
/// while the data says `class`, so every learner prints "Unassigned". The
/// mapping lives in one place now, and this test is what keeps it honest.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/data/learner.dart';
import 'package:shule_altra_mobile/format.dart';

void main() {
  group('Learner.fromDocument', () {
    test('reads the stored class field, not className', () {
      final learner = Learner.fromDocument('s-1', {
        'name': '  Amina Juma ',
        'class': 'Form 1 A',
        'className': 'WRONG',
        'status': 'Active',
        'guardianName': 'Fatuma Juma',
        'guardianPhone': '+255 700 000 001',
        'guardianEmail': 'guardian@example.test',
        'balance': 45000,
        'type': 'Day',
      });

      expect(learner.name, 'Amina Juma');
      expect(learner.className, 'Form 1 A');
      expect(learner.guardianEmail, 'guardian@example.test');
      expect(learner.balance, 45000);
      expect(learner.initials, 'AJ');
    });

    test('says what is missing instead of inventing a value', () {
      final learner = Learner.fromDocument('s-2', {'class': null, 'balance': null});

      expect(learner.name, 'Unnamed learner');
      expect(learner.className, 'Class not recorded');
      expect(learner.status, 'Status not recorded');
      expect(learner.initials, 'U');
      // Nothing is claimed about fees that were not stored.
      expect(formatTzs(learner.balance), 'No fee figures recorded');
    });

    test('accepts a number stored as text, and ignores a non-numeric one', () {
      final text = Learner.fromDocument('s-3', {'name': 'Neema', 'balance': '  120000 '});
      final junk = Learner.fromDocument('s-4', {'name': 'Neema', 'balance': 'n/a'});
      expect(text.balance, 120000);
      expect(junk.balance, isNull);
    });

    test('a single-word name keeps one initial', () {
      expect(Learner.fromDocument('s-5', {'name': 'Madonna'}).initials, 'M');
    });
  });

  group('search', () {
    final learner = Learner.fromDocument('s-6', {
      'name': 'Baraka John',
      'class': 'Form 2 B',
      'guardianName': 'John Mwenda',
    });

    test('matches on name and class, case-insensitively', () {
      expect(learner.matches('baraka'), isTrue);
      expect(learner.matches('FORM 2'), isTrue);
      expect(learner.matches('  '), isTrue);
      expect(learner.matches('Neema'), isFalse);
    });

    test('does not match on a guardian name', () {
      // Guardian details are shown on the detail sheet, not used as a search
      // index: searching by parent would imply a relationship search exists.
      expect(learner.matches('Mwenda'), isFalse);
    });
  });

  group('money', () {
    test('groups thousands the way a school writes them', () {
      expect(formatTzs(0), 'TZS 0');
      expect(formatTzs(45000), 'TZS 45,000');
      expect(formatTzs(1200000), 'TZS 1,200,000');
      expect(formatTzs(999), 'TZS 999');
    });

    test('counts read as words', () {
      expect(countLabel(0), '0 learners');
      expect(countLabel(1), '1 learner');
      expect(countLabel(40), '40 learners');
    });
  });
}
