# Connecting Shule Altra to your Firebase project

This is the runbook for moving off the offline demo and onto the real project
that is already configured in the code: **`studio-9420247393-c051b`**.

Everything below is a command you run. Nothing in this repository has written to
your live project — the sandbox this was built in has no credentials for it and
no network route to Google APIs. The seed script has been verified in `--dry-run`
(4,200 documents, 4,596 timestamps converted, 11 batches); the write itself needs
your service account.

---

## 0. What you need

| Thing | Where it comes from |
| --- | --- |
| Firebase CLI | `npm i -g firebase-tools` then `firebase login` |
| Service account key | Firebase Console → Project settings → Service accounts → **Generate new private key** |
| Google sign-in enabled | Firebase Console → Authentication → Sign-in method → Google → Enable |
| Your domain authorised | Authentication → Settings → **Authorized domains** |

Save the key somewhere outside the repo, e.g. `~/keys/shule-altra.json`.
**Never commit it.** `.gitignore` already excludes `service-account*.json`.

The super admin is **`davidbyanmwijage@gmail.com`**. It is declared in two places
that must stay in sync:

- `src/lib/auth/super-admin.ts` — decides what the UI shows
- `isSuperAdmin()` in `firestore.rules` and `storage.rules` — decides what is
  actually allowed

The rules are the real gate. Editing the TypeScript list alone grants nothing.

---

## 1. Deploy the security rules first

Do this **before** seeding or signing in, otherwise the writes are rejected.

```bash
firebase use studio-9420247393-c051b
npm run firebase:rules
```

That deploys `firestore.rules`, `firestore.indexes.json` and `storage.rules`.

What the rules now allow:

- `schools/school-001/config/branding` — **public read** (colours and font names
  only; the login screen needs them before anyone signs in), ADMIN write.
- `schools/school-001/config/identity` — any staff member may read (they print
  letterheads), ADMIN or super admin may write.
- `schools/school-001/brand/logo.*` in Storage — public read, ADMIN write,
  PNG/JPEG under 2 MB.
- The super admin, identified by a **verified** Google email, holds every staff
  capability without needing a `staff/{uid}` record.

---

## 2. Seed the demo school into Firestore

Check what will be written — this needs no credentials and writes nothing:

```bash
npm run firebase:seed -- --dry-run
```

You should see:

```
  project        studio-9420247393-c051b
  schema version 6
  documents      4200
  batches        11 (max 400 writes each)

   2932  grades
    900  attendance
    150  students
    140  transactions
    ...
  converted 4200 documents · 4596 timestamps · 0 sentinels
```

Then write it for real:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=~/keys/shule-altra.json
npm run firebase:seed -- --project studio-9420247393-c051b --confirm
```

Notes:

- Writes are **merged** (`set(..., { merge: true })`), so re-running is safe and
  idempotent — the dataset is generated from a fixed seed.
- `--confirm` is mandatory. Without it the script refuses to write.
- `--school other-id` retargets every path if you ever add a second school.
- Application Default Credentials also work: `gcloud auth application-default login`
  and omit `GOOGLE_APPLICATION_CREDENTIALS`.

**Alternative without a service key:** run the app against the real project
(step 3), sign in with Google as the super admin, then use
**Settings → Demo data → Seed**. That calls the same dataset builder through the
browser SDK and is allowed by the rules. Slower, but needs no key.

---

## 3. Point the app at the real project

Create `.env.local` (already gitignored):

```bash
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_FIREBASE_CONFIG='{"apiKey":"…","authDomain":"studio-9420247393-c051b.firebaseapp.com","projectId":"studio-9420247393-c051b","storageBucket":"studio-9420247393-c051b.appspot.com","messagingSenderId":"506164974996","appId":"1:506164974996:web:72f8b7c3348cca240eab81"}'
```

`NEXT_PUBLIC_DEMO_MODE=false` is the switch that matters: while it is unset the
build aliases `firebase/*` to the offline layer in `src/lib/demo`, so **no**
network call reaches Firebase and Google sign-in is simulated locally.

```bash
npm run dev
```

Open `/login` → **Continue with Google** → sign in as
`davidbyanmwijage@gmail.com`. You land in the dashboard with the `SUPER_ADMIN`
role and the Theme Studio in the sidebar.

If the popup fails, the message names the cause. The two common ones:

- `auth/unauthorized-domain` → add the domain under Authentication → Settings →
  Authorized domains. For a Vercel preview that means the exact
  `*.vercel.app` host you are testing.
- `auth/operation-not-allowed` → the Google provider is not enabled yet.

---

## 4. Set the school's identity and colours

**Theme Studio** (`/dashboard/theme-studio`):

1. Pick a palette — Blue Ridge, Emerald, Carbon Gold or Crimson. Each has a light
   and a dark variant; light is the default for new workstations.
2. Pick a type pairing.
3. Upload the school logo (**PNG or JPEG**, under 2 MB). SVG is refused on
   purpose: pdf-lib cannot embed it, so it would show in the sidebar and then
   silently vanish from every letterhead.
4. Fill in the printed name, motto, address, contacts, NECTA centre and
   registration number.
5. **Download a real PDF proof.** This runs the production document engine, so
   the logo, colours and address are exactly what a parent receives.
6. **Publish to school** for the palette/type, **Save identity** for the details.

Both write to Firestore and propagate immediately: the sidebar mark, the WebGL
orb, every button and badge, and the next report card, fee statement, ID card or
letterhead. Documents always use the palette's **light** variant — a colour tuned
to glow on a dark screen prints as a pale wash on white paper.

---

## 5. Deploy the app

The repository is already connected to Vercel (`shule-direct-pro`). Set the same
two environment variables in the Vercel project for **Production** and
**Preview**, then redeploy. Add each preview domain you actually use to Firebase's
authorized domains, or sign-in will fail there.

For Firebase Hosting instead:

```bash
npm run build
firebase deploy --only hosting
```

---

## 6. Verify

```bash
npm run typecheck
npm run demo:smoke:brand      # palettes, contrast, PDF propagation, icons, rules
npm run firebase:seed -- --dry-run
```

Then in the browser:

- [ ] Dashboard opens **light**, in the palette you published
- [ ] The orb is a visible wireframe, not a pale smudge
- [ ] Sidebar shows the school's own name and logo
- [ ] Theme Studio → PDF proof carries the uploaded logo and the new colours
- [ ] A report card downloaded from Students matches the proof
- [ ] Signing in as a non-admin hides the Theme Studio

---

## Server-side gates you must know about

Two server endpoints decide things the browser must not be allowed to decide.
Both were tightened during the audit; both now **fail closed**.

### `/api/session` — the document gate

Report cards, the defaulters register and the fee ledger are served through
`/api/documents/*`, which reads an httpOnly role cookie. That cookie is only
worth anything if the server chose its value.

- **Offline demo:** accepts the role posted by the login screen (no real data).
- **Real project:** the browser posts a Firebase **ID token**. The server verifies
  it against `identitytoolkit`, then reads `schools/school-001/staff/<uid>` **with
  the caller's own token**, so Firestore rules apply to that lookup too. Any
  failure clears the cookie and returns 401/403/503.

No service-account key is needed for this — it is plain REST against your web
config. Before this change, `POST {"role":"ADMIN"}` with no session at all
returned the defaulters register.

The cookie lasts 12 hours, so a revoked role can linger that long on an already
open browser. Shorten `SESSION_MAX_AGE` in `src/lib/session.ts` if that matters
to you.

### `/api/webhooks/clickpesa` — money

Set **`CLICKPESA_WEBHOOK_SECRET`** in the deployment environment. Deliveries are
accepted only when `x-clickpesa-signature` is a valid HMAC-SHA256 of the raw body
using that secret (bare hex or `sha256=…`). With no secret set the endpoint
returns 503 and accepts nothing.

Replays and concurrent duplicates are acknowledged without crediting: the
pending row is re-read inside the Firestore transaction and an already-applied
`transaction_id` is ignored.

**Still required before go-live:** this handler uses the web SDK's Firestore
instance. Against a live project it needs a server credential whose writes the
rules accept (an Admin SDK path or a custom claim). It has not been exercised
against a real ClickPesa account — treat it as verified for integrity, not as a
certified integration.

---

## Cost and safety notes

- 4,200 documents is well inside the free tier. The grades collection (2,932) is
  the bulk of it; reads are paginated per class, not per school.
- The seed merges, so it will overwrite edits to seeded records. Do not re-seed a
  school that has started entering real data — use a second `--school` id.
- Firebase web config values are public by design. The rules, not the keys, are
  what protect the data. The service account key is **not** public and must stay
  out of the repo and out of `NEXT_PUBLIC_*`.
