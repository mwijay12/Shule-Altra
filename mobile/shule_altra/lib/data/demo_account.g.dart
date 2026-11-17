/// GENERATED FILE — do not edit by hand.
///
/// Source: `config/demo-account.json`, the same file the web hub reads.
/// Regenerate with `python3 tool/sync_demo_account.py`; CI fails if this file and
/// the JSON disagree, so the app and the website cannot hand out two different
/// demo credentials.
library;

/// The demo account, as generated from the shared JSON.
class DemoAccount {
  const DemoAccount._();

  /// `admin@shule.pro` — the same address the web login takes.
  static const String email = 'admin@shule.pro';

  /// `demo2026` — printed on both sign-in screens. Not a secret.
  static const String password = 'demo2026';

  /// Who the account belongs to in the demo seed.
  static const String name = 'Demo Administrator';

  /// The staff role the web hub resolves from `schools/<id>/staff/<uid>`.
  static const String role = 'ADMIN';

  /// The staff document id in the demo seed, and the uid the app reports.
  static const String uid = 'demo-admin';

  /// The school the demo data lives under.
  static const String schoolId = 'school-001';

  /// The school's name, as the website writes it.
  static const String schoolName = 'Mwalimu Nyerere Secondary School';
}
