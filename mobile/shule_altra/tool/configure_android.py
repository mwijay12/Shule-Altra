#!/usr/bin/env python3
"""Apply the pilot's Android requirements to a Flutter 3.29.3 scaffold.

Run after generating Android; fail closed if the template changes unexpectedly.
Does not register an Android Firebase app or configure signing.
"""
from pathlib import Path


def replace_once(text: str, old: str, new: str) -> str:
    if text.count(new) == 1 and text.count(old) == (1 if old in new else 0):
        return text  # Safe to run twice.
    if text.count(old) != 1 or new in text:
        raise ValueError(f'Unexpected Android template; cannot safely update {old!r}')
    return text.replace(old, new, 1)


def configure(gradle: str, manifest: str) -> tuple[str, str]:
    gradle = replace_once(gradle, 'minSdk = flutter.minSdkVersion', 'minSdk = 23')
    gradle = replace_once(gradle, 'ndkVersion = flutter.ndkVersion', 'ndkVersion = "27.0.12077973"')
    manifest = replace_once(
        manifest,
        '<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
        '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <uses-permission android:name="android.permission.INTERNET" />',
    )
    manifest = replace_once(manifest, '    <application\n', '    <application\n        android:allowBackup="false"\n')
    return gradle, manifest


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    gradle = root / 'android/app/build.gradle.kts'
    manifest = root / 'android/app/src/main/AndroidManifest.xml'
    new_gradle, new_manifest = configure(gradle.read_text(), manifest.read_text())
    gradle.write_text(new_gradle)
    manifest.write_text(new_manifest)
    print('Android configured: API 23 minimum, NDK 27, internet and backup disabled.')


if __name__ == '__main__':
    main()
