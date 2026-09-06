# Session S1B — Numbas-Inventar und fachliche Entscheidung (2026-09-01)

Auftrag: Inventar- und Entscheidungsphase von S1B (`docs/streamlining-umbauplan.md`). Beweisen, welche Numbas-/MathJax-Artefakte existieren und ob `w05-e7` ein einzigartiges Lernziel besitzt, das vor einer Entfernung migriert werden muss. Keine Löschung, kein Produktions- oder Content-Change, kein Commit, kein Push in dieser Phase.

Basis: isolierte Worktree `Lifemaxxing-s1b-1998d57` @ `1998d57` (Baseline-Commit). Pyodide, SymPy, NumPy, KaTeX, JSXGraph und MathLive unangetastet.

## Ergebnis in Kürze

- Genau **eine** Numbas-Aufgabe existiert: `w05-e7` (einziger `grader: "numbas"` in allen 230 Wochenaufgaben und 38 kanonischen Definitionen; S0-Graderverteilung bestätigt).
- `w05-e7` ist `active: true`, aber **private-build-only**: Public-Katalog, Public-Build und Open-Core-Export filtern Numbas an vier unabhängigen Stellen fail-closed heraus. Die Numbas/MathJax-Vendorbäume sind per Allowlist nie Teil des Public-Builds.
- Die Numbas-Runtime läuft **nur im Legacy-Shell** (`index.html` → `views.mjs` dynamischer Import). Die Preact-Shell routet `w05-e7` bewusst auf eine Ersatz-Seite (`#/local-activity/w05-e7`), die die drei native bewerteten Ersatz-Aufgaben verlinkt — inkl. E2E-Test.
- **Fachbefund: `w05-e7` enthält keinen einzigen Zahlenwert, Term oder Falltyp, der nicht wort- und zahlengleich in `w05-e1`, `w05-e5` und `w05-e6` existiert.** Das Exam ist eine exakte Komposition dieser drei Aufgaben. Einzigartig ist allein das Prüfungsformat (Sequenz, Teilscore, „Antwort anzeigen“ in einer Runtime) — und genau dieses Format ist durch die bereits gebaute Ersatz-Route abgebildet, die die drei Aufgaben als geführte Kette präsentiert.
- **Empfehlung: Option (a) — ersatzlos retire.** Kein einzigartiges Lernziel, keine unverzichtbare Produktnutzung (Plan-Entscheidung 6 erfüllt: local-only + Legacy-only + inhaltlich redundant). Migration auf einen unterstützten Grader ist nicht nötig; der Term-Teil wäre über `pyodide-sympy` sogar exakter (symbolische Garantie statt numerischem Sampling).

## 1. Vollständige Caller-, Content- und Vendorliste

Beweismethode: erschöpfendes `rg -i numbas|mathjax` über die Worktree @1998d57 (ohne `vendor/`, `build-public/`, `build-next/`, `graphify-out/`), Kreuzprüfung Dateinamen-Suche, Graphify-Query gegen `ki-lernplattform/graphify-out/graph.json` (Bestätigung: einziger Caller-Knoten des Adapters ist `views.mjs`; `export_open_core.mjs` reiht ihn nur in eine Kopierliste ein).

### Runtime-Caller (Legacy-Shell, einzige echte Code-Nutzung)

| Datei | Stelle | Rolle |
|---|---|---|
| `assets/js/core/numbas_adapter.js` | ganze Datei (145 LOC) | GraderAdapter: lädt `assets/numbas/template.html`, `vendor/mathjax4/tex-svg.js`, `vendor/numbas/numbas.js`; mountet `<numbas-exam>`; synced Score via `numbas:event:updateScore/end` mit isTrusted-Gate in ProgressStore; registriert `graders.numbas` |
| `assets/js/ui/views.mjs:694-702` | dynamischer Import + Mount | einziger Aufrufer: `if (exercise.grader === 'numbas' && exercise.active !== false)` → `import('../core/numbas_adapter.js')`, `graders.numbas.mount(...)` |
| `assets/js/ui/views.mjs:789-791` | `numbasAssist()` | Hinweistext zur Numbas-Bewertung |
| `assets/js/core/graders.js:487-489` | Kommentar | Hinweis, dass numbas sich zur Ladezeit selbst registriert (kein statischer Import; nicht im Node-Graph) |
| `assets/css/base.css:218` | `.numbas-mount` | Mount-Container-Style |

### Preact-Shell (bewusster Ersatz, kein Runtime-Verbrauch)

| Datei | Stelle | Rolle |
|---|---|---|
| `assets/js/domain/activity_route.mjs:13-19` | `legacyReplacements['w05-e7']` | Route `#/local-activity/w05-e7`, `replacementDefinitionIds: ['w05-e1','w05-e5','w05-e6']` |
| `assets/js/domain/activity_route.mjs:21-35` | `localOnlyReplacementFor`/`legacyReplacementId`/`routeForDefinition` | leitet `w05-e7` immer auf die Ersatz-Seite um; `supportedNewUiActivityTypes` enthält `numbas-exam` nicht |
| `src/ui/views.tsx:295-302` | `LocalActivity`-View | erklärt das lokale Forschungsartefakt, verlinkt die drei nativen Ersatz-Aufgaben („kein alter Numbas-Score wird übernommen“) |

### Build-/Export-/Validierungswerkzeuge (Filter- und Kopierpfade)

| Datei | Stelle | Wirkung |
|---|---|---|
| `tools/compile_content.mjs:229` | Public-Profil-Assertion | `graderId === 'numbas'` im Public-Bundle → Fehler (fail-closed) |
| `tools/compile_content.mjs:377-381` | Public-Filter | filtert `active!==true \|\| graderId==='numbas' \|\| releaseStatus==='local-only'` |
| `tools/public_content.mjs:44` | Legacy-Index | überspringt `active===false \|\| grader==='numbas'` |
| `tools/public_content.mjs:77-81` | `createPublicLegacyContent` | filtert Numbas/inaktive Aufgaben aus den Wochenaufgaben |
| `tools/validate_content.mjs:80-82, 108-119, 256-259, 489-493` | Validator | `numbas-exam` in KNOWN_TYPES; examFile-Existenzprüfung; Public-Verbot von Numbas; examFile-Verbot bei inaktiver Aufgabe; Skill-Abdeckungs-Zählung ohne Numbas; Public-Wochendatei-Muss |
| `tools/build_public.mjs:30-33, 326-330` | Allowlist + Leak-Scanner | Kommentar „Numbas/MathJax stacks are NOT shipped“; Allowlist enthält Adapter/template/vendor nie; `/numbas-src/`-Pattern im Leak-Scanner |
| `tools/content_policy.mjs:16` | Private-Marker | `/numbas-src/i` gilt als privat |
| `tools/export_open_core.mjs:33` | Open-Core-Kopierliste | enthält `assets/js/core/numbas_adapter.js` als Datei (im Export selbst ohne Numbas-Content) |
| `tools/build_coverage_matrix.mjs:29, 63` | Coverage | ersetzt „numbas“-Locator-Text; `publicEligible = active && graderId!=='numbas' && releaseStatus!=='local-only'` |
| `tools/vendor_fetch.sh:88-94` | Vendoring | lädt Numbas-v10.0-Quellzip nach `vendor/numbas-src/` (die Bäume `vendor/numbas/` und `vendor/mathjax4/` entstehen daraus manuell über den Numbas-Compiler, vgl. ADR-0002 „Getesteter Integrationsweg“) |
| `tools/build_numbas_template.py` | ganze Datei (155 LOC) | erzeugt `assets/numbas/template.html` aus `vendor/numbas/index.html`; härtet MathJax-Startup (L1/L2/L5) und deutsche Icon-Keys (L5b) |

### Content

| Datei | Stelle | Inhalt |
|---|---|---|
| `content/exercises/w05.json` | `w05-e7` (~45 Zeilen) | einzige Numbas-Aufgabe; `active: true`; verweist auf die beiden Exam-Dateien |
| `content/exercises/w05-e7.exam` | 203 LOC (generiert) | strict-JSON-Runtimeformat (L4-Fix) |
| `content/exercises/w05-e7.source.exam` | 113 LOC (Quelle) | 2 Fragen / 4 Teile, je 1 Punkt (Inhalt siehe Abschnitt 3) |
| `content/curriculum.json:728` | Locator-Text | „w05-e1..w05-e13 (aktiv; e7 wieder aktiv nach Numbas-Fix)“ |
| `content/tools/core.json:104-107` | Tool-Karte | `t-numbas-local-research` „Lokales Numbas-Prüfungsartefakt“ |
| `schemas/exercise-definition.schema.json:26, 28` | Enums | `numbas-exam` (activityType), `numbas` (graderId) |

### Spikes und Exams

- `spikes/numbas-spike.html` (829 LOC, generiert), `spikes/build_numbas_spike.py` (108 LOC), `spikes/data/w05-spike.exam` (80 LOC) — Einbettungsspike gegen `vendor/numbas/index.html` + `vendor/mathjax4/tex-svg.js`.

### Vendor

| Baum | Größe | Dateien | Inhalt |
|---|---|---|---|
| `vendor/numbas/` | 3.096 KB | 15 | generische Runtime v10.0 (numbas.js/css, Manifest, Ressourcen, standalone_scripts/numbas-mathjax.js) |
| `vendor/numbas-src/` | 9.928 KB | 356 | Numbas-v10.0-Quellzip (Compiler, Themes, Tests, `bin/numbas.py`) |
| `vendor/mathjax4/` | 6.672 KB | 61 | tex-svg-Bundle inkl. vollständigem `sre/`-Baum (L3) |
| **Summe** | **19.696 KB (~19,2 MiB)** | **432** | nur von Numbas-Pfad genutzt; keine andere Runtime liest daraus (KaTeX/MathLive/JSXGraph/Pyodide haben eigene Bäume) |

### Notices und Lizenzregister

- `vendor/licenses/THIRD_PARTY_NOTICES.json` (4.353 Bytes) enthält **keinen** Numbas-/MathJax-Eintrag (notwendig, da nicht public ausgeliefert) → keine Notice-Löschung nötig.
- `content/sources.json` hat keinen numbas-Eintrag; nur die Handtabelle in `docs/license-register.md` (Software-Runtimes-Zeile, „Numbas bleibt private-build-only“) und `docs/dependency-matrix.md` (Produktiv-Zeile „Numbas Runtime v10.0, Apache-2.0“) erwähnen ihn.
- `docs/baseline-manifest.json:42, 129-131`: diffCheck-Begründung und 3 `numbas-icon.png`-Pfade in `requiredWorkspaceIgnoreOverrides`.

### Tests

| Datei | Numbas-Bezug |
|---|---|
| `tests/char_group_c_linalg.test.mjs:417-420` | §9: `localOnlyReplacementFor('w05-e7')` routet auf die drei öffentlichen Ersatz-Definitionen (1 Node-Test) |
| `tests/char_group_d_registry.test.mjs:271-272, 393-394` | releaseStatus `local-only` für numbas-Grader; Adapter nicht im Node-Graph |
| `tests/content_compiler.test.mjs:39, 95-101` | Public-Bundle ohne numbas; localOnly-Zählung dynamisch aus Katalog |
| `tests/public_content.test.mjs:33, 79-87` | `isPublicTask`-Filter; „filters Numbas/inactive tasks across the full corpus“ |
| `tests/coverage_matrix.test.mjs:40-44` | `treeHasNumbas`-Bedingung für local-supplement-Flags |
| `tests/char_group_e_coverage.test.mjs:221-241` | `contains-local-only-activity`-Flags existieren genau dann, wenn `treeHasNumbas` |
| `tests/verify_session_b_coverage_retention.test.mjs:40-46, 299` | `treeShipsNumbas()`-Fixture-Erkennung |
| `tests/verify_content_delivery.test.mjs:222-234` | ausgeschlossener Satz = numbas/local-only; Public-Bundle frei davon |
| `tests/legacy_ui_migration.test.mjs:25, 32-33` | Legacy-Projektion ohne numbas |
| `tests/open_core_export.test.mjs:71, 87-88` | Adapter in Open-Core-Kopierliste; w05.json im Export ohne numbas |
| `tests/helpers/content_counts.mjs:29-31` | erwartete Zähler filtern numbas heraus |
| `tests/e2e/next-shell.spec.ts:156-163` | Playwright: Local-Activity-Route erklärt und verlinkt 3 native Ersatzaufgaben (`w05-e[156]`), „kein Numbas-Score wird übernommen“ |
| CDP-Treiber `tools/acceptance_cdp.mjs`, `tools/acceptance_w01_cdp.mjs` | **keine** Numbas-Assertions (nur w05-e1/e3-Flows) |

### Dokumentation

`docs/adr/0002-grader-stack.md` (12 Nennungen; Entscheidungs- und Reaktivierungshistorie), `docs/adr/0001`/`0004`/`0016` (je Erwähnung), `docs/authoring-guide.md:7, 51-54, 84`, `README.md:54, 61, 88`, `docs/dependency-matrix.md`, `docs/license-register.md`, `docs/baseline-manifest.json`, `docs/session-2026-09-01-s0-baseline.md`, `docs/streamlining-umbauplan.md` (historisch).

**Außerhalb des Repos:** `research/numbas-diagnose/` (FINDINGS.md, human-test, logs, probes, progress.md) liegt im Vault unter `Lifemaxxing/research/`, ist unversioniert und im Baseline-Commit nicht enthalten. Es ist das Belasdokument für L1–L5b. Nicht Teil einer Git-Löschung;Separatentscheidung Noa.

**Keine Numbas-/MathJax-Referenzen** in: `index.html`, `next.html`, `app.mjs`, `exercise_runtime.js`, allen anderen core/domain/runtime-Modulen, `content/sources.json`, CDP-Treffern, Notices.

## 2. Status von `w05-e7` je Profil

| Profil | Status | Beleg |
|---|---|---|
| Root (`content/exercises/w05.json`) | vorhanden, `active: true`, `grader: "numbas"`, `validationStatus: browser-verified 2026-08-25`, `testedSeedCount: 1`, 20 Min., Schwierigkeit 2, Skills `c-linalg-matrices`, `c-linalg-gauss`, `c-algebra` | w05.json:411-453 |
| Local (`compile_content --profile local-private`) | enthalten (268. Definition); Adapter-Mapping: `definitionId='w05-e7'`, `graderId='numbas'`, `releaseStatus='local-only'`, `masteryEligible: true` | legacy_exercise_adapter.mjs:47, 53, 72-74 |
| Public (`--profile public` / `build-public/` / Open-Core) | **nicht enthalten** (267. Definition entfällt genau e7); vier unabhängige Filter: Compiler-Assertion + Compiler-Filter, `createPublicLegacyContent`, Validator-Public-Verbot, Build-Allowlist (vendor/adapter/template nie geliefert) | compile_content.mjs:229/379, public_content.mjs:44/79, validate_content.mjs:113, build_public.mjs:31 |
| Legacy-Shell lokal | mounted die echte Numbas-Prüfung (`#/exercise/w05-e7`) | views.mjs:694-702 |
| Preact-Shell lokal | zeigt Ersatz-Seite, **mounted Numbas nie** (Typ nicht in `supportedNewUiActivityTypes`; Umleitung über `routeForDefinition`) | activity_route.mjs:13-35, views.tsx:301 |

## 3. Fachlicher Vergleich des Lernziels mit allen Ersatzaufgaben

Inhalt von `w05-e7.source.exam` (2 Fragen, 4 Teile à 1 Punkt, `percentpass: 50`, „Antwort anzeigen“ erlaubt):

| e7-Teil | Aufgabe | Identische existierende Aufgabe | Vergleich |
|---|---|---|---|
| 1a | Eintrag $c_{12}$ von $C=AB$ mit $A=\begin{pmatrix}2&1\\1&3\end{pmatrix}$, $B=\begin{pmatrix}0&1\\2&-1\end{pmatrix}$ | **w05-e1** (deterministic, `matmulEntry`, Seed 511) | **zahlengleich** (identische Matrizen, identischer Eintrag, identische Lösung 1, identische MML-Referenz §2.2) |
| 1b | Vereinfache $(x+3)(x-2)$ | **w05-e5** (pyodide-sympy, Seed 555) | **termgleich**; e5 prüft exakt symbolisch, e7 nur per numerischem JME-Sampling (absdiff, `vsetrangepoints 10`) — e5 ist die **stärkere** Garantie |
| 2a | $x$ des Systems $2x+y=5$, $x-3y=-8$ | **w05-e6** (deterministic, `solveLinear2`, Seed 566, Lösung (1,3)) | **systemgleich**; e6 verlangt das komplette Paar statt nur $x$ — e6 ist die **höhere** Anforderung |
| 2b | $y$ desselben Systems | w05-e6 (siehe 2a) | in e6 integriert |

Weitere Abdeckung der drei e7-Kompetenzen in W05 (alle public): `c-linalg-matrices`: e1, e2, e12 (+ e8, e14, e15, e16 als Python-/Parsons-/Trace-Varianten); `c-linalg-gauss`: e6, e10, e11; `c-algebra`: e5. Übungsvarianten mit anderen Zahlen: e10 (Rang), e11 (zweites LGS), e12 (anderer Matrizeneintrag), e13 (zweites Skalarprodukt).

**Was e7 über die Einzelaufgaben hinaus bietet, ist ausschließlich Format, nicht Lernziel:** Sequenzierung dreier Aufgaben, Teilscore (0–4), „Antwort anzeigen“ je Teil. Genau dieses Format ist bereits ohne Numbas realisiert: die Preact-Route `#/local-activity/w05-e7` präsentiert die drei native bewerteten Aufgaben als geführte Kette (inkl. fehlgeschlagenem Score-Transfer-Hinweis), durch einen Playwright-Test abgesichert. Teil-Scores/Hinweise/Lösungsoffenlegung bieten e1/e5/e6 über hints, feedbackRules und fullSolution-Vertrag der Plattform.

**Fazit:** Kein einzigartiges Lernziel, keine einzigartige Zahleninstanz, kein einzigartiger Falltyp. ADR-0002 (Nachtrag 2026-08-24) hatte dieselbe Abdeckungsbegründung bereits für die spätere revidierte Deaktivierung notiert; sie bleibt nach Reaktivierung wahr, weil die Reaktivierung nur die **Runtime-Fähigkeit** wiederherstellte, nicht neuen Fachinhalt ergänzte.

## 4. Empfehlung

**Option (a) — ersatzlos retire.** Begründung:

1. Kein einzigartiges Lernziel (Abschnitt 3) — Plan-Regel „einzigartiger didaktischer Gehalt muss extrahiert oder bewusst verworfen werden“ ist damit entscheidbar: nichts zu extrahieren, bewusster Verzicht nur auf ein Runtime-Format.
2. Local-only und Legacy-only: Public-Build erhält Numbas nie; die einzige laufende Nutzungsfläche ist der Legacy-Shell, der laut Plan (S2B) ohnehin entfällt. Die Preact-Zielarchitektur hat den Ersatz bereits gebaut und getestet.
3. Plan-Entscheidung 6 („entfernen, wenn local-only, inaktiv oder ohne unverzichtbare Produktnutzung“) ist dreifach erfüllt.
4. Wartungsrisiko entfällt: 19,2 MiB Vendor inkl. zweier gepatchter Upstream-Defekte (MathJax-Startup L1/L2/L5, Locale-Icons L5b), die bei jedem Numbas/MathJax-Versionsprung neu zu prüfen wären.
5. Option (b) (Migration vor Löschung) ist nicht nötig, weil kein Inhalt wegfällt; Option (c) (Numbas behalten) wäre nur zu rechtfertigen, wenn das Format „mehrteilige Teilscore-Prüfung“ selbst als Produktwert gewollt ist — das wäre ein ExerciseFamily-Merkmal (S4C), kein Grund, eine zweite Grader-Runtime zu pflegen.

**Vorsatz zur Freigabe an Noa:** Bei Bestätigung von (a) empfehle ich Variante **a1** (Ersatz-Route mit entfernen, siehe Löschliste), da die Local-Activity-Seite nur existiert, um das Numbas-Artefakt zu erklären. Alternative a2 (Route als neutrale „geführte Woche-5-Sequenz“ ohne Numbas-Bezug umtexten) wäre möglich, hält aber eine Erklärschicht am Leben, die ohne Objekt keinen Nutzerwert hat.

## 5. Falls doch Migration gewünscht: kleinster fachlich gleichwertiger Ersatzvertrag

Nur falls Noa das Sequenzformat als EINE Aufgabe erhalten will (nicht empfohlen in S1B; natürlicher Ort wäre S4C ExerciseFamily):

- `activityType: multi-part-deterministic`, 4 Teile: (1) $c_{12}$ integer exakt (`deterministic`, Referenzsolver `matmulEntry`), (2) $(x+3)(x-2)$ als Ausdruck (`pyodide-sympy`, exakt — ersetzt das schwächere JME-Sampling), (3) $x$ integer exakt, (4) $y$ integer exakt (Referenzsolver `solveLinear2`).
- Teilscore 0–4, Bestehgrenze 50 % wie heute (`percentpass: 50`), „Antwort anzeigen“ je Teil mit Lösungsdisqualifikation wie im bestehenden Hints-/Reveal-Vertrag.
- Score-Sync über den normalen Attempt-Pfad (kein Sonderadapter, kein isTrusted-Sondergate).
- Alle Bausteine (Solver, Sympy-Grader, Reveal-Logik) existieren bereits; neu wäre allein der mehrteilige Aufgaben- und UI-Vertrag. Vor S4C wäre der Aufwand nicht gerechtfertigt, weil die Local-Activity-Kette das Nutzerergebnis bereits liefert.

## 6. Exakte vorgeschlagene Löschliste (bei Freigabe a1)

**Ganze Dateien/Verzeichnisse (git-tracked):**

1. `assets/js/core/numbas_adapter.js`
2. `assets/numbas/` (template.html)
3. `tools/build_numbas_template.py`
4. `spikes/build_numbas_spike.py`
5. `spikes/numbas-spike.html`
6. `spikes/data/w05-spike.exam`
7. `content/exercises/w05-e7.exam`
8. `content/exercises/w05-e7.source.exam`
9. `vendor/numbas/` (15 Dateien)
10. `vendor/numbas-src/` (356 Dateien)
11. `vendor/mathjax4/` (61 Dateien)

**Inhaltliche Löschungen innerhalb von Dateien:**

12. `content/exercises/w05.json`: `w05-e7`-Objekt (w05 hat danach 15 Aufgaben; Wochen-Gesamtzahl 230→229)
13. `content/tools/core.json`: Tool-Karte `t-numbas-local-research`
14. `assets/js/ui/views.mjs:694-702, 789-791` (Mount-Block + `numbasAssist`)
15. `assets/js/domain/activity_route.mjs:13-27` (legacyReplacements + beide Lookup-Funktionen; `routeForDefinition` vereinfachen) — bei a2 stattdessen neutral umtexten
16. `src/ui/views.tsx:295-302` (LocalActivity-View) + zugehöriger Router-Zweig — bei a2 umtexten
17. `assets/js/core/graders.js:487-489` (Kommentar)
18. `assets/js/core/legacy_exercise_adapter.mjs:72-74` (releaseStatus-Zweig auf `browser-verified/draft` reduzieren)
19. `assets/css/base.css:218` (`.numbas-mount`)
20. `schemas/exercise-definition.schema.json:26,28` (`numbas-exam`, `numbas` aus den Enums)
21. `tools/validate_content.mjs:81, 108-119, 256-259(Filterbedingung), 490-491` (Numbas-Blöcke; KNOWN_TYPES ohne `numbas-exam` bleibt fail-closed gegen neue Numbas-Content)
22. `tools/compile_content.mjs:229, 379` (`graderId === 'numbas'`-Terme aus Assertion/Filter)
23. `tools/public_content.mjs:44, 79` (numbas-Terme aus beiden Filtern)
24. `tools/content_policy.mjs:16` (`/numbas-src/`-Pattern)
25. `tools/build_public.mjs:31-33, 328` (Kommentar + Pattern)
26. `tools/export_open_core.mjs:33` (Adapter aus Kopierliste)
27. `tools/vendor_fetch.sh:88-94` (Numbas-Block)
28. `tools/build_coverage_matrix.mjs:29, 63` (numbas-Terme)
29. `content/curriculum.json:728` (Locator-Text anpassen)

**Teständerungen (anpassen/entfernen):** `char_group_c_linalg.test.mjs` §9 entfernen; `char_group_d_registry.test.mjs:271-272` Assertion anpassen; `content_compiler`, `public_content`, `coverage_matrix`, `char_group_e_coverage`, `verify_session_b`, `verify_content_delivery`, `legacy_ui_migration`, `open_core_export`, `helpers/content_counts`: numbas-Filterzweige entfernen (Zähler bleiben dynamisch); `tests/e2e/next-shell.spec.ts:156-163` entfernen (bei a2: umtexten auf neutrale Sequenz-Route).

**Dokumentation:** `docs/dependency-matrix.md` (Numbas-Zeile), `docs/license-register.md` (Software-Runtimes-Zeile), `docs/adr/0002-grader-stack.md` (Abschlussnachtrag), `docs/authoring-guide.md` (2 Stellen), `README.md` (3 Stellen), `docs/baseline-manifest.json` (3 Icon-Pfade + diffCheck-Grund), ADR-0001/0004/0016-Erwähnungen. `docs/streamlining-umbauplan.md` bleibt historisch.

**Nicht per Git gelöscht (Separatentscheidung Noa):** `research/numbas-diagnose/` im Vault (unversioniert); build-next/build-public-Anteile regenerieren sich.

**IndexedDB-Hinweis:** vorhandene v3-Attempts auf `w05-e7` (u. a. Abnahme-Versuch Score 1/4 vom 2026-08-25) bleiben gespeichert und exportierbar; nach Definitions-Entfall erzeugen sie keine Evidence/Reviews mehr (Identität `w05-e7:…` wird im Katalog nicht mehr aufgelöst). Vertrag „v3-Attempts nicht still verwerfen“ bleibt eingehalten (keine Datenlöschung, nur kein Konsum). Optionaler Alias-Mapping ist nicht nötig, da e7 nie Mastery im Public-Kontext gab.

## 7. Zentrale Integrationsdateien (beim Orchestrator zu halten)

`tools/compile_content.mjs`, `tools/public_content.mjs`, `tools/validate_content.mjs`, `tools/build_public.mjs`, `tools/export_open_core.mjs`, `tools/vendor_fetch.sh`, `schemas/exercise-definition.schema.json`, `content/exercises/w05.json`, `content/curriculum.json`, `content/tools/core.json`, `assets/js/core/graders.js`, `assets/js/core/legacy_exercise_adapter.mjs`, `assets/js/domain/activity_route.mjs`, `src/ui/views.tsx` (Router), `package.json` (unverändert), `docs/baseline-manifest.json`.

## 8. Betroffene Fast- und Full-Gates

**Fast Gate (nach Änderung, vor Full):**

- `node --test tests/char_group_c_linalg.test.mjs tests/char_group_d_registry.test.mjs tests/content_compiler.test.mjs tests/public_content.test.mjs tests/coverage_matrix.test.mjs tests/char_group_e_coverage.test.mjs tests/verify_content_delivery.test.mjs tests/verify_session_b_coverage_retention.test.mjs tests/legacy_ui_migration.test.mjs tests/open_core_export.test.mjs`
- `node tools/compile_content.mjs --profile public` und `--profile local-private` (erwartet: public 267 wie gehabt, local 268→267)
- `node tools/validate_content.mjs` und `--legacy`
- `npm run coverage:check` (Coverage-Matrix verliert „contains-local-only-activity“-Flags)

**Full Gate:**

- `node --test tests/` (887 → 886 gelistete Tests; 1 Test entfällt)
- `npm run test:project-runner`, `npm run typecheck` (inkl. pre-hooks content:compile + coverage:check)
- `npm run build:release`, `npm run test:e2e`, `npm run test:e2e:build` (next-shell um 1 Test kleiner; Flake A/C aus S0 bleiben unberührt)
- `node tools/build_public.mjs` + `node tools/validate_content.mjs --dir build-public` (358 Dateien unverändert erwartet — Numbas war nie enthalten)
- Open-Core-Export über die Node-Suite (`open_core_export.test.mjs`)
- Browserlauf über HTTP (`acceptance_cdp.mjs`, `acceptance_w01_cdp.mjs`): keine Numbas-Assertions, Lauf zur Regressionssicherung
- `git diff --check`

## 9. Erwartete Reduktion

| Position | Reduktion |
|---|---|
| Ganze Dateien | 2.443 LOC (davon 1.842 generiert: template.html 810, numbas-spike.html 829, e7.exam 203; handgeschrieben: adapter 145, build_numbas_template.py 155, build_numbas_spike.py 108, w05-spike.exam 80, e7.source.exam 113) |
| Content-Teile | ~57 LOC (w05-e7-JSON ~45, Tool-Karte ~12) |
| Verteilter Code/Tools | ~110 LOC (views.mjs, activity_route, views.tsx, Adapter-Zweig, Schema, 6 Tools, CSS, Curriculum-Text) |
| Tests | ~75 LOC Anpassung/Entfall; 1 Node-Test + 1 Playwright-Test entfallen |
| **Netto gesamt** | **~2.650–2.700 LOC** (davon ~770 handgeschrieben) |
| **Vendor** | **−19,2 MiB / −432 Dateien** (numbas 15, numbas-src 356, mathjax4 61) |
| Public-Build | 0 Änderung (358 Dateien — Numbas/MathJax waren nie enthalten); lokale Builds laden die Runtime nicht mehr |
| Content-Zähler | Wochenaufgaben 230→229; lokale Definitionen 268→267; öffentliche 267 unverändert; Graderverteilung künftig 133 deterministic / 92 pyodide / 2 pyodide-sympy / 2 manual-rubric |
| Bundle | Initialer Entry unverändert (Adapter war dynamischer Import im Legacy-Shell) |

## Open / nächste Schritte

- Noas Freigabeentscheidung: (a1) ersatzlos retire inkl. Ersatz-Route — empfohlen; (a2) retire mit neutral umgetexteter Sequenz-Route; (b) Migration auf unterstützten Grader vor Löschung (nicht erforderlich, Vertrag siehe Abschnitt 5); (c) Numbas behalten.
- Nach Freigabe: separate Ausführungssession mit shrink-complexity, betroffenen Tests zuerst, Full Gate am Checkpoint; Löschung exakt nach Abschnitt 6.
- `research/numbas-diagnose/` (Vault, unversioniert): Verbleib separat entscheiden; ADR-0002-Verweise darauf werden mit dem Abschlussnachtrag konsolidiert.
- Staler Kommentar `build_public.mjs:32` („w05-e7 is a deactivated research artifact“) ist schon heute ungenau (e7 aktiv, private-only) und wird mit der Löschung ohnehin entfernt.

## Session-Regeln eingehalten

- Kein Produktionscode, kein Lerninhalt, kein Test, kein Vendor-Pfad geändert; kein Commit, kein Push.
- Pyodide, SymPy, NumPy, KaTeX, JSXGraph, MathLive nicht angetastet.
- Einziger Schreibzugriff: dieser Digest.

---

# Ausführung nach Freigabe a1 (2026-09-01, zweite Phase derselben Session)

Noa hat Variante **a1** (ersatzlos retire inkl. Local-Activity-Ersatzroute) freigegeben. Ausgeführt ausschließlich in der Worktree `Lifemaxxing-s1b-1998d57`; kein Commit, kein Push (Commit-Freigabe steht aus).

## Durchgeführt

1. Vorbereitung laut Plan: `shrink-complexity full` geladen (Ladder-Rung 1: löschen statt vereinfachen), `affected-test-runner` und `fast-then-full` gelesen, `npm ci` (0 Abweichungen zum Lockfile).
2. **11 ganze Pfade gelöscht** (Abschnitt 6 Nr. 1–11): Adapter, `assets/numbas/`, Template-Generator, 3 Spike-Dateien, 2 Exam-Dateien, `vendor/numbas/`, `vendor/numbas-src/`, `vendor/mathjax4/`.
3. **39 Dateien angepasst**: w05.json (e7-Objekt, 15 Aufgaben), curriculum.json (Locator **und** als Listenergänzung die `exercises[]`-Wochenliste, die in Abschnitt 6 fehlte), Tool-Karte, Legacy-Views, `activity_route.mjs` (Replacement-Mechanik komplett), Preact `views.tsx`/`App.tsx` (LocalActivityView + Route), Grader-Kommentar, Adapter-`releaseStatus`-Zweig, CSS, 2 Schema-Enums, 6 Tools (validate/compile/public_content/content_policy/build_public/export_open_core/vendor_fetch/build_coverage_matrix), 13 Testdateien, 5 Dokumente + ADR-0002-Abschlussnachtrag.
4. **Generierte Artefakte regeneriert**: `tools/migrate_legacy_content.mjs` (2× — nach w05.json- und curriculum-Änderung), `tools/build_coverage_matrix.mjs` (46/39; `contains-local-only-activity`-Flags entfallen).
5. Vertrags-Umstellungen in Tests: local-only-Erwartungen von „existiert genau bei Numbas" auf harte Nullverträge umgestellt (`coverage_matrix`, `char_group_e`, `verify_session_b`, `verify_content_delivery`) — schützen jetzt dauerhaft gegen neue local-only-Aufgaben.

## Gate-Ergebnisse (alle grün)

| Prüfung | Ergebnis | S0-Baseline |
|---|---|---|
| Fast-Set (15 betroffene Testdateien) | 131 Pass / 0 Fail / 1 opt-in Skip | — |
| `compile_content --profile public` / `local-private` | 267 / 267 Aufgaben | 267 / 268 |
| `validate_content` (root) + `--legacy` | BESTANDEN (nur 2 bekannte Hinweise) | ✓ |
| `coverage:check` | 46 Kompetenzen, 39 Themen | ✓ |
| `npm run build:release` | 702 Dateien, JS **77,1 KiB gzip**, CSS 6,3 | 702 / 77,5 |
| `node --test tests/` | **883 Tests, 882 Pass, 0 Fail, 1 Skip, 12,8 s** | 887 / 886 / 1 |
| `npm run test:project-runner` | OK (20 Tests) | ✓ |
| `npm run typecheck` | OK | ✓ |
| `npm run test:e2e` (Dev, 3 Browser) | **96 Pass / 81 Skip / 0 Fail** (177 gelistete) | 100/83/0 (Flake A/B heute nicht aufgetreten) |
| `npm run test:e2e:build` (Chromium/Preview) | **42 Pass / 17 Skip / 0 Fail** (59 gelistete) | 43/17/1 (Abweichung C heute nicht aufgetreten) |
| `build_public.mjs` + `validate --dir build-public` | **358 Dateien / 27,4 MB — identisch zur Baseline**; 0 Numbas-Treffer im Build | 358 / 27,4 MB |
| CDP-Acceptance (`acceptance_cdp`, `acceptance_w01_cdp`) | beide OK (Worktree-Server 127.0.0.1:8771) | ✓ |
| `npm audit` / `git diff --check` | 0 Vulnerabilities / sauber | ✓ |

## Gemessene Reduktion (git, gegen 1998d57)

- **440 Dateien gelöscht, 39 geändert, +74/−277.132 Zeilen** (Vendor entpackt den Löschblock; handgeschriebene Reduktion wie in Abschnitt 9 prognostiziert ~2.650–2.700 Zeilen inkl. generierter 1.842).
- Vendor: −19,2 MiB / −432 Dateien. Public-Build unverändert (358). Initial-Entry 77,5 → 77,1 KiB gzip.
- Content-Zähler: Wochenaufgaben 230→229, lokale Definitionen 268→267, öffentliche 267 unverändert; Node-Tests 887→883 (2 Tests entfernt, 2 in Zähl-/Subteststruktur aufgegangen — 0 Fail).

## Abweichungen und Umgebungshinweise

1. **Listenergänzungen zu Abschnitt 6** (bei Ausführung entdeckt): `content/curriculum.json` referenzierte `w05-e7` auch in der Wochen-`exercises[]`-Liste (Validator-Fehler „referenziert unbekannte Aufgabe"); `content/legacy/exercise-competency-map.json` und `content/coverage-matrix.json` mussten regeneriert werden.
2. **Präexistierender Baseline-Lückenschluss:** `tools/pyodide_contract_matrix.mjs` wird von `export_open_core.mjs` und `open_core_export.test.mjs` referenziert, war im Haupt-Checkout aber unversioniert (Sep 1, 00:44) und fehlte daher im Baseline-Commit 1998d57. Datei unverändert in die Worktree kopiert; **sie muss in den S1B-Commit aufgenommen werden**, sonst ist der Export in jeder sauberen Checkout wieder rot. Kein S1B-Fehler, aber ein gefundener Baseline-Defekt.
3. **Worktree-Umgebung:** `library/` und `library-private/` als Symlinks auf den Haupt-Checkout gelegt (ignoriert, dokumentierter Weg), sonst scheitert die w01-Lektionspfadprüfung. Ports 8765/8970 weiter durch die alten fremden Listener belegt (unberührt) — Acceptance lief auf 8771.
4. `docs/baseline-manifest.json` bewusst unverändert gelassen (historische S0-Messung; die 3 `numbas-icon.png`-Ignore-Pfade beschreiben den S0-Zustand).
5. `research/numbas-diagnose/` (Vault, unversioniert) weiterhin unberührt — Separatentscheidung Noa.

## Offen

- **Commit-Freigabe** für den Gesamtdiff (440 D / 39 M / +74/−277.132 inkl. `pyodide_contract_matrix.mjs` als Lückenschluss) — kein Commit ohne Noas Bestätigung. Kein Push.
- Graphify-Graph ist jetzt stale (größerer Löschdiff); Aktualisierung nur vor der nächsten graphabhängigen Analyse mit Freigabe.
- S0-Flakes A/B und Abweichung C blieben heute aus; keine Aussage über ihre Ursache.

---

# Korrekturnachtrag (2026-09-02, I0-Integration)

Dieser Nachtrag korrigiert vier Behauptungen des Berichts gegen die Git- und Gate-Realität. Der Originaltext bleibt unverändert; er ist Zeitzeugenbericht der S1B-Session.

1. **Commit-Status.** Der S1B-Gesamtdiff wurde am 2026-09-01 als Commit `f257b57` („refactor(learning-platform): S1B retire Numbas and MathJax stack") erstellt — entgegen „Commit-Freigabe steht aus". Der Abschnitt „Offen" ist damit gegenstandslos.
2. **Tatsächlicher Pyodide-Dateistatus.** `f257b57` trackt **keine** der fünf Pyodide-Vertragsdateien (`git ls-tree f257b57` auf alle fünf Pfade: leer). Abweichung 2 unten („muss in den S1B-Commit aufgenommen werden") beschreibt einen Handlungsvorsatz, der nicht ausgeführt wurde: die Datei lag nur unversioniert in der S1B-Worktree. Der Lückenschluss gehört stattdessen S0R (Integrationscommit `50254e1`, trackt `tools/pyodide_contract_matrix.mjs`, `tests/pyodide_contract_matrix.test.mjs`, `tests/e2e/pyodide-contracts.spec.ts` mit gezielten Ignore-Negationen).
3. **Tatsächliche Testzahlen.** Die Gate-Tabelle nannte „883 Tests, 882 Pass, 1 Skip"; der Fast-Gate-Abschnitt gleichzeitig „887 → 886 gelistete Tests". Beides ist inkonsistent. Nachmessung am Integrationsstand (S1B inkl. S1B-Fix, S0R unterlegt): **890 gelistete Node-Tests, 888 Pass, 0 Fail, 2 Skip** (1 opt-in Vorbestand + 1 neuer Receipt-Skip aus S0R), 13,8 s. Die Abweichungen zu S0 (887/886/1) ergeben sich aus S1B-Testentfällen und den S1B-Fix-/S0R-Zugängen.
4. **Evidence-Semantik.** Der IndexedDB-Hinweis in Abschnitt 6 („nach Definitions-Entfall erzeugen sie keine Evidence/Reviews mehr") ist unpräzise. Korrekt: gespeicherte v3-Attempts auf `w05-e7` bleiben gespeichert und exportierbar; bereits gespeicherte Kompetenz-IDs tragen weiterhin die damalige Evidence — nichts wird rückwirkend entwertet. Entfallen ist allein die **Neuerzeugung** ausführbarer Reviews/Evidence-Events, weil die Definition nicht mehr im Katalog aufgelöst wird. Der generische Vertrag für archivierte Reviews (kein toter Link) folgt in der S2A-Integration (Idle-Task Abschnitt 4).

Der S1B-Fix-Commit (Integrationsbranch) hat zusätzlich wiederhergestellt: `/numbas-src/i` als Tombstone-Marker in `tools/content_policy.mjs` und im Source-Scan von `tools/build_public.mjs`, den synthetischen Numbas-Revival-Negativtest `tests/numbas_tombstone.test.mjs`, die drei toten Numbas-Icon-Ausnahmen aus der Projekt-`.gitignore` entfernt und die Local-only-Nullverträge durch den Profilvertrag ersetzt (local-only darf im lokalen Profil bewusst existieren, erreicht aber niemals den Public-Build; bewiesen mit synthetischer Nicht-Numbas-Fixture).
