/// Dedicated Single-School Staff Sign-In screen matching `src/app/login/page.tsx`.
///
/// Offers:
///  * Official Shule Altra shield icon & Mwalimu Nyerere Secondary School header
///  * Email + Password sign-in (`admin@shule.pro`, `teacher@shule.pro`,
///    `bursar@shule.pro`, password `demo2026`, or live Firebase when configured)
///  * One-tap Demo Role cards matching the web dashboard (`Administrator`,
///    `Teacher`, `Bursar`)
///  * Optional Google sign-in button when Firebase Auth is configured
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../app/theme_controller.dart';
import '../data/demo_credentials.dart';
import '../data/demo_school_store.dart';
import '../design/glass.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({
    super.key,
    required this.session,
    required this.workspace,
    required this.onAuthenticated,
    this.onBack,
    this.themeController,
  });

  final AppSession session;
  final SchoolWorkspace workspace;
  final VoidCallback onAuthenticated;
  final VoidCallback? onBack;
  final ThemeController? themeController;

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController(text: DemoCredentials.demoEmail);
  final _password = TextEditingController();
  bool _obscure = true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submitCredentials() async {
    final email = _email.text.trim();
    final password = _password.text;
    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = 'Enter your school email and password.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    // Check website-aligned demo roles first (`admin@shule.pro`, `teacher@shule.pro`, `bursar@shule.pro`).
    final matchedDemo = DemoCredentials.available
        ? SchoolProfile.matchDemoLogin(email, password)
        : null;

    if (matchedDemo != null) {
      await _enterDemoRole(matchedDemo);
      return;
    }

    // Live gateway sign-in if configured for non-demo accounts.
    if (!widget.session.acceptsDemoCredential) {
      await widget.session.signIn();
      if (!mounted) return;
      setState(() => _busy = false);
      if (widget.session.signedIn) {
        widget.onAuthenticated();
      } else {
        setState(
          () => _error =
              widget.session.failure ?? 'Could not sign in with those credentials.',
        );
      }
      return;
    }

    if (!mounted) return;
    setState(() {
      _busy = false;
      _error =
          'Use one of the Mwalimu Nyerere demo accounts (password: ${DemoCredentials.demoPassword}) or tap a role below.';
    });
  }

  Future<void> _enterDemoRole(DemoRoleAccount role) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    widget.workspace.setActiveStaff(role);
    if (widget.session.acceptsDemoCredential) {
      await widget.session.signInWithDemo(
        DemoCredentials.demoEmail,
        DemoCredentials.demoPassword,
      );
    } else if (!widget.session.signedIn) {
      await widget.session.signIn();
    }
    if (!mounted) return;
    setState(() => _busy = false);
    widget.onAuthenticated();
  }

  Future<void> _signInWithGoogle() async {
    if (widget.session.acceptsDemoCredential) {
      setState(
        () => _error =
            'Google sign-in requires live Firebase configuration. Use a staff role below to open Mwalimu Nyerere Secondary School immediately.',
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    await widget.session.signIn();
    if (!mounted) return;
    setState(() => _busy = false);
    if (widget.session.signedIn) {
      widget.onAuthenticated();
    } else {
      setState(() => _error = widget.session.failure);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final mode = widget.themeController?.mode ?? ThemeMode.system;

    return Scaffold(
      backgroundColor: tokens.canvas,
      body: ShuleBackdrop(
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 500),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
                children: [
                  Row(
                    children: [
                      if (widget.onBack != null)
                        IconButton(
                          tooltip: 'Back to overview',
                          onPressed: widget.onBack,
                          icon: const Icon(Icons.arrow_back_rounded),
                        ),
                      const Spacer(),
                      if (widget.themeController != null)
                        _MiniThemePill(
                          mode: mode,
                          onSelect: widget.themeController!.setMode,
                        ),
                    ],
                  ),
                  const SizedBox(height: Space.sm),
                  Column(
                    children: [
                      const ShuleLogoMark(size: 74, radius: 22),
                      const SizedBox(height: Space.md),
                      Text(
                        'Shule Altra',
                        style: Theme.of(context).textTheme.displayMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              fontSize: 30,
                            ),
                      ),
                      const SizedBox(height: Space.xs),
                      Text(
                        SchoolProfile.schoolName,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: tokens.blueInk,
                            ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${SchoolProfile.location} · Staff Sign-In',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                  const SizedBox(height: Space.xl),
                  ShuleGlassCard(
                    glowCorner: true,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Staff Portal Login',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                            ),
                            StatusPill(
                              label: 'SINGLE SCHOOL',
                              background: tokens.blueWash,
                              foreground: tokens.blueInk,
                              uppercase: true,
                            ),
                          ],
                        ),
                        const SizedBox(height: Space.md),
                        TextField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          autofillHints: const [AutofillHints.email],
                          decoration: const InputDecoration(
                            labelText: 'School email',
                            hintText: 'admin@shule.pro',
                            prefixIcon: Icon(Icons.mail_outline_rounded),
                          ),
                        ),
                        const SizedBox(height: Space.md),
                        TextField(
                          controller: _password,
                          obscureText: _obscure,
                          autofillHints: const [AutofillHints.password],
                          onSubmitted: (_) => _submitCredentials(),
                          decoration: InputDecoration(
                            labelText: 'Password',
                            hintText: DemoCredentials.demoPassword,
                            prefixIcon: const Icon(Icons.lock_outline_rounded),
                            suffixIcon: IconButton(
                              tooltip: _obscure ? 'Show password' : 'Hide password',
                              onPressed: () => setState(() => _obscure = !_obscure),
                              icon: Icon(
                                _obscure
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                              ),
                            ),
                          ),
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: Space.md),
                          Notice(
                            tone: NoticeTone.danger,
                            title: 'Sign-in notice',
                            body: _error!,
                          ),
                        ],
                        const SizedBox(height: Space.lg),
                        GradientButton(
                          label: 'Sign in',
                          icon: Icons.login_rounded,
                          busy: _busy,
                          onPressed: _submitCredentials,
                        ),
                        const SizedBox(height: Space.sm),
                        OutlinedButton.icon(
                          onPressed: _busy ? null : _signInWithGoogle,
                          icon: const Icon(Icons.g_mobiledata_rounded, size: 24),
                          label: const Text('Continue with Google'),
                        ),
                      ],
                    ),
                  ),
                  if (DemoCredentials.available) ...[
                    const SizedBox(height: Space.xl),
                    const SectionHead(
                      title: 'One-tap demo roles',
                      trailing: 'Password: ${DemoCredentials.demoPassword}',
                    ),
                    const SizedBox(height: Space.sm),
                    Text(
                      'Matches the Shule Altra website login. Pick any staff role to open Mwalimu Nyerere Secondary School immediately.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: Space.md),
                    for (final role in SchoolProfile.demoRoles) ...[
                      ShuleGlassCard(
                        padding: const EdgeInsets.all(Space.md),
                        onTap: _busy ? null : () => _enterDemoRole(role),
                        child: Row(
                          children: [
                            ShuleGlyph(
                              icon: switch (role.role) {
                                'ADMIN' => Icons.admin_panel_settings_rounded,
                                'BURSAR' => Icons.account_balance_wallet_rounded,
                                _ => Icons.menu_book_rounded,
                              },
                              size: 44,
                            ),
                            const SizedBox(width: Space.md),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${role.label} · ${role.title}',
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                          fontSize: 15,
                                        ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${role.email} · ${role.scope}',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            Icon(Icons.arrow_forward_ios_rounded, size: 15, color: tokens.blueInk),
                          ],
                        ),
                      ),
                      const SizedBox(height: Space.sm),
                    ],
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MiniThemePill extends StatelessWidget {
  const _MiniThemePill({required this.mode, required this.onSelect});

  final ThemeMode mode;
  final ValueChanged<ThemeMode> onSelect;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: tokens.mutedSurface,
        borderRadius: BorderRadius.circular(Corners.pill),
        border: Border.all(color: tokens.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final entry in const [
            (ThemeMode.system, Icons.brightness_auto_rounded, 'Auto'),
            (ThemeMode.light, Icons.light_mode_rounded, 'Light'),
            (ThemeMode.dark, Icons.dark_mode_rounded, 'Dark'),
          ])
            GestureDetector(
              onTap: () => onSelect(entry.$1),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: mode == entry.$1 ? tokens.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(Corners.pill),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      entry.$2,
                      size: 14,
                      color: mode == entry.$1 ? tokens.onPrimary : tokens.inkMuted,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      entry.$3,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: mode == entry.$1 ? tokens.onPrimary : tokens.inkMuted,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
