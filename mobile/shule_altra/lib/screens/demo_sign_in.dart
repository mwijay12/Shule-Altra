/// The demo sign-in form.
///
/// Prints the demo credential openly with a one-tap fill button, and is only
/// built on the fictional sample gateway.
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../data/demo_credentials.dart';
import '../design/doodles.dart';
import '../design/glass.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';

class DemoSignInForm extends StatefulWidget {
  const DemoSignInForm({super.key, required this.session});

  final AppSession session;

  @override
  State<DemoSignInForm> createState() => _DemoSignInFormState();
}

class _DemoSignInFormState extends State<DemoSignInForm> {
  final _email = TextEditingController(text: DemoCredentials.demoEmail);
  final _password = TextEditingController();
  bool _showPassword = false;
  String? _localError;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    setState(() => _localError = null);
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _localError = 'Both fields are needed before signing in.');
      return;
    }
    await widget.session.signInWithDemo(_email.text, _password.text);
  }

  void _fill() {
    setState(() {
      _email.text = DemoCredentials.demoEmail;
      _password.text = DemoCredentials.demoPassword;
      _localError = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final session = widget.session;
    final error = _localError ?? session.failure;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ShuleGlassCard(
          padding: const EdgeInsets.all(Space.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const StatusPill(
                label: 'DEMO SIGN-IN',
                icon: Icons.key_outlined,
                uppercase: true,
              ),
              const SizedBox(height: Space.md),
              TextField(
                controller: _email,
                enabled: !session.busy,
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: 'Email',
                  hintText: DemoCredentials.demoEmail,
                  prefixIcon: Icon(Icons.alternate_email_rounded, color: tokens.blueInk),
                ),
              ),
              const SizedBox(height: Space.md),
              TextField(
                controller: _password,
                enabled: !session.busy,
                obscureText: !_showPassword,
                autocorrect: false,
                enableSuggestions: false,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) {
                  if (!session.busy) _submit();
                },
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: Icon(Icons.lock_outline_rounded, color: tokens.blueInk),
                  suffixIcon: IconButton(
                    tooltip: _showPassword ? 'Hide password' : 'Show password',
                    icon: Icon(
                      _showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    ),
                    onPressed: () => setState(() => _showPassword = !_showPassword),
                  ),
                ),
              ),
              if (error != null) ...[
                const SizedBox(height: Space.md),
                Notice(
                  title: session.busy ? 'Signing in' : 'Could not sign in',
                  body: error,
                  tone: NoticeTone.danger,
                ),
              ],
              const SizedBox(height: Space.lg),
              GradientButton(
                label: session.busy ? 'Signing in…' : 'Sign in to the demo',
                onPressed: session.busy ? null : _submit,
                busy: session.busy,
                icon: Icons.login_rounded,
              ),
            ],
          ),
        ),
        const SizedBox(height: Space.lg),
        // The credential itself, in the open.
        ShuleGlassCard(
          glowCorner: true,
          padding: const EdgeInsets.all(Space.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const StatusPill(
                label: 'DEMO CREDENTIAL',
                icon: Icons.badge_outlined,
                uppercase: true,
              ),
              const SizedBox(height: Space.md),
              ShuleInnerTile(
                padding: const EdgeInsets.symmetric(horizontal: Space.lg, vertical: Space.md),
                child: SizedBox(
                  width: double.infinity,
                  child: SelectableText(
                    '${DemoCredentials.demoEmail}\n${DemoCredentials.demoPassword}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          fontFeatures: const [FontFeature.tabularFigures()],
                          height: 1.65,
                        ),
                  ),
                ),
              ),
              const SizedBox(height: Space.md),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: session.busy ? null : _fill,
                  icon: const Icon(Icons.auto_fix_high_outlined, size: 18),
                  label: const Text('Fill the demo credential'),
                ),
              ),
              const SizedBox(height: Space.md),
              Text(
                'This credential only opens the fictional sample register. It is not '
                'a school account, it stores nothing, and it cannot read a real one.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
        const SizedBox(height: Space.lg),
        Row(
          children: [
            ExcludeSemantics(
              child: DoodleView(doodle: Doodle.sparkles, size: 28, color: tokens.blueInk),
            ),
            const SizedBox(width: Space.sm),
            Expanded(
              child: Text(
                'You can also continue with Google above, if this build has a school '
                'project configured.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
