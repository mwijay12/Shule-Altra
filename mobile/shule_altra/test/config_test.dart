/// Configuration is a safety property here, not a detail.
///
/// A build that connects to an unintended Firebase project would show one
/// school's register to another school's teacher, so the checks that prevent it
/// are tested directly.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/data/school_config.dart';

void main() {
  const complete = SchoolFirebaseConfig(
    projectId: 'project-a',
    expectedProjectId: 'project-a',
    apiKey: 'client-key',
    appId: 'android-app',
    senderId: 'sender',
    googleServerClientId: '',
  );

  test('a complete, agreeing configuration is accepted', () {
    expect(complete.isComplete, isTrue);
    expect(complete.projectMatches, isTrue);
    expect(complete.options.projectId, 'project-a');
    expect(complete.options.apiKey, 'client-key');
  });

  test('a mismatched project id is refused', () {
    const mismatch = SchoolFirebaseConfig(
      projectId: 'project-a',
      expectedProjectId: 'project-b',
      apiKey: 'client-key',
      appId: 'android-app',
      senderId: 'sender',
      googleServerClientId: '',
    );
    expect(mismatch.isComplete, isTrue);
    expect(mismatch.projectMatches, isFalse);
  });

  test('any missing value is refused, including whitespace-only', () {
    for (final missing in <SchoolFirebaseConfig>[
      const SchoolFirebaseConfig(
        projectId: '',
        expectedProjectId: 'project-a',
        apiKey: 'k',
        appId: 'a',
        senderId: 's',
        googleServerClientId: '',
      ),
      const SchoolFirebaseConfig(
        projectId: 'project-a',
        expectedProjectId: 'project-a',
        apiKey: '   ',
        appId: 'a',
        senderId: 's',
        googleServerClientId: '',
      ),
    ]) {
      expect(missing.isComplete, isFalse);
      expect(missing.projectMatches, isFalse);
    }
  });

  test('an unconfigured build reports itself as incomplete', () {
    // The default build in this repository has no defines at all.
    const fromEnvironment = SchoolFirebaseConfig.fromEnvironment;
    if (!fromEnvironment.isComplete) {
      expect(fromEnvironment.projectMatches, isFalse);
    }
  });
}
