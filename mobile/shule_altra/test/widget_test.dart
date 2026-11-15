import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/main.dart';

void main() {
  testWidgets('prototype onboarding, search, detail and reset', (tester) async {
    await tester.pumpWidget(const ShuleMobileApp());
    expect(find.text('Your school,\ncloser than ever.'), findsOneWidget);
    await tester.ensureVisible(find.text('Continue'));
    await tester.tap(find.text('Continue')); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Continue'));
    await tester.tap(find.text('Continue')); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Explore the prototype'));
    await tester.tap(find.text('Explore the prototype')); await tester.pumpAndSettle();
    expect(find.text('for what matters.'), findsOneWidget);
    await tester.ensureVisible(find.text('Explore learners  →'));
    await tester.tap(find.text('Explore learners  →')); await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Amina'); await tester.pumpAndSettle();
    expect(find.text('Amina Juma'), findsOneWidget);
    expect(find.text('Baraka John'), findsNothing);
    await tester.tap(find.text('Amina Juma')); await tester.pumpAndSettle();
    expect(find.textContaining('fictional sample data'), findsOneWidget);
    await tester.binding.handlePopRoute(); await tester.pumpAndSettle();
    await tester.tap(find.text('Day')); await tester.pumpAndSettle();
    expect(find.text('Practice only · not saved'), findsOneWidget);
    final present = find.widgetWithText(ChoiceChip, 'Present').first;
    await tester.ensureVisible(present); await tester.tap(present); await tester.pumpAndSettle();
    expect(find.text('1 of 3 marked'), findsOneWidget);
    final absent = find.widgetWithText(ChoiceChip, 'Absent').first;
    await tester.ensureVisible(absent); await tester.tap(absent); await tester.pumpAndSettle();
    expect(find.text('1 of 3 marked'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Clear practice marks'), 250, scrollable: find.byType(Scrollable).first);
    await tester.tap(find.text('Clear practice marks')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('0 of 3 marked'), -250, scrollable: find.byType(Scrollable).first);
    expect(find.text('0 of 3 marked'), findsOneWidget);
    await tester.tap(find.text('More')); await tester.pumpAndSettle();
    expect(find.text('Offline & sync'), findsOneWidget);
    await tester.tap(find.text('View onboarding again')); await tester.pumpAndSettle();
    expect(find.text('Your school,\ncloser than ever.'), findsOneWidget);
  });
}
