# Shule Altra

Shule Altra is a production-grade school management platform engineered by [Altraware Technology Ltd](https://altra.tanzaniareach.com/), a Tanzanian software and systems architecture studio in Dar es Salaam. It brings student records, attendance, academics, fees, NECTA grading, and printable documents into one unified, bilingual (English & Swahili) dashboard.

---

## Architecture & Live Integrations

### 1. Cloud Firestore Database
- **Backend:** Google Cloud Firestore (`studio-2181801796-1fa72`).
- **Security:** Strict role-based access control (`firestore.rules`) enforcing SuperAdmin privileges and staff roles (Admin, Bursar, Accountant, Teacher).
- **Seeded Datasets:** Over 4,200 verified documents under `schools/school-001` including:
  - 2,932 NECTA academic grade records across Form 1–4.
  - 900 daily attendance records.
  - 150 enrolled students with fee ledger balances.
  - 140 financial revenue and payment audit entries.
  - Comprehensive assets, canteen sales, staff establishings, hostels, and routes.

### 2. Cloudinary Media Storage
- **Purpose:** Secure keeper for student photographs, ID card portraits, and institutional media assets.
- **Why Cloudinary:** Direct browser-to-cloud unsigned upload preset (`shule_students`) eliminates heavy image binaries from the database, auto-formats images (WebP/AVIF), and performs automatic face-detection centering (`g_face`) for ID cards.
- **Deletion:** Server-signed destroy requests via `/api/media/delete` protecting private school keys.

### 3. Groq High-Speed AI Engine (Multi-Key Failover Pool)
- **High-Throughput Inference:** Utilizes a round-robin rotation pool across 16 high-speed keys (`gsk_...`) located in [`src/lib/ai/groq-client.ts`](src/lib/ai/groq-client.ts).
- **Zero-Downtime Cascade:** Automatically handles HTTP 429 rate limits and temporary capacity constraints with instant key cooldowns and failover:
  - `openai/gpt-oss-120b`: Primary reasoning model for student narrative summaries and NECTA curriculum planning.
  - `openai/gpt-oss-20b`: Ultra-fast model delivering sub-second responses for interactive Q&A.
  - `qwen/qwen3.8-27b`: Bilingual Kiswahili/English & STEM problem-solving.
- **Interactive Shule Guide:** Accessible at `/dashboard/ai-tools` and integrated with Genkit academic flows.

### 4. Nodemailer / SMTP (School Mail Room)
- **Engine:** Direct SSL transport via Gmail SMTP (`smtp.gmail.com:465`).
- **Templates:** Automated vector-branded HTML and plain-text notifications for fee reminders, payment receipts, attendance alerts, report cards, staff briefings, and timetable updates.
- **Safety Safeguards:** Built-in `EMAIL_TEST_MODE=true` redirection, burst rate capping (200/send, 400/day), and automatic office BCC archiving (`ADMIN_NOTIFICATION_EMAIL`).

---

## Security & Environment Configuration

> [!IMPORTANT]
> **Zero Credentials in Git:** All secrets, private keys, app passwords, and API credentials are kept strictly in server-side environment variables (`.env.local` or Vercel Environment Variables). They are strictly excluded by `.gitignore` and must never be committed to source control.

To run locally:
```bash
cp .env.example .env.local
# Fill in your own Firebase, Cloudinary, Groq, and SMTP credentials
npm install
npm run dev
```

---

## Verification & Smoke Test Suite

To verify system integrity, compile checks, and mock render every single route:

```bash
# TypeScript strict type checking
npm run typecheck

# Full smoke test suite (renders all 16 modules in JSDOM)
npm run demo:smoke

# Email templates and SMTP verification
npm run demo:email

# Firestore seeding script
npm run firebase:seed -- --dry-run
```

---

## Lead Engineering & Authorship

- **David Erick Mwijage** — Co-Founder (Engineering & Architecture), Systems Architect.
- **Clemence W. Ng'unda** — Co-Founder (Product & Business Operations).
- **Altraware Technology Ltd** — Dar es Salaam, Tanzania.
- Website: [https://altra.tanzaniareach.com/](https://altra.tanzaniareach.com/)
- Contact: `altrawaretechnology@gmail.com` · `davidbyanmwijage@gmail.com`
