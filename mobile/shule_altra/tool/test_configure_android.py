import unittest
from configure_android import configure


class AndroidConfigurationTest(unittest.TestCase):
    def setUp(self):
        self.gradle = (
            'android {\n'
            '    ndkVersion = flutter.ndkVersion\n'
            '    compileOptions {\n'
            '        sourceCompatibility = JavaVersion.VERSION_11\n'
            '        targetCompatibility = JavaVersion.VERSION_11\n'
            '    }\n'
            '    defaultConfig { minSdk = flutter.minSdkVersion }\n'
            '}\n'
            'flutter {\n'
            '    source = "../.."\n'
            '}\n'
        )
        self.manifest = (
            '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n'
            '    <application\n'
            '        android:label="shule_altra_mobile"\n'
            '    />\n'
            '</manifest>'
        )

    def test_requirements_and_idempotence(self):
        gradle, manifest = configure(self.gradle, self.manifest)
        self.assertIn('minSdk = 23', gradle)
        self.assertIn('ndkVersion = "27.0.12077973"', gradle)
        self.assertIn('isCoreLibraryDesugaringEnabled = true', gradle)
        self.assertIn('coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")', gradle)
        self.assertIn('android.permission.INTERNET', manifest)
        self.assertIn('android.permission.POST_NOTIFICATIONS', manifest)
        self.assertIn('android.permission.READ_MEDIA_IMAGES', manifest)
        self.assertIn('android.permission.READ_EXTERNAL_STORAGE', manifest)
        self.assertIn('android.permission.CAMERA', manifest)
        self.assertIn('android:allowBackup="false"', manifest)
        self.assertIn('android:label="Shule Altra"', manifest)
        self.assertEqual((gradle, manifest), configure(gradle, manifest))

    def test_unknown_template_fails_closed(self):
        with self.assertRaises(ValueError):
            configure(self.gradle.replace('flutter.minSdkVersion', '22'), self.manifest)


if __name__ == '__main__':
    unittest.main()
