import json
import tempfile
import unittest
from pathlib import Path

from sync_demo_account import read_source, render

ACCOUNT = {
    'email': 'admin@shule.pro',
    'password': 'demo2026',
    'name': 'Demo Administrator',
    'role': 'ADMIN',
    'uid': 'demo-admin',
    'schoolId': 'school-001',
    'schoolName': 'Mwalimu Nyerere Secondary School',
}


class SharedDemoAccountTest(unittest.TestCase):
    def write(self, data: dict) -> Path:
        handle = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False)
        handle.write(json.dumps(data))
        handle.close()
        return Path(handle.name)

    def test_the_shared_file_is_complete(self):
        self.assertEqual(read_source(), ACCOUNT)

    def test_the_generated_dart_carries_every_value(self):
        dart = render(ACCOUNT)
        for key in ('email', 'password', 'name', 'role', 'uid', 'schoolId', 'schoolName'):
            self.assertIn(f"'{ACCOUNT[key]}'", dart, key)
        # Whoever regenerates it must not be able to believe the file is hand-edited.
        self.assertIn('GENERATED FILE', dart)

    def test_a_missing_value_fails_closed(self):
        for key in ACCOUNT:
            with self.subTest(missing=key):
                data = dict(ACCOUNT)
                data[key] = '  '
                with self.assertRaises(SystemExit):
                    read_source(self.write(data))

    def test_an_address_without_an_at_sign_fails_closed(self):
        data = dict(ACCOUNT)
        data['email'] = 'admin'
        with self.assertRaises(SystemExit):
            read_source(self.write(data))


if __name__ == '__main__':
    unittest.main()
