#!/usr/bin/env python3
"""Apply Shule Altra's Android requirements to a Flutter 3.29.3 scaffold.

Configures minimum API level, NDK, core library desugaring (for local
notifications), app display name, runtime permissions (internet, notifications,
gallery/photos, camera), and installs the Shule Altra launcher & adaptive icons.
"""
import re
import shutil
from pathlib import Path

PERMISSIONS_BLOCK = """<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />"""

DESUGARING_DEP = """dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}"""


def replace_once(text: str, old: str, new: str) -> str:
    if text.count(new) == 1 and text.count(old) == (1 if old in new else 0):
        return text  # Safe to run twice.
    if text.count(old) != 1 or new in text:
        raise ValueError(f'Unexpected Android template; cannot safely update {old!r}')
    return text.replace(old, new, 1)


def configure(gradle: str, manifest: str) -> tuple[str, str]:
    gradle = replace_once(gradle, 'minSdk = flutter.minSdkVersion', 'minSdk = 23')
    gradle = replace_once(gradle, 'ndkVersion = flutter.ndkVersion', 'ndkVersion = "27.0.12077973"')

    if 'isCoreLibraryDesugaringEnabled = true' not in gradle:
        if 'targetCompatibility = JavaVersion.VERSION_11' in gradle:
            gradle = replace_once(
                gradle,
                'targetCompatibility = JavaVersion.VERSION_11',
                'targetCompatibility = JavaVersion.VERSION_11\n        isCoreLibraryDesugaringEnabled = true',
            )
        elif 'targetCompatibility = JavaVersion.VERSION_1_8' in gradle:
            gradle = replace_once(
                gradle,
                'targetCompatibility = JavaVersion.VERSION_1_8',
                'targetCompatibility = JavaVersion.VERSION_1_8\n        isCoreLibraryDesugaringEnabled = true',
            )

    if 'coreLibraryDesugaring(' not in gradle and 'flutter {' in gradle:
        gradle = gradle.rstrip() + '\n\n' + DESUGARING_DEP + '\n'

    manifest = replace_once(
        manifest,
        '<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
        PERMISSIONS_BLOCK,
    )
    manifest = replace_once(
        manifest,
        '    <application\n',
        '    <application\n        android:allowBackup="false"\n',
    )
    manifest = re.sub(
        r'android:label="[^"]+"',
        'android:label="Shule Altra"',
        manifest,
        count=1,
    )
    return gradle, manifest


def install_launcher_icons(root: Path) -> int:
    source = root / 'assets/launcher'
    target_res = root / 'android/app/src/main/res'
    if not source.exists() or not target_res.exists():
        return 0
    copied = 0
    for item in source.rglob('*'):
        if item.is_file():
            rel = item.relative_to(source)
            dest = target_res / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, dest)
            copied += 1
    return copied


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    gradle = root / 'android/app/build.gradle.kts'
    manifest = root / 'android/app/src/main/AndroidManifest.xml'
    new_gradle, new_manifest = configure(gradle.read_text(), manifest.read_text())
    gradle.write_text(new_gradle)
    manifest.write_text(new_manifest)
    copied = install_launcher_icons(root)
    print(
        f'Android configured: API 23 min, NDK 27, desugaring, permissions '
        f'(internet/notifications/gallery/camera), label "Shule Altra", '
        f'{copied} launcher icon resources installed.'
    )


if __name__ == '__main__':
    main()
