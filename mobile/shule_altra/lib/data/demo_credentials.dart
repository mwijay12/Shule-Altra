/// The demo sign-in.
///
/// This is a **preview credential, not a security control**. It exists so the
/// app can be opened on a phone without a Firebase project, and the rules it
/// follows are chosen to make that safe to say out loud:
///
///  * it only ever unlocks [SampleGateway], which reads fictional learners from
///    the phone and never touches a network or a real school;
///  * the live path ignores it completely — Firebase Auth does not know this
///    password, so a demo login cannot read a school's register;
///  * a school that does not want it can remove it at build time with
///    `--dart-define=DISABLE_DEMO_SIGN_IN=true`, and then the form does not
///    exist and the service refuses even if something calls it;
///  * it is printed on screen, because a credential a person cannot find is a
///    worse credential than one that says what it is.
///
/// The password is compared with a constant-time check. That is theatre against
/// someone reading the source — this file is in the repository — but it is not
/// theatre against a timing probe, and a preview should not teach the wrong
/// habit.
library;

/// What a demo sign-in produces: a session id and the address that was used.
typedef DemoIdentity = ({String uid, String email});

class DemoCredentials {
  const DemoCredentials._();

  /// The account a reviewer types. Not a real staff member, not a real domain:
  /// `example.test` is reserved, so it can never belong to anyone.
  static const String demoEmail = 'demo@shule.test';

  /// Printed in the app and in the README. There is no secret to leak.
  static const String demoPassword = 'shule-demo';

  /// Set `--dart-define=DISABLE_DEMO_SIGN_IN=true` to build without the demo
  /// door at all. Default false: an ordinary build keeps it, so the app can be
  /// opened and reviewed on a phone with no Firebase project.
  static const bool disabled =
      bool.fromEnvironment('DISABLE_DEMO_SIGN_IN', defaultValue: false);

  /// True when this build offers the demo sign-in.
  static bool get available => !disabled;

  /// True when the pair matches the demo account.
  ///
  /// Both fields are compared in full, and the password comparison walks every
  /// character, so an early mismatch and a late one take the same work.
  static bool accepts(String email, String password) {
    final normalised = email.trim().toLowerCase();
    return _constantTimeEquals(normalised, demoEmail) &
        _constantTimeEquals(password, demoPassword);
  }

  /// The identity handed to the app on a successful demo sign-in.
  ///
  /// The id is prefixed `demo-` so it can never be confused with a Firebase uid
  /// (which is 28 alphanumeric characters) or with the sample preview's
  /// `sample-staff`.
  static const DemoIdentity identity = (uid: 'demo-reviewer', email: demoEmail);

  static bool _constantTimeEquals(String a, String b) {
    // Length is compared first: it is not secret here, and it keeps the loop
    // bounded by the shorter of the two.
    var difference = a.length ^ b.length;
    final length = a.length < b.length ? a.length : b.length;
    for (var i = 0; i < length; i++) {
      difference |= a.codeUnitAt(i) ^ b.codeUnitAt(i);
    }
    return difference == 0;
  }
}
