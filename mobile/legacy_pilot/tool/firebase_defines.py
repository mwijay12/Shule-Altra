#!/usr/bin/env python3
"""Prepare public Flutter client defines from an Android Firebase config.

No Firebase resources are created or modified. Never use a service-account key.
"""
import argparse
import json
from pathlib import Path

PACKAGE = 'com.shulealtra.shule_altra_mobile'


def make_defines(config: dict, expected_project: str, web_client_id: str) -> dict:
    if not isinstance(config, dict) or 'private_key' in config:
        raise ValueError('Expected an Android google-services.json, not a service-account key.')
    project = config.get('project_info') or {}
    if not isinstance(project, dict) or project.get('project_id') != expected_project or not expected_project.strip():
        raise ValueError('Firebase project ID does not match the independently verified project.')
    clients = config.get('client')
    if not isinstance(clients, list):
        raise ValueError('Missing Android client list.')
    matches = [c for c in clients if isinstance(c, dict) and
               ((c.get('client_info') or {}).get('android_client_info') or {}).get('package_name') == PACKAGE]
    if len(matches) != 1:
        raise ValueError(f'Expected exactly one Android client for {PACKAGE}.')
    client = matches[0]
    keys = client.get('api_key') or []
    if not isinstance(keys, list) or len(keys) != 1 or not isinstance(keys[0], dict):
        raise ValueError('Expected exactly one Android API key.')
    values = {
        'FIREBASE_PROJECT_ID': project.get('project_id'),
        'FIREBASE_EXPECTED_PROJECT_ID': expected_project,
        'FIREBASE_ANDROID_APP_ID': (client.get('client_info') or {}).get('mobilesdk_app_id'),
        'FIREBASE_MESSAGING_SENDER_ID': project.get('project_number'),
        'FIREBASE_API_KEY': keys[0].get('current_key'),
        'FIREBASE_GOOGLE_WEB_CLIENT_ID': web_client_id,
    }
    if any(not isinstance(v, str) or not v.strip() or v != v.strip() for v in values.values()):
        raise ValueError('A required client value is missing or has surrounding whitespace.')
    if not web_client_id.endswith('.apps.googleusercontent.com'):
        raise ValueError('OAuth client ID must end in .apps.googleusercontent.com.')
    return values


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('config', type=Path, help='Downloaded Android google-services.json')
    parser.add_argument('--expected-project', required=True, help='Independently verified school Firebase project ID')
    parser.add_argument('--web-client-id', required=True, help='Web OAuth client ID for this Firebase project')
    args = parser.parse_args()
    output = Path(__file__).resolve().parent.parent / '.local' / 'firebase-defines.json'
    try:
        defines = make_defines(json.loads(args.config.read_text()), args.expected_project, args.web_client_id)
        output.parent.mkdir(exist_ok=True)
        # Avoid unexpectedly replacing an existing configuration.
        with output.open('x') as file:
            json.dump(defines, file, indent=2)
            file.write('\n')
    except (ValueError, OSError, json.JSONDecodeError, AttributeError, TypeError) as error:
        parser.exit(1, f'Configuration not written: {error}\n')
    print(f'Wrote {output}. Verify Android OAuth package, signing SHA and Web client independently.')


if __name__ == '__main__':
    main()
