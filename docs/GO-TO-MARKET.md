# Shule Altra — going to market

Working notes for Altraware Technology. Written against what the software
actually does today, not what we would like it to do.

---

## 1. What we are actually selling

Not "a school system". Every competitor says that, and a head teacher has heard
it from six vendors this year.

**Sell the document.** A school's real pain is the end of term: report cards
typed one by one, a fee ledger that does not reconcile, a defaulters list the
bursar rebuilds in Excel, and a board asking for numbers nobody can produce.

> "Report cards, fee statements and the defaulters register — generated, not
> typed. Every figure comes from the same register."

That is demonstrable in ninety seconds with the demo. Lead with it.

### The three things that close a school

| What they fear | What we show |
| --- | --- |
| "It will lose our data" | Export any time, including during the contract. Their own cloud account. |
| "Staff will see fees who shouldn't" | Sign in as a teacher, try to open the fee ledger, get refused. Live. |
| "We'll be locked in / vendor disappears" | Legal pages published, DPA signed before go-live, a real phone number on every PDF. |

The role refusal is the strongest moment in the demo. Do it on purpose.

---

## 2. Fix before the first paid pitch

These are gaps a serious buyer will find. Being honest about them is fine;
being caught unaware is not.

1. **Audit log.** The security page admits there is no tamper-evident trail.
   A private school board will ask "who changed this fee?". Build an append-only
   `audit` collection: actor, role, action, document, before/after, timestamp.
   This is the single highest-value next feature.
2. **Two-factor enforcement.** Google sign-in supports it; we do not require it.
   Add a per-school "require 2FA for finance roles" switch.
3. **Backups.** Document a restore procedure and *test it once*. "We have backups"
   is worth nothing until a restore has been performed.
4. **Reference school.** One real deployment, even at cost, beats any deck.
   Offer the first school a founding-client rate in exchange for a named
   reference and a quote.
5. **Payment gateway certification.** ClickPesa integrity is tested, but it has
   never run against a live account. Do one end-to-end live transaction before
   promising reconciliation.

Do not claim any of these until they exist. The published security page already
lists them as gaps — keep it that way; it reads as competence, not weakness.

---

## 3. Pricing that works in two markets

The website already publishes TSh 350K / 550K / 750K for websites. Keep that
ladder for the studio. For a **school system**, price per school per term, not
per user — schools cannot forecast staff counts, and per-user pricing punishes
them for adding a teacher.

### Tanzania / East Africa

| Tier | Indicative | For |
| --- | --- | --- |
| Msingi | TSh 450,000 / term | Up to 300 learners. Register, fees, attendance, reports. |
| Shule | TSh 850,000 / term | Up to 800. Adds boarding, transport, canteen, guardian mail. |
| Taasisi | Quoted | Multi-campus, custom modules, on-premise or dedicated cloud. |

Setup and data migration quoted once (typically TSh 300K–800K depending on how
messy the existing Excel is). Charge for it — free migration attracts schools
with unusable data and no budget.

### International

Price in USD, annually, and anchor on the cost of the alternative (a foreign SIS
at $3–8 per student per year):

- **Standard** — $600/year, up to 400 learners
- **Professional** — $1,200/year, up to 1,000, multi-campus, priority support
- **Enterprise** — quoted, source handover, self-hosted, white-label

Always state that cloud/mail/gateway costs are the school's and are itemised.
The terms page already says this.

**Do not convert TSh to USD at the spot rate.** International buyers pay for
support across timezones and a contract in their jurisdiction. Price the work,
not the exchange rate.

---

## 4. International: what is ready and what is not

**Ready now**
- Currency and locale are configurable (`NEXT_PUBLIC_CURRENCY`, `NEXT_PUBLIC_LOCALE`) — KES, UGX, RWF, ZAR, NGN, GHS, USD, EUR, GBP.
- Legal pages cover international governing law and cross-border transfers.
- English throughout; the studio works in Kiswahili and English.
- White-label switch for the PDF credit.

**Not ready — do not promise**
- **The interface is English-only.** There is no i18n layer. If a client needs a
  Kiswahili or French UI, that is a quoted project, not a setting.
- **NECTA grading is Tanzania-specific.** Other markets need their own grading
  schema (KCSE, UACE, Cambridge). Scope it explicitly.
- **No multi-tenant billing.** Each school is a separate deployment today. That
  is fine — sell it as "your own instance, your own data" — but do not claim a
  self-serve SaaS.

The honest positioning: **"a dedicated instance for your school"**, not "sign up
in five minutes". It is also a better security story.

---

## 5. Where to find the first twenty schools

**Local, in order of conversion rate**

1. **Private secondary schools in Dar es Salaam, Coast and Morogoro.** They have
   fee pressure, a board, and a bursar drowning in Excel. Approach the bursar or
   academic master, not the owner first — they feel the pain daily and will
   champion it.
2. **Faith-based and NGO-run schools.** They already produce donor reports;
   the export and audit story lands hard.
3. **School groups (2–5 campuses).** One decision-maker, several deployments.
4. **Avoid** government schools for now: procurement cycles are long and payment
   is uncertain. Revisit after three references.

**Tactics that work here**
- Walk in with a tablet, not a brochure. Ninety-second demo, then leave a
  one-page proposal with a price.
- Demo at the right moment: **end of term**, when report cards are being typed.
  That is when the pain is unbearable.
- Offer a **one-term pilot** with their real data for a fee (never free).
  A paid pilot filters out tyre-kickers and creates commitment.
- Ask every school, at the end: "Which two heads should I speak to?" Referral is
  the cheapest channel in this market.

**International**
- LinkedIn: target `Bursar`, `School Business Manager`, `Head of Operations` at
  international schools in Nairobi, Kampala, Kigali, Accra, Lusaka.
- Diaspora-run schools in East Africa — they have budget and expect vendor
  professionalism, which the legal pages now demonstrate.
- Partner with local IT consultants who already service schools; give them 15%
  recurring. They own the relationship, we own the product.

---

## 6. Social media — what to post

The share card is generated at `/opengraph-image`, so any link posted now carries
a proper 1200×630 preview with the studio name and phone number. That alone
lifts click-through.

### Rules
- **Show the product, not adjectives.** A 20-second screen recording of a report
  card generating outperforms any graphic with the word "innovative" on it.
- **Never invent a client, a number, or a testimonial.** We have none yet. The
  security page says so. One fabricated logo would undo the whole trust story.
- **Post the refusal.** A clip of a teacher being denied the fee ledger is the
  most shareable thing we have, because it is concrete.

### Five posts to run first

**1 — The problem (LinkedIn, Facebook)**
> End of term, a bursar opens six Excel files to answer one question: who owes
> what.
>
> Shule Altra keeps one register. Fees, attendance and results feed the same
> documents the school signs.
>
> Built in Dar es Salaam. Serving schools beyond it.
> [demo link]

**2 — The refusal (X, LinkedIn, 20s video)**
> A teacher signs in and tries to open the fee ledger.
>
> Refused — on the server, not just hidden in the menu.
>
> Role-scoped access, signed sessions that expire after 30 minutes idle.
> Here's the whole flow. [video]

**3 — The document (Instagram, Facebook carousel)**
> Every one of these was generated from the register. None was photographed,
> typed or pasted.
>
> [carousel: report card → fee statement → defaulters register → ID cards]

**4 — The trust page (LinkedIn)**
> We published our security page including what we have *not* built yet:
> no ISO certificate, no third-party pen test, no tamper-evident audit log.
>
> A school deserves to know before it signs, not after.
> [link to /legal/security]

This one will do surprisingly well. Vendors never admit gaps.

**5 — Kiswahili (WhatsApp status, Facebook)**
> Kadi za matokeo. Taarifa za ada. Orodha ya wadaiwa.
>
> Zote zinatoka kwenye rejista moja — hakuna kupiga chapa upya kila muhula.
>
> Altraware Technology · Dar es Salaam · +255 792 867 427

### Cadence
Two posts a week. One product clip, one idea. Reply to every comment within a
day. Send interested schools the demo link plus the one-pager, and follow up by
phone — in this market a call closes, a DM does not.

### Assets ready in the repo
`.preview/trust-shots/` — dashboard, footer credit, the four legal pages, mobile
privacy view, 404, and `og-card.png` (1200×630) for any platform.

---

## 7. What to say when they ask

**"Are you compliant with PDPA?"**
> "The system is built around it — consent-based photographs, role-scoped
> access, a published privacy policy and a data processing agreement you sign
> before go-live. Compliance is a shared duty: you are the controller, we are
> the processor. We do not claim a certificate, because there isn't one to hold."

**"What if you disappear?"**
> "Your data lives in your own cloud account, you can export it any time during
> the contract, and white-label source handover is available. The exit is written
> into the terms."

**"Can we see a school using it?"**
> Until we have one: "Not yet — you would be among the first, which is why we are
> offering a founding-client rate and a paid pilot term." Honesty here converts
> better than a fake logo.

**"Do you work outside Tanzania?"**
> "Yes. Currency and locale are configurable, the contract can specify your
> jurisdiction, and we work in English and Kiswahili. Grading schemas outside
> Tanzania are scoped per client — we will not pretend NECTA maps to KCSE."

---

## 8. The ninety-second demo script

1. **Open the dashboard** (10s) — "150 learners, one register."
2. **Generate a report card** (20s) — "From the register. Not typed."
3. **Open the defaulters register** (15s) — "This is what the bursar rebuilds in
   Excel every term."
4. **Switch to a teacher, try the fee ledger** (20s) — refused. Say nothing;
   let it land.
5. **Change the school name and logo in Theme Studio** (15s) — regenerate the
   PDF, show it rebranded.
6. **Close** (10s) — "Your school, your data, your cloud account. One term pilot,
   then decide."

Step 4 and step 5 are the two that make people lean forward.
