/// The demo sign-in form.
///
/// This is the screen that lets someone open the app on a phone without a
/// Firebase project. Two decisions make it honest:
///
///  * the credential is printed on the form, before anything is typed, with a
///    button that fills it in. A preview whose password a reviewer has to find in
///    a README is a preview most people never see;
///  * the form does not exist on the live path at all. It is built only when the
///    gateway says it accepts a demo credential, and this build only says that
///    for the sample data in a debug APK.
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../data/demo_credentials.dart';
import '../design/doodles.dart';
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
        Text(
          'DEMO SIGN-IN',
          style: Theme.of(context).textTheme.labelSmall,
        ),
        const SizedBox(height: Space.sm),
        TextField(
          controller: _email,
          enabled: !session.busy,
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Email',
            hintText: DemoCredentials.demoEmail,
            prefixIcon: Icon(Icons.alternate_email_rounded),
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
            prefixIcon: const Icon(Icons.lock_outline_rounded),
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
        const SizedBox(height: Space.xl),
        // The credential itself, in the open.
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(Space.lg),
          decoration: BoxDecoration(
            color: tokens.mutedSurface,
            borderRadius: BorderRadius.circular(Corners.panel),
            border: Border.all(color: tokens.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  ExcludeSemantics(
                    child: Icon(Icons.badge_outlined, size: 18, color: tokens.ink),
                  ),
                  const SizedBox(width: Space.sm),
                  Expanded(
                    child: Text(
                      'DEMO CREDENTIAL',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.ink),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: Space.md),
              SelectableText(
                '${DemoCredentials.demoEmail}\n${DemoCredentials.demoPassword}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontFeatures: const [FontFeature.tabularFigures()],
                      height: 1.6,
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
              child: DoodleView(doodle: Doodle.sparkles, size: 28, color: tokens.inkMuted),
            ),
            const SizedBox(width: Space.sm),
            Expanded(
              child: Text(
                'To use a real school account, go back to the start and choose Connect my school.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
