import 'package:shared_preferences/shared_preferences.dart';

/// Only an introduction-seen flag is stored; no school or personal data.
abstract class OnboardingStore {
  Future<bool> hasSeenIntroduction();
  Future<void> markIntroductionSeen();
}

class DeviceOnboardingStore implements OnboardingStore {
  const DeviceOnboardingStore();
  static const _key = 'introduction_seen_v1';

  @override Future<bool> hasSeenIntroduction() async =>
      (await SharedPreferences.getInstance()).getBool(_key) ?? false;

  @override Future<void> markIntroductionSeen() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key, true);
  }
}
