/// One place for turning stored values into words.
///
/// Two rules: a missing value is said out loud ("Not recorded"), and money is
/// written the way a Tanzanian school writes it. No helper here invents a
/// default that could be mistaken for real data.
library;

/// `45000` → `TZS 45,000`. Null or negative-unparseable → "No fee figures".
String formatTzs(double? amount) {
  if (amount == null || !amount.isFinite) return 'No fee figures recorded';
  final rounded = amount.round();
  final digits = rounded.abs().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
    buffer.write(digits[i]);
  }
  final sign = rounded < 0 ? '−' : '';
  return 'TZS $sign${buffer.toString()}';
}

/// A short, human count. Never abbreviates below a thousand.
String countLabel(int value) => value == 1 ? '1 learner' : '$value learners';

/// A time from [DateTime] in the phone's own locale, for the "read at" line.
String timeStamp(DateTime time) {
  final local = time.toLocal();
  final hour = local.hour.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  return '$hour:$minute';
}
