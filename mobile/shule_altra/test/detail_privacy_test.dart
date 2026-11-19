import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/session.dart';
import 'package:shule_altra_mobile/data/learner.dart';
import 'package:shule_altra_mobile/design/theme.dart';
import 'package:shule_altra_mobile/screens/learner_detail.dart';

import 'fake_gateway.dart';

void main() {
  testWidgets('open learner sheet removes sensitive details on account change', (tester) async {
    final gateway = FakeGateway();
    final session = AppSession(gateway);
    await session.start();
    await gateway.signIn();
    await tester.pump();
    final learner = Learner.fromDocument('private-1', {
      'name': 'Private learner', 'guardianPhone': '+255 111 222 333',
      'stream': 'East', 'attendanceStatus': 'Late',
    });
    await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: Scaffold(
      body: Builder(builder: (context) => TextButton(
        onPressed: () => showLearnerDetail(context, learner: learner, isSample: false, session: session),
        child: const Text('Open'),
      )),
    )));
    await tester.tap(find.text('Open')); await tester.pumpAndSettle();
    expect(find.text('Private learner'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('East'), 140, scrollable: find.byType(Scrollable).first);
    expect(find.text('East'), findsOneWidget);
    expect(find.text('Late'), findsOneWidget);
    expect(find.textContaining('Stored status has no date'), findsOneWidget);
    gateway.signedInAs('another-account');
    await tester.pumpAndSettle();
    expect(find.text('Private learner'), findsNothing);
    expect(find.text('+255 111 222 333'), findsNothing);
    expect(find.text('Session changed'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
    session.dispose();
    await gateway.close();
  });
}
