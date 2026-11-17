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

import 'demo_account.g.dart';

/// What a demo sign-in produces: a session id and the address that was used.
typedef DemoIdentity = ({String uid, String email});

class DemoCredentials {
  const DemoCredentials._();

  /// The account a reviewer types.
  ///
  /// It is the same pair the website's login screen takes, generated from
  /// `config/demo-account.json` so the two products cannot drift apart. On the
  /// web it resolves to a simulated staff record; here it only ever opens the
  /// fictional sample register.
  static const String demoEmail = DemoAccount.email;

  /// Printed in the app and on the website. There is no secret to leak.
  static const String demoPassword = DemoAccount.password;

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
  /// The id is `demo-admin`, the staff document id the web demo seed creates for
  /// this account. It is deliberately **not** shaped like a Firebase uid (28
  /// alphanumeric characters), and not the sample preview's `sample-staff`, so a
  /// screenshot of either product shows an id that is honest about where it
  /// came from.
  static const DemoIdentity identity = (uid: DemoAccount.uid, email: demoEmail);

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
