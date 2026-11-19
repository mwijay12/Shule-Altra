import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/app.dart';
import 'package:shule_altra_mobile/data/demo_credentials.dart';
import 'package:shule_altra_mobile/data/sample_gateway.dart';
import 'package:shule_altra_mobile/data/school_gateway.dart';
import 'package:shule_altra_mobile/screens/demo_sign_in.dart';

void main() {
  testWidgets('sample access is honestly labelled when demo sign-in is disabled', (tester) async {
    final gateway = SampleGateway();
    await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway, initialMode: AppMode.sample));
    await tester.pumpAndSettle();
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('Learners')));
    await tester.pumpAndSettle();
    if (!DemoCredentials.disabled) {
      expect(find.byType(DemoSignInForm), findsOneWidget);
      expect(find.text('Open fictional sample'), findsNothing);
    } else {
      expect(find.byType(DemoSignInForm), findsNothing);
      expect(find.text('Continue with Google'), findsNothing);
      expect(find.text('Open fictional sample'), findsOneWidget);
      final refused = expectLater(gateway.signInWithDemo(DemoCredentials.demoEmail, DemoCredentials.demoPassword),
          throwsA(isA<GatewayFailure>()));
      await tester.pump(const Duration(seconds: 1));
      await refused;
      await tester.ensureVisible(find.text('Open fictional sample')); await tester.pumpAndSettle();
      await tester.tap(find.text('Open fictional sample')); await tester.pumpAndSettle();
      expect(find.text('Amina Juma'), findsOneWidget);
    }
    await tester.pumpWidget(const SizedBox.shrink());
    await gateway.dispose();
  });
}
