import 'package:firebase_core/firebase_core.dart';

/// User-facing guidance without exposing raw server errors or personal data.
enum SchoolReadProblem { permission, connection, session, invalidSchedule, unknown }

SchoolReadProblem classifySchoolReadProblem(Object error) {
  if (error is FormatException) return SchoolReadProblem.invalidSchedule;
  if (error is FirebaseException) {
    switch (error.code) {
      case 'permission-denied': return SchoolReadProblem.permission;
      case 'unavailable':
      case 'network-request-failed':
      case 'deadline-exceeded': return SchoolReadProblem.connection;
      case 'unauthenticated':
      case 'user-disabled':
      case 'user-token-expired': return SchoolReadProblem.session;
    }
  }
  return SchoolReadProblem.unknown;
}

String schoolReadGuidance(SchoolReadProblem problem, {required bool timetable}) {
  switch (problem) {
    case SchoolReadProblem.permission:
      return 'This account could not access these records. Ask your school administrator to check your access; then try again.';
    case SchoolReadProblem.connection:
      return 'The service could not be reached. Check your internet connection and try again. No cached results are shown.';
    case SchoolReadProblem.session:
      return 'Your session may have expired or changed. Sign out and sign in again, then retry.';
    case SchoolReadProblem.invalidSchedule:
      if (timetable) return 'The saved schedule format could not be read. Ask your school administrator to review it on the web app.';
      return 'The records could not be read. Try again or ask your school administrator for help.';
    case SchoolReadProblem.unknown:
      return timetable
          ? 'Could not load this schedule. Check your connection, permissions and schedule format, then try again.'
          : 'Check your internet connection, session and school permissions, then try again. No cached results are shown.';
  }
}
