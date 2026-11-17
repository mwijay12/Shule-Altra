import unittest
from firebase_defines import PACKAGE, make_defines


def config():
    return {'project_info': {'project_id': 'school', 'project_number': '123'},
            'client': [{'client_info': {'mobilesdk_app_id': '1:123:android:abc',
                                        'android_client_info': {'package_name': PACKAGE}},
                        'api_key': [{'current_key': 'public-key'}]}]}


class FirebaseDefinesTest(unittest.TestCase):
    def test_valid_config(self):
        result = make_defines(config(), 'school', '123.apps.googleusercontent.com')
        self.assertEqual(result['FIREBASE_ANDROID_APP_ID'], '1:123:android:abc')
        self.assertEqual(result['FIREBASE_EXPECTED_PROJECT_ID'], 'school')

    def test_wrong_project_package_and_service_account_rejected(self):
        with self.assertRaises(ValueError):
            make_defines(config(), 'other', '123.apps.googleusercontent.com')
        data = config()
        data['client'][0]['client_info']['android_client_info']['package_name'] = 'wrong'
        with self.assertRaises(ValueError):
            make_defines(data, 'school', '123.apps.googleusercontent.com')
        with self.assertRaises(ValueError):
            make_defines({'private_key': 'never-use'}, 'school', '123.apps.googleusercontent.com')

    def test_missing_ambiguous_and_invalid_values_rejected(self):
        data = config()
        data['client'].append(data['client'][0])
        with self.assertRaises(ValueError):
            make_defines(data, 'school', '123.apps.googleusercontent.com')
        data = config()
        data['client'][0]['api_key'] = []
        with self.assertRaises(ValueError):
            make_defines(data, 'school', '123.apps.googleusercontent.com')
        with self.assertRaises(ValueError):
            make_defines(config(), 'school', 'invalid')


if __name__ == '__main__':
    unittest.main()
