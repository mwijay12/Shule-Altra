# Test accounts and staff access

Use a **separate Firebase test project and test deployment** with fictitious learners, not the school's production database. Do not put passwords, service-account keys or tokens in this repository. The project in `.firebaserc` is only a CLI default; confirm which project the deployment actually uses before changing anything.

## Suggested accounts

These are examples, not accounts created by the app. Replace `example.com` with addresses you control and can receive mail at (especially if using password resets). The display job is not itself a security role. Give each person their own login.

| Job / example email | Current staff role | Notes |
| --- | --- | --- |
| `academic@example.com` — academic master | `TEACHER` | Class/subject assignments required for new marks in the draft phase-6 rules. |
| `discipline@example.com` — discipline teacher | `TEACHER` | Not yet a separate discipline permission. |
| `sports@example.com` — sports teacher | `TEACHER` | Not yet a separate sports permission. |
| `math@example.com` — mathematics teacher | `TEACHER` | Assign Mathematics to each appropriate class. |
| `master@example.com` — head teacher | `ADMIN` | Broad access. Use a test-only account, not for every teacher. |
| `bursar@example.com` — bursar | `BURSAR` | Finance access role; available in the draft staff form. |
| `class-teacher@example.com` — class teacher | `TEACHER` | Class-teacher duties are not yet a separate permission. |
| `driver@example.com` — transport staff | No supported dedicated role yet | Do not grant admin or teacher access just to represent a job. |
| `hostel@example.com` — hostel staff | No supported dedicated role yet | Pending staff duties and permissions (phases 7 and 10). |

Names such as `academic@shule.altra` are only usable for mail if your organisation controls the domain and mailbox. Firebase Authentication email/password accounts do not automatically create mailboxes. For quick isolated testing you can use fictitious syntactically valid addresses, but email verification and password reset will not work unless they can receive mail.

## Set up a test user

1. In Firebase Console select the **test** project; enable Authentication → Sign-in method → Email/Password. In Authentication → Users, add a user with a test email and a strong temporary password. Prefer a different password for each account. Don't reuse production passwords, publish them, or send them in chat. Shared passwords make it impossible to attribute account use safely; if you use one briefly in an isolated disposable test project, replace it and remove the accounts afterwards.
2. Copy that user's **UID** from Authentication → Users. Sign in to the test deployment as the verified owner or an administrator. In **Staff → Enroll Staff**, enter the same person's details, select an available role and paste their UID in the optional Firebase Authentication UID field. Verify the UID carefully: the app does not verify ownership of the UID or create an Authentication account. The staff document ID becomes that UID, and the app refuses to overwrite an existing staff record. A blank UID creates a registry-only record, not a login.
3. For a teacher, use **Staff → Teaching assignments** to add each class and subject. The assignments and grade restrictions are in the draft PR: deploy the matching application and reviewed Firestore rules to the **test project** first. They have not yet been verified in a live Firebase project. Existing random-ID staff records are not migrated automatically; do not create a second record for the same person without an administrator planning the migration and checking assignments.
4. Sign out, sign in as the test user and check both allowed and denied actions. Confirm the UI and the database rules separately: hiding a button is not security. Repeat with an unassigned teacher and a different class. No account should be considered production-ready solely because a demo test works.

The underlying Firestore shape for a staff profile is `schools/school-001/staff/<Firebase Auth UID>`, with `role` such as `TEACHER` or `ACCOUNTANT`; UID, not email or staff number, connects the login to the role. The UID entry feature is currently in the open draft, not necessarily deployed. The app's demo-mode accounts (`admin@shule.pro`, `teacher@shule.pro`, `bursar@shule.pro` with the public demo password) are browser-local simulation accounts, **not** real Firebase users; do not reuse that public password for Firebase.

**Important limitations:** The current `active` flag is not a complete account revocation mechanism. Disable a user's Firebase Authentication account separately when necessary. The branch adds server-side identity and role revalidation for gated endpoints on each request, but this must be tested in a real Firebase test project before relying on urgent revocation. Network or verification failures deny those requests. Other access paths and existing deployed versions require separate review. Staff duties such as discipline, sports, driver and hostel are registry labels, not independent access policies yet. Existing legacy grades and reports still need duplicate handling, and Firestore rule tests are pending. Never deploy draft rules to production as if these gaps were resolved.
