/// Only the display preference is stored on this device, never account data.
library;

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

abstract interface class AppearanceStore {
  Future<ThemeMode> read();
  Future<void> write(ThemeMode mode);
}

class DeviceAppearanceStore implements AppearanceStore {
  const DeviceAppearanceStore();
  static const _key = 'appearance_mode_v1';

  @override
  Future<ThemeMode> read() async {
    final prefs = await SharedPreferences.getInstance();
    return switch (prefs.getString(_key)) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
  }

  @override
  Future<void> write(ThemeMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    if (!await prefs.setString(_key, mode.name)) {
      throw StateError('Appearance preference could not be saved');
    }
  }
}
