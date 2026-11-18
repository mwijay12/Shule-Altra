/// Entry point.
///
/// The app opens on onboarding and asks which school to talk to — it does not
/// assume one. Nothing is connected until a person chooses it.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app/app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations(const [
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(const ShuleApp());
}
