# Showcase script — dakika 15 mbele ya mkuu wa shule

> Lengo la demo sio kuonyesha software nzuri. Ni kumfanya mkuu wa shule
> **ajione anaokoa wiki moja ya kazi** na **akusanye fedha ambazo alikuwa
> anaziacha**. Kila kitu kingine ni mapambo.

---

## 0. Kabla ya kuanza (dakika 5 kabla)

- [ ] Fungua `https://shule-altra-demo.vercel.app` kwenye laptop **au** simu yako, uwe umeingia tayari (usitetee kuingia mbele ya mteja).
- [ ] Nenda **Settings → Demo Data Management → Seed Demo Registry** ili data iwe safi (wanafunzi 150, Form 1–4).
- [ ] Fungua tab tatu: **Dashboard**, **Students**, **Reports**. Ukirudi nyuma ghafla, unaonekana tapeli.
- [ ] Chapisha **report card moja** na **ID card sheet moja** kabla ya mkutano. Karatasi inauzwa kuliko skrini.
- [ ] Weka simu yako kwenye **hotspot**; kama hakuna internet, demo inafanya kazi offline (data iko kwenye browser) — lakini jaribu kwanza.
- [ ] Funga notifications zote. Hakuna WhatsApp inayopita mbele ya mkuu.

**Mtu wa kuzungumza naye:** mkuu wa shule (anakubali), **bursar** (anateseka kila siku), proprietor (analipa). Kama wote wapo, mpe bursar kipaza sauti mara mbili — yeye ndio atakayekuwa mtetezi wako.

---

## 1. Dakika 0–2 — anza na tatizo, sio app

Usifungue laptop bado. Sema hivi:

> “Mkuu, mwisho wa muhula walimu wako wanakaa wiki moja wanaandika report card za wanafunzi 500 kwa mkono. Bursar anatafuta nani hajalipa kwa kuangalia vitabu. Na mzazi wa Form 2 anajua mtoto hakufika shule siku tatu baada ya wiki mbili.
> Nilikuja kuonyesha vitu vitatu tu: **report card**, **orodha ya wanaodaiwa**, na **ujumbe kwa mzazi siku hiyo hiyo**.”

Kisha swali moja: **“Mnahitaji siku ngapi kuandika report card za muhula huu?”** Acha ajibu. Namba atakayosema ndio bei yako.

---

## 2. Dakika 2–4 — Dashboard (namba tatu tu)

Fungua **Dashboard**. Usieleze kila kitu. Gusa vitu vitatu:

| Chochote unachogusa | Sema hivi |
|---|---|
| **Collected vs outstanding** | “Hii ni hesabu ya fedha kwa sekunde — sio kusubiri bursar afanye reconciliation.” |
| **Absence / attendance rate** | “Asilimia ya mahudhurio leo. Kila asubuhi, siku moja.” |
| **Defaulters count** | “Wanafunzi 97 wana deni. Hii ni orodha, sio makisio.” |

**Kanuni:** kila namba unayogusa, iambatanishe na kazi ya mtu. “Hii inamwachia bursar saa ngapi?” Hilo ndilo linalouza.

---

## 3. Dakika 4–7 — Picha + ID card (sehemu ya “wow”)

Hii ni sehemu ambayo shule haijawahi kuona kwenye software ya Kitanzania.

1. **Students** → bofya **Access Hub** kwa mwanafunzi yeyote.
2. Bofya **kitufe cha kamera** kwenye picha → chagua picha yoyote kwenye simu/laptop (mwenyewe, au mtu yeyote aliye karibu).
3. Sema: “Picha inaingia kwenye register mara moja, na itatokea kwenye **ID card**.”
4. Funga sheet, rudi kwenye orodha — picha ipo kwenye mstari wake.
5. Nenda **Reports → Learner ID cards** → bonyeza → PDF inateremka.
6. Fungua PDF na uonyeshe: **picha, jina, QR ya kuthibitisha, crop marks za kukata**.

> “Kadi hizi 12 zilizochapishwa hapa zilitengenezwa kwa sekunde. Shule inayochapisha kadi 500 kwa mkono inalipa printer na mtu wa kuzikata.”

*(Kama una karatasi iliyochapishwa nyumbani, mpe mkuu aisome kwa mkono. Ni bora kuliko slide yoyote.)*

---

## 4. Dakika 7–9 — Fedha na barua kwa mzazi

1. **Finance** → orodha ya wanaodaiwa.
2. Fungua mwanafunzi mmoja → **Fee statement PDF** → onyesha: malipo yote, balance, control number.
3. Nenda **Mail room** → `Fee reminder (guardian)` → **Preview**.
4. Onyesha barua: crest, jina la mzazi, kiasi, tarehe, “Lipa kwa M-Pesa namba hii”.
5. Sema: “Barua hii inaenda kwa wazazi **97** kwa kubonyeza mara moja. Sasa hivi ni dry run — hakuna inayotumwa hadi shule iwe tayari.”

**Usibonyeze Send** mbele ya mteja kama hujaweka credentials. Dry run inaonyesha nia, sio ahadi ya uongo.

---

## 5. Dakika 9–11 — Report card na NECTA analysis

1. **Students → Access Hub → Download report card** (au **Reports → Report cards**).
2. Fungua PDF: **division, points, masomo 9, nafasi darasani, remarks, nafasi ya sahihi ya mkuu**.
3. Sema: “Walimu wanaingiza alama tu. Report card inajitengeneza — kwa kila mwanafunzi, kwa format ambayo wazazi wako wanaijua.”
4. Nenda **Analytics** → onyesha **subject mean** na **division distribution**.
5. Sema: “Hii ni slide unayohitaji kwa mkutano wa wazazi — sasa inajitengeneza yenyewe.”

---

## 6. Dakika 11–13 — Usalama (hapa unashinda duka lingine)

1. Kwenye sidebar, chini: **Sign out** → ingia kama **Teacher**.
2. Onyesha: **Finance haipo**, **Settings haipo**, lakini Students na Attendance zipo.
3. Jaribu kufungua PDF ya fee ledger kwa URL — **onYesha ukurasa wa kukataliwa**: “Hati hii inahitaji role ya Administrator, Accountant au Bursar.”
4. Sema: “Mwalimu haoni mishahara ya wenzake wala deni la mwanafunzi. Kila hati ina role yake — na hii ni sheria iliyowekwa kwenye server, sio kufichwa kwa menu.”

Hii ni sehemu ambayo mkuu anajisikia salama. Wengi wanaogopa “data zangu zinaonekana kwa kila mtu”.

---

## 7. Dakika 13–15 — Bei na hatua inayofuata

Usiombe pesa mwisho. Omba **tarehe**.

> “Hatua yangu ni hii: **siku 30 bure**, kwenye department moja — bursar au Form 4. Nitaleta data zenu (Excel ya wanafunzi) na kuziweka kwenye system kwa siku moja.
> Mwisho wa siku 30, kama bursar hajasema ‘siwezi kurudi nyuma’, tunaendelea kwa muhula. Kama hapasemi hivyo, mnatupa system na hakuna deni.”

Bei (iwe tayari, isijadiliwe kwa muda mrefu):
- **TZS 2,000 kwa mwanafunzi kwa muhula** (shule ya 500 = **TZS 3M kwa mwaka**)
- au **TZS 1,500** kwa shule ndogo (≤300)
- Malipo: muhula kwa muhula, au punguzo la 10% kwa mwaka mzima
- Ongeza: SMS pack, ID cards, boarding — jadili baada ya kusaini, sio kabla

---

## 8. Maswali ambayo watakwambia (na majibu mafupi)

| Swali | Jibu |
|---|---|
| “Je, inafanya kazi bila internet?” | “Dashibodi inahitaji internet; attendance ya darasani inaenda kufanya kazi offline kabla ya shule ya kwanza — ndio kazi inayofuata.” **Usiseme ipo tayari.** |
| “Data zetu ziko wapi? Ni salama?” | “Kwenye cloud iliyolindwa, na sheria za upatikanaji zimewekwa kwa role. Kwa PDPA tunasajiliwa na tunatoa mkataba wa data na shule. Picha za wanafunzi tunachukua tu kwa ridhaa ya mzazi.” |
| “Na WhatsApp?” | “SMS kwanza — inamfikia mzazi asiye na smartphone. WhatsApp ni baada ya hapo.” |
| “Walimu hawajui kompyuta.” | “Attendance ni mibofyo mitatu kwenye simu. Training ni nusu siku, na mwalimu mmoja anakuwa champion.” |
| “Mna uzoefu na shule ngapi?” | Sema ukweli: “Hii ni product mpya. Ndio maana tunatoa siku 30 bure kwenye shule yako — wewe unakuwa mmoja wa waanzilishi, na bei inabaki ile ile maisha.” |
| “Kama mfumo ukivunjika?” | “Backups za kila siku, na mkataba unasema data ni mali ya shule — unaweza kuichukua wakati wowote kwa Excel/PDF.” |
| “Bei ni kubwa.” | “Linganisha na clerk mmoja: TZS 500,000 kwa mwezi. System hii ni TZS 250,000 kwa mwezi kwa shule ya 500 — na inafanya kazi ya clerk wawili.” |

---

## 9. Mambo ya kuepuka

- **Usionyeshe AI** kama haijaimarika — demo ya AI inayokosea mbele ya mkuu inaharibu kila kitu kingine.
- **Usitume email/SMS halisi** kwa wazazi wa demo — utapata bounce, na kama ni Gmail, unaweza kufungiwa.
- **Usiahidi** offline, WhatsApp, au payroll leo.
- **Usiongee dashboard nzuri**; ongea saa na pesa.
- **Usiache mteja abonyeze kitu bila wewe kuwa umejaribu** — simu yake, browser yake, ukubwa wa font tofauti.

---

## 10. Baada ya mkutano (siku hiyo hiyo, kabla ya saa 6 usiku)

Tuma ujumbe mmoja kwa WhatsApp, mfupi:

> “Mkuu, asante kwa muda. Nimabakisha demo ikifanya kazi: [link].
> Kama mnavuti, nitakuja Jumatatu na Excel ya wanafunzi wenu — tutaweka Form 4 kwanza, bure kwa siku 30.
> Namba zangu: [simu].”

Kisha: **weka tarehe ya kuja**, sio “nitakupigia”. Demo isiyo na tarehe ni mazungumzo mazuri tu.
