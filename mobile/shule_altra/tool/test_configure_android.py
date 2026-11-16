import unittest
from configure_android import configure


class AndroidConfigurationTest(unittest.TestCase):
    def setUp(self):
        self.gradle = 'android {\nndkVersion = flutter.ndkVersion\ndefaultConfig { minSdk = flutter.minSdkVersion }\n}'
        self.manifest = '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <application\n    />\n</manifest>'

    def test_requirements_and_idempotence(self):
        gradle, manifest = configure(self.gradle, self.manifest)
        self.assertIn('minSdk = 23', gradle)
        self.assertIn('ndkVersion = "27.0.12077973"', gradle)
        self.assertIn('android.permission.INTERNET', manifest)
        self.assertIn('android:allowBackup="false"', manifest)
        self.assertEqual((gradle, manifest), configure(gradle, manifest))

    def test_unknown_template_fails_closed(self):
        with self.assertRaises(ValueError):
            configure(self.gradle.replace('flutter.minSdkVersion', '22'), self.manifest)


if __name__ == '__main__':
    unittest.main()
