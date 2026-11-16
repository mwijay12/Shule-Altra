/// The practice sheet must be unable to become a record.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/practice.dart';

void main() {
  test('a mark is in memory only, replaces itself and clears', () {
    final draft = PracticeDraft();
    expect(draft.marked, 0);
    expect(draft.isEmpty, isTrue);
    expect(draft.markFor('sample-1'), isNull);

    draft.mark('sample-1', PracticeMark.present);
    draft.mark('sample-1', PracticeMark.absent);
    expect(draft.marked, 1, reason: 'one learner has one practice status');
    expect(draft.markFor('sample-1'), PracticeMark.absent);

    draft.clear();
    expect(draft.marked, 0);
    expect(draft.isEmpty, isTrue);
    expect(draft.markFor('sample-1'), isNull);
  });

  test('every practice mark has a word, for the button and the sentence', () {
    expect(PracticeMark.values.map((mark) => mark.label), ['Present', 'Absent', 'Late']);
  });
}
