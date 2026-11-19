import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shule_altra_mobile/app/app.dart';
import 'package:shule_altra_mobile/data/appearance_store.dart';

import 'fake_gateway.dart';

class MemoryAppearance implements AppearanceStore {
  ThemeMode value = ThemeMode.system;
  bool failRead = false;
  bool failWrite = false;
  @override
  Future<ThemeMode> read() async {
    if (failRead) throw StateError('read failure');
    return value;
  }
  @override
  Future<void> write(ThemeMode mode) async {
    if (failWrite) throw StateError('write failure');
    value = mode;
  }
}

class DelayedAppearance implements AppearanceStore {
  final initial = Completer<ThemeMode>();
  final writes = <(ThemeMode, Completer<void>)>[];
  ThemeMode value = ThemeMode.system;
  @override
  Future<ThemeMode> read() => initial.future;
  @override
  Future<void> write(ThemeMode mode) async {
    final pending = Completer<void>();
    writes.add((mode, pending));
    await pending.future;
    value = mode;
  }
}

Future<void> openAppearance(WidgetTester tester) async {
  await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('More')));
  await tester.pumpAndSettle();
  await tester.scrollUntilVisible(find.text('Follow system'), 200, scrollable: find.byType(Scrollable).first);
}

Future<void> choose(WidgetTester tester, String label) async {
  await tester.ensureVisible(find.text(label)); await tester.pumpAndSettle();
  await tester.tap(find.text(label)); await tester.pumpAndSettle();
}

void main() {
  test('device store only persists display mode and tolerates unknown values', () async {
    SharedPreferences.setMockInitialValues({'appearance_mode_v1': 'unknown'});
    const store = DeviceAppearanceStore();
    expect(await store.read(), ThemeMode.system);
    await store.write(ThemeMode.dark);
    expect(await store.read(), ThemeMode.dark);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getKeys(), {'appearance_mode_v1'});
    await store.write(ThemeMode.system);
    expect(await store.read(), ThemeMode.system);
  });

  testWidgets('a selection is restored on a fresh app instance', (tester) async {
    final store = MemoryAppearance();
    var gateway = FakeGateway();
    await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway, initialMode: AppMode.sample, appearanceStore: store));
    await tester.pumpAndSettle(); await openAppearance(tester); await choose(tester, 'Dark');
    expect(store.value, ThemeMode.dark);
    await tester.pumpWidget(const SizedBox.shrink()); await gateway.close();
    gateway = FakeGateway();
    await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway, initialMode: AppMode.sample, appearanceStore: store));
    await tester.pumpAndSettle();
    expect(tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode, ThemeMode.dark);
    await tester.pumpWidget(const SizedBox.shrink()); await gateway.close();
  });

  testWidgets('late restore cannot overwrite user choice and writes keep their order', (tester) async {
    final store = DelayedAppearance();
    final gateway = FakeGateway();
    await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway, initialMode: AppMode.sample, appearanceStore: store));
    await tester.pumpAndSettle(); await openAppearance(tester);
    await choose(tester, 'Dark');
    expect(store.writes.length, 1);
    await choose(tester, 'Light');
    expect(store.writes.length, 1, reason: 'second write waits for the first');
    store.initial.complete(ThemeMode.dark); await tester.pumpAndSettle();
    expect(tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode, ThemeMode.light);
    store.writes.first.$2.complete(); await tester.pumpAndSettle();
    expect(store.writes.length, 2);
    store.writes.last.$2.complete(); await tester.pumpAndSettle();
    expect(store.value, ThemeMode.light);
    await tester.pumpWidget(const SizedBox.shrink()); await gateway.close();
  });

  testWidgets('storage errors do not block use and are disclosed', (tester) async {
    final store = MemoryAppearance()..failRead = true..failWrite = true;
    final gateway = FakeGateway();
    await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway, initialMode: AppMode.sample, appearanceStore: store));
    await tester.pumpAndSettle(); await openAppearance(tester);
    expect(find.textContaining('Could not load your saved appearance'), findsOneWidget);
    await choose(tester, 'Dark');
    expect(tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode, ThemeMode.dark);
    expect(find.textContaining('Could not save this appearance'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink()); await gateway.close();
  });
}
