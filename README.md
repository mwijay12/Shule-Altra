# 🏛️ Shule Altra — The Sovereign Institutional Hub

> **The definitive high-fidelity institutional ecosystem for the modern Tanzanian educational landscape.**

---

## 📑 SECTION 1: PROJECT IDENTITY

### The "Elevator Pitch" (10-Year-Old Version)
Shule Altra is like a magic school diary that lives in the cloud. It helps teachers see who is in class, makes sure parents know if their kids are safe, and uses a super-smart robot brain to grade tests and create ID cards automatically.

### The Developer's Architecture
Shule Altra is a high-density, multi-tenant ERP system built on **Next.js 15 (App Router)** and **Firebase**. It utilizes a "Sovereign Node" architecture where each institution operates within a protected data shard. The system implements an **Optimistic UI pattern** using non-blocking Firebase mutations and leverages **Genkit + Gemini 2.5 Flash** for advanced Vision AI (form scanning) and RAG-augmented academic narrative generation. It is engineered for "Pure Performance" with a flat routing structure to maximize Next.js 15's Turbopack efficiency.

### The Business Solution
Educational institutions in East Africa suffer from "Data Fragmentation"—disconnected Excel sheets, paper registers, and manual financial reconciliation. Shule Altra solves this by providing a **Single Source of Truth** that is strictly compliant with the **Tanzania Personal Data Protection Act (PDPA) 2022**. It automates revenue assurance via ClickPesa integration and aligns every grade with NECTA standards (PSLE, FTNA, CSEE), transitioning schools from manual labor to automated distinction.

*   **Current Version**: `2.0.26 (Academic Season Node)`
*   **Status**: 🟡 **Beta / Active Testing**
*   **Architect**: Davie Mwijage | Altraware Technology
*   **Differentiator**: Unlike generic school systems, Shule Altra is **NECTA-Native**. It doesn't just store grades; it calculates Divisions (I-IV, 0) and Points using official national matrices and integrates directly with Tanzanian payment gateways.

---

## 📸 SECTION 2: LIVE SYSTEM SNAPSHOT

| Component | Status | What It Does | Tech Used |
|-----------|--------|--------------|-----------|
| **Auth Gateway** | ✅ Working | Role-based (Admin/Teacher/Accountant) access control. | Firebase Auth |
| **Student Hub** | ✅ Working | Registration, ID Card generation, and AI Smart Enroll. | Firestore / Genkit |
| **Attendance** | ✅ Working | Real-time register with parent SMS notification sync. | n8n / Beem API |
| **Finance Core** | ✅ Working | Control number generation and forensic ledger tracking. | ClickPesa / Zod |
| **Academics** | ✅ Working | Division I-IV calculation and NECTA point aggregation. | Custom Logic Node |
| **Inventory** | ✅ Working | QR-code property tracking and maintenance logs. | html5-qrcode |
| **Reports** | 🔧 Partial | NECTA Explorer (Mock data active) & AI Content Lab. | Gemini 2.5 Flash |
| **Timetable** | 🔧 Partial | Visual grid rendered; allocation logic in progress. | React State |
| **Logistics** | ✅ Working | Route management for day students & hostel occupancy. | Firestore |

### System Maturity
*   **Fully Working**: Role-based navigation, Student/Staff CRUD, Financial Ledger, Attendance alerts, and Institutional Rebranding.
*   **Partially Working**: AI Exam OCR (Scanning logic exists but requires specific template calibration), Timetable (Static rendering complete; dynamic allocation logic pending).
*   **Planned**: Automated PDF Report Card generation (using `docx`), multi-school automated onboarding.
*   **Abandoned**: Next.js 15 Route Groups `(auth)`/`(dashboard)`. These were tried and removed because they caused parallel route conflicts with root-level pages. The system now uses a **Flat Path Pattern** for maximum stability.

---

## 🏗️ SECTION 3: SYSTEM ARCHITECTURE

### High-Level Flow
```text
[User / Admin] 
      ↓
[Next.js 15 Client (Turbopack)] ←─── [Shadcn UI / Framer Motion]
      ↓                                    ↑
[Auth Guard (Firebase Auth)] ──────────┐   │
      ↓                                │   │
[Business Logic (src/lib)] ◄───────────┼───┘
      ↓                                │
[Firestore DB (Sovereign Shard)] ◄─────┘
      ↓
[Genkit / Gemini AI] ◄──────── [AI Smart Enroll / Progress Narrative]
      ↓
[n8n Webhook / Evolution API] ───────► [Parent WhatsApp / SMS]
```

### Common Action Walkthrough: Smart Enrollment
1.  **User Action**: Administrator uploads a photo of a handwritten registration form.
2.  **AI Invocation**: `StudentsPage` calls `scanStudentRegistration` server action.
3.  **Genkit Processing**: The `photoDataUri` is sent to Gemini 2.5 Flash. The prompt instructs the model to extract "Name, ID, Class, Contact" as a structured JSON object.
4.  **Verification**: The UI displays the extracted data for confirmation.
5.  **Persistence**: `addDocumentNonBlocking` is called. This initiates a Firestore write that immediately updates the local cache (Optimistic UI) and queues the background sync.
6.  **Real-time Update**: The `useCollection` hook detects the new document and adds it to the student table without a page refresh.

---

## 📂 SECTION 4: COMPLETE FILE STRUCTURE

```text
project-root/
├── docs/
│   └── backend.json           # Intermediate Representation of DB schema
├── src/
│   ├── ai/
│   │   ├── flows/             # Genkit AI workflows (OCR, Summaries)
│   │   ├── dev.ts             # AI local development entry
│   │   └── genkit.ts          # Genkit initialization node
│   ├── app/
│   │   ├── dashboard/         # Central Management Hub
│   │   │   ├── academics/     # NECTA grading & assessment
│   │   │   ├── finance/       # ClickPesa & forensic accounting
│   │   │   ├── students/      # Registry & AI Smart Enroll
│   │   │   └── layout.tsx     # Institutional Shell & Auth Guard
│   │   ├── login/             # Sovereign Verification Gateway
│   │   ├── layout.tsx         # Root config (Fonts, Providers)
│   │   └── page.tsx           # High-performance Landing Hub
│   ├── components/
│   │   ├── dashboard/         # Sidebar & Header components
│   │   └── ui/                # Hardened Shadcn/Animation components
│   ├── firebase/
│   │   ├── firestore/         # Real-time data hooks (useCollection)
│   │   ├── index.ts           # Central SDK Barrel file
│   │   └── errors.ts          # Contextual Security Rule error handling
│   ├── hooks/                 # Business logic hooks (useFinance, useSyllabus)
│   ├── lib/
│   │   ├── finance-engine.ts  # ClickPesa logic & atomic reconciliation
│   │   ├── necta-logic.ts     # National Grading Matrix logic
│   │   └── n8n.ts             # Orchestration node dispatch
│   └── globals.css            # CSS Variables & Design Tokens
├── firestore.rules            # Institutional Security Policy
└── package.json               # Pure Performance dependencies
```

---

## ⚙️ SECTION 5: INSTALLATION & SETUP

**Prerequisites**
*   **Node.js**: 20.x or higher ([Download](https://nodejs.org/))
*   **Firebase Account**: Project initialized at [Firebase Console](https://console.firebase.google.com/)
*   **Google AI Key**: Gemini API key from [Google AI Studio](https://aistudio.google.com/)

**Step-by-Step Configuration**

1.  **Clone & Initialize**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file in the root. This is critical for the AI Node and Deployment.
    ```env
    GOOGLE_GENAI_API_KEY=your_gemini_key_here
    NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey": "...", "projectId": "..."}
    ```

3.  **Firebase Config Sync**:
    Ensure `src/firebase/config.ts` matches your project keys exactly.

4.  **Start Local Node**:
    ```bash
    npm run dev
    ```
    *   **Expected Output**: `ready - started server on 0.0.0.0:9002, url: http://localhost:9002`

5.  **Verify Handshake**:
    Navigate to `http://localhost:9002`. You should see the **Institutional Loader** followed by the Landing Page. If the loader spins forever, check your `NEXT_PUBLIC_FIREBASE_CONFIG`.

---

## 📖 SECTION 6: HOW TO USE IT

### Use Case 1: Generating an Institutional Control Number
*   **Action**: Go to Dashboard > Finance > Control No Tab.
*   **Payload**: Select "JUMA KHAMISI", Fee Type: "Tuition", Amount: "500,000".
*   **Result**: The `finance-engine` generates a mock ClickPesa reference `99XXXXXXXXX`, renders a QR code, and triggers an n8n webhook to notify the parent.

### Use Case 2: AI Student Progress Narrative
*   **Action**: Open a Student profile sheet > Academic Tab > Click "Synthesize".
*   **Process**: The system sends raw grades and behavioral points to Gemini.
*   **Output**: "Juma is performing exceptionally in Mathematics (Grade A) but requires remedial focus in Civics. His attendance is optimal at 98.4%."

---

## 🗄️ SECTION 7: DATABASE SCHEMA

### Collection: `schools/{schoolId}/students`
Stores the unified student registry.
*   `id`: string (e.g., "ALT-2026-001") — **Primary Index**
*   `name`: string (Upper Case)
*   `class`: string (e.g., "Standard 7")
*   `type`: "Boarder" | "Day"
*   `balance`: number — **Indexed for financial reporting**
*   `photo`: base64 — Institutional ID photo

### Collection: `schools/{schoolId}/transactions`
Forensic financial records.
*   `controlNumber`: string — Unique ClickPesa reference
*   `status`: "Pending" | "Verified" | "Disputed"
*   `amount`: number
*   `reconciled`: boolean — Used for audit trail logic

---

## 🤖 SECTION 8: AI INTEGRATION DETAILS

### Model: `googleai/gemini-2.5-flash`
We use 2.5 Flash for its extreme speed and low latency, essential for real-time form scanning.

### Core Prompt: `scanStudentRegistrationPrompt`
```text
You are an institutional administrative assistant for Tanzanian schools. 
Extract student data from the provided image.
1. Extract Full Name (Capitalize)
2. Extract ID Number (SXXXX/XXXX format)
3. Identify Gender
Return strictly valid JSON.
```

### Cost Estimate
*   **Input Tokens**: ~500 per scan.
*   **Output Tokens**: ~150 per scan.
*   **Cost**: Negligible on the Google AI free tier (up to 15 RPM). Scaling to Blaze tier costs approx $0.0001 per enrollment.

---

## ⚠️ SECTION 9: CURRENT LIMITATIONS & KNOWN BUGS

1.  **n8n Security**: The Webhook URL is stored in `localStorage` via the Settings page. For production, this must be moved to an encrypted Firebase Config document.
2.  **Search Performance**: Search on the Student Table is currently performed client-side. This will degrade if the student body exceeds 5,000 nodes.
3.  **PDF Spooling**: Report card printing currently uses `window.print()`. The `docx` export is only partially implemented in the Student profile.

---

## 🛠️ SECTION 10: MODIFICATION & ADDON GUIDE

### MOD: Live ClickPesa Integration
*   **Difficulty**: ⭐⭐⭐⭐
*   **Time**: 2 Days
*   **Files**: `src/lib/finance-engine.ts`, `src/app/api/webhooks/clickpesa/route.ts`
*   **Steps**: Replace the `generateInstitutionalControlNumber` simulation with a `fetch` call to the ClickPesa API. Update the webhook handler to verify the signature header.

### MOD: Multi-Language (Swahili) Hub
*   **Difficulty**: ⭐⭐
*   **Time**: 1 Day
*   **Steps**: Create `src/lib/i18n.ts`. Wrap the `DashboardLayout` in a context provider. Map all "font-headline" strings to the Swahili dictionary.

---

## 🚀 SECTION 11: DEPLOYMENT GUIDE

1.  **Build Check**: `npm run build` (Ensures no TypeScript errors).
2.  **Auth Setup**: Enable "Email/Password" and "Anonymous" in Firebase Console.
3.  **Rules Deployment**: Copy `firestore.rules` content into the Firebase Console "Rules" tab.
4.  **Hosting**:
    ```bash
    firebase deploy --only hosting
    ```
5.  **Domain Node**: Configure custom CNAME in Firebase Console. Shule Altra requires SSL (default on Firebase).

---

## 💸 SECTION 12: COST CALCULATOR

| Service | Free Tier (Demo) | Paid Tier (1,000 Users) |
|---------|------------------|-------------------------|
| **Firebase Hosting** | $0 (Up to 10GB) | ~$0.02 / GB |
| **Firestore Read/Write** | 50k Reads / day | ~$0.06 per 100k |
| **Gemini AI** | $0 (Free Tier) | ~$0.10 / day |
| **Beem SMS (n8n)** | N/A | TZS 15 / SMS |

---

## 🗺️ SECTION 13: ROADMAP

### Short Term (2 Weeks)
- [ ] Implement dynamic Timetable period allocation logic.
- [ ] Add "Dormitory Map" visualization to the Hostel Hub.
- [ ] Complete the `docx` Report Card export for PSLE students.

### Medium Term (3 Months)
- [ ] **Live ClickPesa Hook**: Real payments updating student balances.
- [ ] **Biometric Sync**: QR-code based student attendance.

### Long Term (12 Months)
- [ ] **Sovereign Mobile App**: Native Android app for teachers.
- [ ] **National Archive Node**: Benchmarking school performance against national NECTA averages.

---

## 💡 SECTION 14: LESSONS LEARNED

1.  **Next.js 15 Routing**: Flat routing is significantly more predictable than deeply nested route groups when working with complex ERP sidebars.
2.  **Non-Blocking Logic**: User perception of speed is higher when Firestore writes aren't `awaited`. Optimistic UI update + background catch-error is the winning pattern.
3.  **AI Precision**: Gemini 2.5 Flash is excellent at OCR but struggles with Tanzanian cursive handwriting if the image contrast is low. Image preprocessing (CSS filters) before scanning is a future requirement.

---

## ⚡ SECTION 15: QUICK REFERENCE CARD

*   **Start Node**: `npm run dev` (Port 9002)
*   **Admin Access**: `admin@shule.pro` (Standard Hub)
*   **Core DB Path**: `/schools/school-001/`
*   **Role Change**: Update `localStorage.setItem('shule_role', 'TEACHER')` for instant UI filter testing.
*   **AI Dev Hub**: `npm run genkit:dev`

---
**Institutional Authority Verified** | © 2026 Shule Altra Technology Core
