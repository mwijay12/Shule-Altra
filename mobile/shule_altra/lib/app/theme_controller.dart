/// Persistent 3-way theme controller: Light (default), Dark, and Auto (Phone).
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeController extends ChangeNotifier {
  ThemeController({ThemeMode initial = ThemeMode.light, bool persist = true})
      : _mode = initial,
        _persist = persist;

  static const String _storageKey = 'shule_altra_theme_mode_v2';

  final bool _persist;
  ThemeMode _mode;

  ThemeMode get mode => _mode;

  Future<void> load() async {
    if (!_persist) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_storageKey);
      final parsed = switch (saved) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        'system' => ThemeMode.system,
        _ => null,
      };
      if (parsed != null && parsed != _mode) {
        _mode = parsed;
        notifyListeners();
      }
    } catch (_) {
      // Keep default ThemeMode.system if preferences are unavailable.
    }
  }

  void setMode(ThemeMode next) {
    if (_mode == next) return;
    _mode = next;
    notifyListeners();
    if (_persist) unawaited(_save(next));
  }

  Future<void> _save(ThemeMode next) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_storageKey, next.name);
    } catch (_) {
      // Non-fatal: theme still applies for the current session.
    }
  }
}
