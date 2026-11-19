# Shule Altra mobile: majaribio ya simu na hali ya kukubali

## Build ya prompt 10/10

- Commit ya app na CI: `f84b2cf`.
- [Mobile pilot CI na artifacts](https://github.com/mwijay12/Shule-Altra/actions/runs/44498295926): analyzer, widget/unit tests, jaribio la demo iliyozimwa, na debug/split-ABI APK builds zimepita.
- [Demo CI](https://github.com/mwijay12/Shule-Altra/actions/runs/44498295842): imepita.
- `shule-altra-phone-preview-arm64`: ZIP yenye `shule-altra-arm64-preview.apk`, `shule-altra-arm64-debug.apk`, `SHA256SUMS.txt`, na `BUILD-INFO.txt`. Hii ni kwa kifaa cha Android kinachotumia arm64.
- `shule-altra-prototype-debug-apk`: APK ya debug ya usanifu mbalimbali ikiwa arm64 haifai. Artifacts hupatikana kwa siku 7; GitHub inaweza kuhitaji kuingia kwenye akaunti.

Hizi ni **builds za majaribio**, si uzinduzi wa production. Zimesainiwa na debug key ya muda ya CI, si production key. Android inaweza kukataa update kutoka build nyingine yenye key tofauti; kuhifadhi chochote muhimu kwanza, kisha uninstall/reinstall ikiwa ni lazima. APK za CI hazina Firebase dart-defines za shule.

## Namna ya kujaribu sample kwenye simu

1. Fungua [run ya Mobile pilot](https://github.com/mwijay12/Shule-Altra/actions/runs/44498295926), chagua artifact ya arm64 na download ZIP. Extract faili ya `shule-altra-arm64-preview.apk`. Kama simu si arm64, jaribu universal debug artifact badala yake.
2. Ukipata fursa, linganisha SHA-256 ya APK na `SHA256SUMS.txt`. Pakua kutoka kwenye run inayotarajiwa tu. Install APK kwa ruhusa za Android zinapohitajika.
3. Fungua app → **Skip introduction** → **Explore the sample preview** → **Learners** → **Fill the demo credential** → **Sign in to the demo**. Credential imeonyeshwa ndani ya app; si akaunti ya Firebase ya shule.
4. Jaribu kutafuta `Amina`, fungua maelezo, rudi nyuma, na chagua **Day**. Fungua **View fictional timetable**; badilisha siku. Rudi kwenye Day na weka mark ya mazoezi, kisha badilisha tab na urudi kuthibitisha mark bado ipo.
5. Jaribu kufuta mark: **Clear practice marks** → **Keep marks**, kisha jaribu tena na uthibitishe kufuta. Marks ni za kubuniwa, ziko kwenye memory tu, na hazifiki shuleni.
6. Kwenye **More**, jaribu System/Light/Dark, funga na fungua app uangalie kama uchaguzi umebaki. Jaribu sign-out na kurudi mwanzo. Kagua 320–360dp/390dp kadiri kifaa kinavyoruhusu, maandishi makubwa, keyboard, navigation ya Android, dark/light na TalkBack.
7. Rekodi modeli ya simu, toleo la Android, build/commit, hatua, kilichotarajiwa na kilichotokea. Usitume majina au taarifa nyeti za wanafunzi katika ripoti.

Hatua hizi ni **maelekezo ya kufanya**, si matokeo ya majaribio yaliyokwisha fanyika. Automated widget tests si mbadala wa kutumia simu halisi.

## Njia ya shule halisi: bado inahitaji uthibitisho

- Thibitisha kwanza Firebase project inayotumiwa na web deployment na school ID. Repository ina `.firebaserc` na web fallback project ambazo hutofautiana; `SchoolScope.fallback` kwa sasa ni `school-001`. Usidhanie kuwa zinafanana na deployment ya shule.
- Sajili Android package `com.shulealtra.shule_altra_mobile` na SHA-1/SHA-256 za **key inayosaini build yako ya majaribio** katika project sahihi, na uthibitishe Google provider na web OAuth client. CI key ni ya muda.
- Build kwa public Firebase client identifiers kama ilivyo [README ya mobile](../mobile/shule_altra/README.md#the-live-path). Usitumie service-account keys au secrets kwenye `--dart-define`, repository au chat.
- Kwa ruhusa ya mmiliki, tumia akaunti za majaribio zisizo na taarifa nyeti kuthibitisha sign-in, scope/role/rules, page reads, errors, sign-out/account change na saved timetable; linganisha records zilizoidhinishwa na web. Jaribu akaunti isiyoidhinishwa na kuthibitisha inakataliwa.
- Ukosefu wa Firebase configuration, mtandao au ruhusa **haupaswi** kusababisha fallback ya siri kwenye sample. Home inaonyesha ukurasa uliosomwa tu; si totals za shule nzima. Search na filters pia zinahusu ukurasa uliopakiwa tu.

## Hali ya kazi baada ya batch 10/10

| Eneo | Hali |
| --- | --- |
| Onboarding, blue/white theme, navigation, Home, learners, School Day, settings | Zimetekelezwa kwa kiwango cha pilot na zina automated coverage; muonekano, TalkBack na usability kwenye simu bado havijathibitishwa. |
| Sample preview | Ina data ya kubuniwa na vitendo vinavyofanya kazi; mazoezi hayahifadhiwi kama attendance. Hakuna uthibitisho wa matumizi kwenye kifaa halisi bado. |
| Live register na timetable | Code ni read-only; CI inatumia fake gateways, si Firebase project ya shule. Rules, data parity na Google login bado zinahitaji majaribio ya ruhusa kwenye kifaa. |
| Dashboard ya shule nzima | Haijakamilika. Muhtasari wa Home unaeleza scope ya page; si dashboard aggregation ya web. |
| Offline sync, attendance writes, payments, learner edits | Havijatekelezwa. |
| Release/updates | Production signing, stable update path, installer validation na rollout approval bado havijafanyika. |
| Desktop | Tauri ni kazi ya baadaye; si sehemu ya APK hii. |

Kuhitimisha prompts kumi hakumaanishi vigezo vyote vya [mpango wa hatua kumi](mobile-design-audit-and-10-phase-plan.md) vimefungwa. Kukamilisha app kwa matumizi halisi kunahitaji maamuzi na majaribio yaliyoorodheshwa hapo juu.
