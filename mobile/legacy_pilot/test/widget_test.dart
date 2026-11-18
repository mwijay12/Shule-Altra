import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shule_altra_mobile/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));
  testWidgets('onboarding can go back and announces progress', (tester) async {
    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(const ShuleMobileApp()); await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('Introduction, page 1 of 3'), findsOneWidget);
    expect(ink, const Color(0xff1f5ba6));
    expect(canvas, const Color(0xfff8fafc));
    final hero = tester.widget<Image>(find.byType(Image));
    expect((hero.image as AssetImage).assetName, 'assets/images/school_cutout.png');
    expect(hero.excludeFromSemantics, isTrue);
    await tester.ensureVisible(find.text('Continue'));
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('Introduction, page 2 of 3'), findsOneWidget);
    expect((tester.widget<Image>(find.byType(Image)).image as AssetImage).assetName, 'assets/images/learning_cutout.png');
    await tester.ensureVisible(find.text('Previous'));
    await tester.tap(find.text('Previous'));
    await tester.pumpAndSettle();
    expect(find.text('Your school,\ncloser than ever.'), findsOneWidget);
    semantics.dispose();
  });

  testWidgets('skip introduction goes straight to connection and sample choices', (tester) async {
    await tester.pumpWidget(const ShuleMobileApp()); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Skip introduction')); await tester.pumpAndSettle();
    await tester.tap(find.text('Skip introduction')); await tester.pumpAndSettle();
    expect(find.text('Connected with\ncare.'), findsOneWidget);
    expect((tester.widget<Image>(find.byType(Image)).image as AssetImage).assetName, 'assets/images/connection_cutout.png');
    await tester.ensureVisible(find.text('Connect to your school')); await tester.pumpAndSettle();
    expect(find.text('Connect to your school'), findsOneWidget);
    await tester.ensureVisible(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    expect(find.text('Explore sample preview instead'), findsOneWidget);
    await tester.tap(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    expect(find.text('for what matters.'), findsOneWidget);
  });

  testWidgets('introduction completion survives restart without choosing a mode', (tester) async {
    await tester.pumpWidget(const ShuleMobileApp()); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Skip introduction')); await tester.pumpAndSettle();
    await tester.tap(find.text('Skip introduction')); await tester.pumpAndSettle();
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getBool('introduction_seen_v1'), isTrue);
    await tester.pumpWidget(const SizedBox());
    await tester.pumpWidget(const ShuleMobileApp()); await tester.pumpAndSettle();
    expect(find.text('Connected with\ncare.'), findsOneWidget);
    expect(find.text('for what matters.'), findsNothing);
    await tester.ensureVisible(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    expect(find.text('Explore sample preview instead'), findsOneWidget);
    expect(find.text('Connect to your school'), findsOneWidget);
  });

  testWidgets('sample home reflects in-memory attendance practice', (tester) async {
    await tester.pumpWidget(const ShuleMobileApp()); await tester.pumpAndSettle();
    for (var i = 0; i < 2; i++) {
      await tester.ensureVisible(find.text('Continue')); await tester.pumpAndSettle();
      await tester.tap(find.text('Continue')); await tester.pumpAndSettle();
    }
    await tester.ensureVisible(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    await tester.tap(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('0 of 3 sample learners marked'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    expect(find.text('0 of 3 sample learners marked'), findsOneWidget);
    await tester.ensureVisible(find.text('Open practice day')); await tester.pumpAndSettle();
    await tester.tap(find.text('Open practice day')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Amina Juma'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    final present = find.widgetWithText(ChoiceChip, 'Present').first;
    await tester.scrollUntilVisible(present, 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(present); await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(NavigationDestination, 'Home')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('1 of 3 sample learners marked'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    expect(find.text('1 of 3 sample learners marked'), findsOneWidget);
  });

  testWidgets('practice summary fills only unmarked learners and supports individual clearing', (tester) async {
    await tester.pumpWidget(const ShuleMobileApp()); await tester.pumpAndSettle();
    for (var i = 0; i < 2; i++) {
      await tester.ensureVisible(find.text('Continue')); await tester.pumpAndSettle();
      await tester.tap(find.text('Continue')); await tester.pumpAndSettle();
    }
    await tester.ensureVisible(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    await tester.tap(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(NavigationDestination, 'Day')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Amina Juma'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    final absent = find.widgetWithText(ChoiceChip, 'Absent').first;
    await tester.scrollUntilVisible(absent, 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(absent); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Mark unmarked samples present'), -200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Mark unmarked samples present')); await tester.pumpAndSettle();
    expect(find.text('Present: 2'), findsOneWidget);
    expect(find.text('Absent: 1'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Clear Amina Juma mark'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Clear Amina Juma mark')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Unmarked: 1'), -200, scrollable: find.byType(Scrollable).first);
    expect(find.text('Unmarked: 1'), findsOneWidget);
  });

  testWidgets('reset preview protects session-only marks until confirmed', (tester) async {
    await tester.pumpWidget(const ShuleMobileApp()); await tester.pumpAndSettle();
    for (var i = 0; i < 2; i++) {
      await tester.ensureVisible(find.text('Continue')); await tester.pumpAndSettle();
      await tester.tap(find.text('Continue')); await tester.pumpAndSettle();
    }
    await tester.ensureVisible(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    await tester.tap(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(NavigationDestination, 'Day')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Mark unmarked samples present'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Mark unmarked samples present')); await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(NavigationDestination, 'More')); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('View onboarding again')); await tester.pumpAndSettle();
    await tester.tap(find.text('View onboarding again')); await tester.pumpAndSettle();
    expect(find.text('Discard practice marks?'), findsOneWidget);
    await tester.tap(find.text('Keep practicing')); await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(NavigationDestination, 'Home')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('3 of 3 sample learners marked'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('3 of 3 sample learners marked'), findsOneWidget);
    await tester.tap(find.widgetWithText(NavigationDestination, 'More')); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('View onboarding again')); await tester.pumpAndSettle();
    await tester.tap(find.text('View onboarding again')); await tester.pumpAndSettle();
    await tester.tap(find.text('Reset preview')); await tester.pumpAndSettle();
    expect(find.text('Your school,\ncloser than ever.'), findsOneWidget);
  });

  testWidgets('sample screens fit a narrow phone with larger text', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(MediaQuery(data: const MediaQueryData(textScaler: TextScaler.linear(1.5)), child: const MaterialApp(home: Prototype()))); await tester.pumpAndSettle();
    for (var i = 0; i < 2; i++) {
      await tester.ensureVisible(find.text('Continue')); await tester.pumpAndSettle();
      await tester.tap(find.text('Continue')); await tester.pumpAndSettle();
    }
    await tester.ensureVisible(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    await tester.tap(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Practice overview'), 200, scrollable: find.byType(Scrollable).first);
    expect(tester.takeException(), isNull);
    await tester.tap(find.widgetWithText(NavigationDestination, 'Day')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Practice summary'), 200, scrollable: find.byType(Scrollable).first);
    expect(tester.takeException(), isNull);
  });

  testWidgets('fictional workspace previews real layouts without connecting a school', (tester) async {
    await tester.pumpWidget(const ShuleMobileApp()); await tester.pumpAndSettle();
    for (var i = 0; i < 2; i++) {
      await tester.ensureVisible(find.text('Continue')); await tester.pumpAndSettle();
      await tester.tap(find.text('Continue')); await tester.pumpAndSettle();
    }
    await tester.ensureVisible(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    await tester.tap(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Preview school workspace'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Preview school workspace')); await tester.pumpAndSettle();
    expect(find.text('FICTIONAL WORKSPACE'), findsOneWidget);
    expect(find.text('Sample data · no school connection'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Learner register'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Learner register')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Fictional sample data'), 200, scrollable: find.byType(Scrollable).first);
    await tester.scrollUntilVisible(find.text('Search sample'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Search sample')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Amina Juma'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('Amina Juma'), findsOneWidget);
    expect(find.text('Live school data'), findsNothing);
    await tester.scrollUntilVisible(find.text('Timetable'), -200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Timetable')); await tester.pumpAndSettle();
    expect(find.text('Fictional schedule · not school data'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Load timetable'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Load timetable')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Mathematics'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('Mathematics'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Exit fictional preview'), -200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Exit fictional preview')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('for what matters.'), -200, scrollable: find.byType(Scrollable).first);
    expect(find.text('for what matters.'), findsOneWidget);
  });

  testWidgets('sample register filters by class and clears search', (tester) async {
    await tester.pumpWidget(const ShuleMobileApp()); await tester.pumpAndSettle();
    for (var i = 0; i < 2; i++) {
      await tester.ensureVisible(find.text('Continue')); await tester.pumpAndSettle();
      await tester.tap(find.text('Continue')); await tester.pumpAndSettle();
    }
    await tester.ensureVisible(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    await tester.tap(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(NavigationDestination, 'Learners')); await tester.pumpAndSettle();
    await tester.ensureVisible(find.byType(DropdownButtonFormField<String>)); await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<String>)); await tester.pumpAndSettle();
    await tester.tap(find.text('Form 2 B').last); await tester.pumpAndSettle();
    expect(find.text('Baraka John'), findsOneWidget);
    expect(find.text('Amina Juma'), findsNothing);
    await tester.enterText(find.byType(TextField), 'no match'); await tester.pumpAndSettle();
    expect(find.text('No sample learners match your search.'), findsOneWidget);
    await tester.tap(find.byTooltip('Clear search')); await tester.pumpAndSettle();
    expect(find.text('Baraka John'), findsOneWidget);
  });

  testWidgets('prototype onboarding, search, detail and reset', (tester) async {
    await tester.pumpWidget(const ShuleMobileApp()); await tester.pumpAndSettle();
    expect(find.text('Your school,\ncloser than ever.'), findsOneWidget);
    await tester.ensureVisible(find.text('Continue'));
    await tester.tap(find.text('Continue')); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Continue'));
    await tester.tap(find.text('Continue')); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Explore sample preview instead'));
    await tester.tap(find.text('Explore sample preview instead')); await tester.pumpAndSettle();
    expect(find.text('for what matters.'), findsOneWidget);
    await tester.ensureVisible(find.text('Explore learners  →'));
    await tester.tap(find.text('Explore learners  →')); await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Amina'); await tester.pumpAndSettle();
    expect(find.text('Amina Juma'), findsOneWidget);
    expect(find.text('Baraka John'), findsNothing);
    await tester.ensureVisible(find.text('Amina Juma')); await tester.pumpAndSettle();
    await tester.tap(find.text('Amina Juma')); await tester.pumpAndSettle();
    expect(find.textContaining('fictional sample data'), findsOneWidget);
    expect(find.text('Not marked · this session only'), findsOneWidget);
    await tester.binding.handlePopRoute(); await tester.pumpAndSettle();
    await tester.tap(find.text('Day')); await tester.pumpAndSettle();
    expect(find.text('Practice only · not saved'), findsOneWidget);
    await tester.ensureVisible(find.text('Sample timetable'));
    expect(find.text('Fictional preview · not your school schedule'), findsOneWidget);
    await tester.tap(find.byType(DropdownButtonFormField<String>)); await tester.pumpAndSettle();
    await tester.tap(find.text('Tuesday').last); await tester.pumpAndSettle();
    expect(find.text('History'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Amina Juma'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    final present = find.widgetWithText(ChoiceChip, 'Present').first;
    await tester.ensureVisible(present); await tester.pumpAndSettle(); await tester.tap(present); await tester.pumpAndSettle();
    expect(tester.widget<ChoiceChip>(present).selected, isTrue);
    final absent = find.widgetWithText(ChoiceChip, 'Absent').first;
    await tester.ensureVisible(absent); await tester.pumpAndSettle(); await tester.tap(absent); await tester.pumpAndSettle();
    expect(tester.widget<ChoiceChip>(absent).selected, isTrue);
    await tester.scrollUntilVisible(find.text('Clear practice marks'), 250, scrollable: find.byType(Scrollable).first);
    await tester.tap(find.text('Clear practice marks')); await tester.pumpAndSettle();
    expect(find.text('Discard practice marks?'), findsOneWidget);
    await tester.tap(find.text('Clear marks')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('0 of 3 marked'), -250, scrollable: find.byType(Scrollable).first);
    expect(find.text('0 of 3 marked'), findsOneWidget);
    await tester.tap(find.text('More')); await tester.pumpAndSettle();
    expect(find.text('Offline & sync'), findsOneWidget);
    await tester.ensureVisible(find.text('View onboarding again')); await tester.pumpAndSettle();
    await tester.tap(find.text('View onboarding again')); await tester.pumpAndSettle();
    expect(find.text('Your school,\ncloser than ever.'), findsOneWidget);
  });
}
