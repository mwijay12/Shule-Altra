/**
 * @fileOverview The one demo account, shared by the web hub and the mobile app.
 *
 * This file is the web reader for `config/demo-account.json`. The Flutter app
 * reads the same JSON through generated Dart constants
 * (`mobile/shule_altra/tool/sync_demo_account.py`), so there is one credential
 * in this repository rather than one per product.
 *
 * The account is a *simulation* account: it exists only when the demo auth layer
 * is in use (`NEXT_PUBLIC_DEMO_MODE` not "false"). Against a real Firebase project
 * the real SDK is loaded instead, and this password means nothing there.
 */
import raw from '../../../config/demo-account.json';

export const DEMO_ACCOUNT = raw;

/** `admin@shule.pro` — the address printed on the landing page and the app. */
export const DEMO_EMAIL = raw.email;

/** `demo2026` — public by design; there is nothing behind it but invented data. */
export const DEMO_PASSWORD = raw.password;

/** The staff document id the demo seed creates for this account. */
export const DEMO_UID = raw.uid;

export const DEMO_SCHOOL_ID = raw.schoolId;
