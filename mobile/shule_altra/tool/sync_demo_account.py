#!/usr/bin/env python3
"""Generate the app's demo account from the one file both products share.

`config/demo-account.json` is the source of truth: the web hub reads it directly
(`src/lib/demo/account.ts`) and this script turns it into Dart constants, so the
address and password a person is given cannot drift between the two products.

Run it after editing the JSON:

    python3 tool/sync_demo_account.py

CI runs the same script. If the generated file is stale, the build fails with the
diff rather than shipping two different credentials.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT.parent.parent / 'config' / 'demo-account.json'
TARGET = ROOT / 'lib' / 'data' / 'demo_account.g.dart'

REQUIRED = ('email', 'password', 'name', 'role', 'uid', 'schoolId', 'schoolName')


def read_source(path: Path = SOURCE) -> dict[str, str]:
    data = json.loads(path.read_text())
    missing = [key for key in REQUIRED if not str(data.get(key, '')).strip()]
    if missing:
        raise SystemExit(f'{path}: missing {", ".join(missing)}')
    email = str(data['email']).strip().lower()
    if not email.endswith('.pro') and '@' not in email:
        raise SystemExit(f'{path}: "{email}" is not an email address')
    return {key: str(data[key]).strip() for key in REQUIRED}


def render(account: dict[str, str]) -> str:
    return f'''/// GENERATED FILE — do not edit by hand.
///
/// Source: `config/demo-account.json`, the same file the web hub reads.
/// Regenerate with `python3 tool/sync_demo_account.py`; CI fails if this file and
/// the JSON disagree, so the app and the website cannot hand out two different
/// demo credentials.
library;

/// The demo account, as generated from the shared JSON.
class DemoAccount {{
  const DemoAccount._();

  /// `{account['email']}` — the same address the web login takes.
  static const String email = '{account['email']}';

  /// `{account['password']}` — printed on both sign-in screens. Not a secret.
  static const String password = '{account['password']}';

  /// Who the account belongs to in the demo seed.
  static const String name = '{account['name']}';

  /// The staff role the web hub resolves from `schools/<id>/staff/<uid>`.
  static const String role = '{account['role']}';

  /// The staff document id in the demo seed, and the uid the app reports.
  static const String uid = '{account['uid']}';

  /// The school the demo data lives under.
  static const String schoolId = '{account['schoolId']}';

  /// The school's name, as the website writes it.
  static const String schoolName = '{account['schoolName']}';
}}
'''


def main() -> None:
    account = read_source()
    rendered = render(account)
    if TARGET.exists() and TARGET.read_text() == rendered:
        print(f'{TARGET.relative_to(ROOT)} is up to date.')
        return
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(rendered)
    print(f'Wrote {TARGET.relative_to(ROOT)} for {account["email"]}.')


if __name__ == '__main__':
    main()
