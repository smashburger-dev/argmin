# Challenge-Sektion — Plan v3

## Status (13.09.2026, Fassung v3 — IMPLEMENTIERT)

**Implementierungswelle abgeschlossen.** Gebaut und verifiziert:

- `assets/js/domain/challenge_picker.mjs` — reine Domain-Engine (Tages-Seed
  FNV-1a, Pool, No-Repeat-Fenster, Shortfall, Streak). Bewusst autark: kein
  Import aus `generator_draw_kit.mjs` — die Kante zog den family-core-Chunk
  in den Challenge-Pfad und crashte den gebauten Bundle über den
  family-core ↔ FamilyExerciseView-Chunk-Zyklus (mid-init
  `createFamilyRegistry`). Item-Seeds benutzen dasselbe
  `fnv1a(seed|caseId|difficulty|attempt)`-Byteformat wie `familySubseed`.
- `src/adapters/challenge.ts` — `loadChallengeSet(progress, catalog, nowMs)`
  liest attempts/moduleTouch/lessonOpens/recentModules aus dem Store.
- `context: 'challenge'` additiv am Lernereignis (`familyEventInput` →
  `buildLearningEvent`); Streak zählt nur Challenge-Kontext-Attempts.
- `#/challenge`-Route + `ChallengeView` (lazy chunk, zieht family-core
  nicht) + `ChallengeTeaser` im oberen Grid der Heute-Seite; beide
  unterscheiden die drei Leerzustände (kein Content / kein aktives Modul /
  Fenster erschöpft). `?from=challenge` hält den Übungs-Flow in der Sektion.
- Schwere-Vertrag `E_CHALLENGE_CONTRACT` gehärtet: ≥2 hints, strukturierte
  fullSolution, Typ-Minima (Code ≥2 requiredFunctions oder ≥8 `__check`,
  Fading ≥4 gaps, MC ≥2 distinct correctIds, sonst ≥2 competencyIds) +
  `instantiate`-Smoke-Check für `contract:null`-Docs.
- **24 Cases geflaggt** (`challengeEligible: true`), darunter der neue
  Fading-Challenge-Fall `distribute-double-gap` (a(px+q)+c(mx+n), 6 Lücken,
  zwei Reasoning-Stufen, challenge-only per Gate).
- `docs/challenge-rubric.md` (Autoren-Rubrik) + `docs/challenge-pilot-audit.md`
  (Pool-Audit: 26 FLAG-READY / 5 NEEDS-WORK / 1 ungeeignet).
- `familyHint`-Leiter liefert authored `hints[0..n]` (waren vorher tot ab
  Index 1) — Voraussetzung für „≥2 authored hints" als ehrliches Kriterium.
- Tests: `tests/challenge_picker.test.mjs` (26), `tests/e2e/challenge.spec.ts`
  (6), `tests/procedural_worked_fading_capsules.test.mjs` (5).
- Verifikation: `node --test` 1349/0 · `e2e:build` 55/0 · typecheck ·
  coverage · `validate_content` + `--dir build-next` · Release-Build 847
  Dateien / 33,5 MB.

**Offen / Phase-6-Kandidaten:** `parts[]`-Teilpunkte-Modell (bewusst kein
Pilot-Baustein), No-Repeat-Erschöpfung bei sehr kleinen Pools live
durchspielen, weitere Challenge-Fälle aus NEEDS-WORK-Liste nachziehen.

---

## Stand-Prüfung (12.09.2026, Fassung v3)

Fassung v3 nach Stand-Prüfung mit drei Research-Agents (Content-Substrat,
Backend-Machbarkeit, UI-Integration) gegen den aktuellen Code (post-#78/79/80,
Cleanup-Branch `p2/deferred-cleanup`).

**Was sich seit v2 (09.09.) geändert hat — v2-Fakten korrigiert:**

- Katalog ist gewachsen: 139 Familien, 50 Lektionen, 283 Aktivitäten,
  49 Module (vorher 107/46/253).
- `challengeEligible` ist weiterhin nur Foundation: Schema-Feld,
  Validator-Regel `E_CHALLENGE_CONTRACT`, Bundle-Übernahme und
  `tests/challenge_contract.test.mjs` existieren — aber **kein einziger Case
  trägt das Flag**. Pool ist leer.
- **Korrektur zu v2 Zeile 57:** Attempts tragen `seed` bereits
  (`learning_event.mjs:50`, gesetzt aus `familyEventInput`). Die geplante
  Seed-Migration in IndexedDB **entfällt** — höchstens ein neuer Index
  bräuchte einen Schema-Bump (Store ist schemaless, `progress_store.js:12`).
- **Modul-Auflösung ist einfacher als geplant:** `moduleTouch`-
  Setting `{moduleId: ms}` und `lessonOpens` existieren bereits
  (`local-progress.ts:92-103`); `module.placements[].familyId` bildet
  Familie→Modul direkt ab (inkl. practice-space).
- **32 Cases mit `difficultyProfile: 'challenge'` existieren bereits**
  (25 Familien, davon 26× python-code, 3× single-choice, 2× numeric,
  1× algebraic-expression) plus 23 `difficulty:'challenge'`-Definitionen in
  16 prozeduralen `.mjs`-Specs. Das Flaggen bestehender Cases deckt einen
  Großteil des Pilot-Pools — v2 ging von „alles neu autorisieren" aus.
- Neue Aufgabentypen seit v2: `multiple-choice` (mit `per-correct`-Scoring),
  `diagnostic-rationale`, `worked-example-fading` (Multi-Gap = einziges
  mehrteiliges Antwort-Substrat).
- Entfernt seit v2: `expected.correctChoice` (Wahrheit ist
  `choices[].correct`), Case-Level `tolerancePolicy`, unerreichbare
  `variants[]` in 71 Exemplar-Docs. Verweise in v2 darauf sind hinfällig.
- `difficultyLabelFor('challenge')` → „Herausforderung" existiert bereits in
  `exercise-context.ts:27`.

## Goal

Neue Sektion „Challenge": Täglich 3 bis 5 schwere oder langkettige Probleme,
lokal per Tages-Seed zugeteilt, gefiltert nach angefangenen und
abgeschlossenen Modulen, mit unendlichen Varianten je Problem. Die Sektion
soll Fertigkeiten schärfen: Aufgaben, an denen man lange arbeitet — mehrere
Reasoning-Stufen, echte Zwischenergebnisse — nicht nur „härtere Zahlen".

## Success Criteria

- Route `#/challenge` mit Tages-Set (3 bis 5 Probleme), deterministisch pro
  Kalendertag (UTC, Namespace `challenge/v1`), ohne Account und ohne Netz.
- Nur Module im Pool, die der Nutzer angefangen oder abgeschlossen hat; leere
  Zustände erklärt (unterschieden: „Katalog hat keine Challenges" vs.
  „kein Modul aktiv"), kein stilles Auffüllen mit Wiederholungen.
- Jedes Challenge-Problem hat unendliche geseedete Varianten,
  deterministisches Grading, Hinweise und Musterlösung.
- Keine Wiederholung derselben Problemform innerhalb des effektiven Fensters
  W = min(30, Poolgröße / Tages-Count); W wird in der UI angezeigt.
- **Schwere ist messbar**: `E_CHALLENGE_CONTRACT` erzwingt neben den
  bisherigen Pflichtfeldern mindestens ein Struktur-Minimum pro Typ
  (siehe „Schwere-Vertrag"). Kein Case kommt ins Tages-Set, dessen
  Instanziierung nicht per Smoke-Check verifiziert ist.
- Pilot: Pool aus geflaggten Bestands-Cases plus wenigen neuen
  Mathe-Archetypen; danach Ausbauwellen.
- Validator, Content-Build, Node-Tests, Typecheck, E2E und Release-Build
  grün.

## Constraints And Non-goals

- Lokal-first: Tages-Seed aus UTC-Datum plus Namespace, keine Telemetrie.
  Tageswechsel um Mitternacht UTC, nicht lokale Mitternacht.
- Deterministische Grader bleiben maßgeblich; ein LLM ist nie Grader.
  LLM nur offline als Autor-Beschleuniger mit anschließendem
  deterministischem Verifier.
- Keine wörtlichen Wettbewerbsaufgaben: Stil kalibrieren, Instanzen selbst
  schreiben, `sourceLineage`-Konvention (`abgeleitet von` vs.
  `inspiriert von`).
- Nur Antworttypen mit eindeutiger Maschinenprüfung. Langkettige Aufgaben
  als Kette einzeln prüfbarer Teilantworten (Code-Checks, Fading-Gaps,
  Mehrfach-Funktionen), nicht als Freitextbeweis.
- **Kein neues Scoring-Modell im Pilot:** `correct` bleibt all-or-nothing.
  Teilpunkte/`parts[]`-Composite-Answer ist explizit eine spätere Welle,
  kein Pilot-Baustein (siehe Entscheidung 8).
- Keine sozialen Features (Bestenlisten): nur lokale Streak-Anzeige.
- Mobil: sekundärer Nav-Eintrag; Mobil-Zugang über `mobile-more`-Link
  (App.tsx:313-317). 5er-Balken bleibt unverändert.

## Key Decisions

1. Challenge ist ein Case-Flag, kein neues Content-System. Unverändert.
2. Schwere (`difficultyProfile: challenge`) und Pool-Teilnahme
   (`challengeEligible`) bleiben getrennt; Contract verschärft (s.u.).
3. Tages-Set = reine Funktion aus (Tages-Seed, Pool, Verlauf). Skizzen
   unten; `rng`/`pick`/`shuffle`/`familySubseed` aus
   `generator_draw_kit.mjs` sind die kanonischen Bausteine (FNV-1a +
   mulberry32, byte-gepinnt — nicht neu erfinden).
4. Pool = aktive Module. Aktiv = `moduleTouch`-Eintrag oder Lesson-Open
   oder Attempt auf Familie des Moduls; abgeschlossen = alle
   `lessonIds` in `lessonOpens`. Auflösung über `placements[].familyId`
   (direkt), `competencyIds`-Schnittmenge nur als Fallback.
5. No-Repeat über effektives Fenster W auf Case-Ebene per `definitionId`.
   Seeds rotieren frei. Shortfall → Leerzustand, nie Auffüllung.
6. **Schwerer = strukturell mehr, nicht nur größere Zahlen** — siehe
   Schwere-Vertrag unten. Konvention „lange Arbeit": ≥2 inhaltlich
   getrennte Reasoning-Stufen mit echten Zwischenergebnissen.
7. Versuche zählen im selben Ledger. `definitionId` + `seed` +
   `occurredAt` reichen — Seed-Feld existiert bereits. **Beschlossen
   (12.09., Noa):** optionales `context: 'challenge'` am Event, additiv —
   macht Streak und „heute n/m gelöst" trennbar, ohne Modul-Attempts zu
   verlieren.
8. **Kein Multi-Part-Scoring im Pilot.** Vorhandene Substrate tragen
   „lange" Arbeit schon: Python-Cases mit vielen `__check`s und
   `requiredFunctions` (mehrere Funktionen, ein Verdict), Fading mit
   5–8 Gaps. Ein generisches `parts[]`-Contract mit Teilpunkten ist
   Phase-6-Kandidat, nicht Pilot — es würde Grader-Interface, UI und
   Event-Schema gleichzeitig ändern.
9. **Pool-Smoke-Check im Validator.** Lücke gefunden: bei
   `contract:null`-Docs (prozedurale Familien) wird das JSON-seitige
   `challengeEligible` nicht gegen die JS-Spec-Fälle gegengeprüft — ein
   geflaggter Case kann bei `instantiate` mit „Unbekannter Fall"
   scheitern. Validator führt für geflaggte Cases einen
   `EXERCISE_FAMILIES.instantiate`-Smoke-Test aus (fail-closed).
10. Pilot hybrid: bestehende Challenge-Profil-Cases flaggen wo der
    verschärfte Contract passt + wenige neue Mathe-Archetypen. Nicht mehr
    „16 neue Cases" als Startpunkt — ~55 Challenge-Profil-Cases existieren.

## Schwere-Vertrag (Neu in v3)

`E_CHALLENGE_CONTRACT` prüft heute nur Metadaten. v3 erweitert um
**strukturelle Mindestanforderungen pro Aktivitätstyp** — messbar am
Case-Doc bzw. an einer Probe-Instanz:

| Typ | Struktur-Minimum (Vorschlag, feintunen) |
|---|---|
| `python-code`/`code-tests` | `requiredFunctions ≥ 2` ODER `__check(`-Zählschwelle ≥ 8 in `parameters.tests` |
| `worked-example-fading` | `gaps.length ≥ 4` |
| `multiple-choice` | `correctIds ≥ 2` (existiert) UND `hints ≥ 2` |
| `numeric`/`algebraic-expression`/`vector` | `competencyIds ≥ 2` (Synthese-Charakter) UND `hints ≥ 2` |
| alle | `fullSolution` nicht-leer UND ≥ 2 Absätze/Schrittmarken; `sourceLineage` gesetzt; `masteryEligible: true`; `difficultyProfile: 'challenge'`; `instantiate`-Smoke-Check bestanden |

**Nicht formal prüfbar, bleibt Review-Gate (Zwei-Augen):**
- „Lang" = ≥2 getrennte Reasoning-Stufen mit Zwischenergebnissen, nicht
  Textlänge.
- Hints staffeln Strategie → Zwischenschritt, verraten nicht die Lösung
  (Mastery erlaubt ≤1 Hint — Hint-Design ist bei Challenges kritisch).
- Keine Challenge-Single-Choice, deren Prompt Mehrfachkonzepte behauptet,
  aber nur eine Auswahl graded.
- `estimatedMinutes` am Placement kalibrieren (Challenge-Placements liegen
  bereits bei 40–45 min — realistisch halten).

**Substrat-Befund (Agent 1):** Stärkstes „lange Arbeit"-Substrat sind
Code-Test-Cases (`makeCaseFamily`, `case_family_kit.mjs`): Referenzsolver
15–45 Zeilen, 8–15 Checks, teils `requiredFunctions` mit mehreren
Pflichtfunktionen (`final-boss-authored`: 3 Funktionen, 9 Asserts,
5 Kompetenzen). Fading ist das einzige mathematische Mehrteile-Substrat —
ein Challenge-Profil-Fall fehlt dort noch komplett (max. 5 Gaps bisher).

## Backend: Tages-Engine

`assets/js/domain/challenge_picker.mjs` — rein, alle Inputs injiziert
(Konvention wie `review_scheduler.js`: kein I/O, kein `Date.now()`-Default).

```js
daySeedUTC(dateIso /* injiziert */, namespace = 'challenge/v1')   // FNV-1a uint32
dailyCount(daySeed, poolSize)          // poolSize<3 → poolSize; sonst 3+(seed%3)
effectiveWindow(poolSize, count, maxWindow = 30)
activeModuleIds({ modules, moduleTouchMs, openedLessonIds, attemptFamilyIds })
challengePool(familyIndex, modules, activeIds)
//   → [{familyId, caseId, difficulty:'challenge', moduleIds, competencyIds}]
//   moduleIds über placements[].familyId; competencyIds aus Index-Contract
pickDailyChallenges({ daySeed, pool, history, nowMs })
//   → { items: [{familyId, caseId, difficulty, seed}], count, windowDays, shortfall }
//   history: [{definitionId, seed, occurredAt}]; Exclude im Fenster W;
//   Rang per FNV-1a(daySeed|definitionId); Item-Seed =
//   familySubseed(daySeed, caseId, 'challenge', rank)
```

Adapter `src/adapters/challenge.ts` (Muster `learning-plan.ts:29-75`):
Pool-Inputs aus `loadFamilyIndex()` + `catalog.learningModules`;
Aktivitäts-Inputs aus `progress.getSetting('moduleTouch'|'lessonOpens'|
'recentModules')` + `progress.allOf('attempts')`. Achtung:
`loadProgressSnapshot` exponiert **keine** rohen Attempts — der Adapter
liest den Store direkt oder der Snapshot wird um `activeDays` erweitert
(für Streak).

**Zu schließende Adapter-Lücken:**
- `CompiledIndex.families[].cases` um `challengeEligible?: boolean`
  erweitern (`content-repository.ts:39`) — Feld liegt schon im Bundle.
- `ProgressSnapshot` um Streak-Feld (`activeDays` aus `occurredAt`,
  gefiltert `eventType==='attempt'`) oder direkten Store-Zugriff.
- Migration: **keine** für Seed nötig. Nur falls ein `seed`-Index auf
  `attempts` gewünscht wird: `SCHEMA_VERSION` 3→4 + idempotentes
  `createIndex` (Muster `progress_store.js:15-41`).

## UI: Sektion & Integration

Minimales File-Set (Konventionen verifiziert):

| Datei | Änderung |
|---|---|
| `src/ui/ChallengeView.tsx` | NEU, lazy geladen. Props `{catalog, progress}`; Pool aus `loadFamilyIndex()`; Tages-Set via `pickDailyChallenges`; Karten à la `.activity-card` mit `.card-kicker` (Modul-Label + `difficultyLabelFor`), Buttons → `#/family/{f}/{c}/{seed}/challenge` mit **aus daySeed abgeleitetem Seed** (nicht `-`, sonst ändert sich die Instanz pro Klick); Streak; Fenster-W-Anzeige; zwei Leerzustände |
| `src/ui/App.tsx` | `routeTitles.challenge`, Ternary-Zweig, Nav-Eintrag `{secondary: true}` + Icon (16×16-Stroke-SVG), `mobile-more`-Link, optional Tour-Step |
| `src/ui/TodayView.tsx` | `ChallengeTeaser` als **Quadrant im oberen Grid** (`.today-grid`, Muster `MilestoneCard`) — beschlossen 12.09.; nur rendern wenn Pool > 0; zeigt Tages-Fortschritt „n/m gelöst" und Streak |
| `src/adapters/local-progress.ts` | `ProgressSnapshot` um `activeDays`/Streak erweitern |
| `src/adapters/content-repository.ts` | Typ-Erweiterung `challengeEligible` |
| `src/styles/next.css` | `.challenge-*`-Klassen bzw. Shared-Selector-Liste (Zeile 153) |
| `tests/challenge_picker.test.mjs`, `tests/e2e/challenge.spec.ts` | NEU (Vorbilder `exercise-family.spec.ts`, `today-resume.spec.ts`) |

**Fallstricke (verifiziert):**
- **Lazy-Chunk:** `ChallengeView` darf `exercise_registry.mjs`/
  `family_registry.mjs` **nicht** importieren — das ganze
  Familien-Subsystem hängt hinter dem lazy `FamilyExerciseView`
  (vite.config.ts:27-60). Pool nur aus `loadFamilyIndex()` bauen; die
  View selbst lazy.
- **Rückkehr-Kontext (beschlossen 12.09., Noa):** Man bleibt im
  Challenge-Fenster — `?from=challenge` am Attempt-Link, Back-Button
  führt zu `#/challenge`, und nach Abschluss zeigt der Result-State
  eine „Nächste Challenge"-CTA auf das nächste Tages-Item.
- **Leerer Pool bis Pilot-Content:** Nav-Eintrag und Teaser hinter
  „Pool > 0" konditionieren oder Leerzustand „Challenges kommen mit dem
  nächsten Kapitel" — sonst tote Route im Release.
- **Streak ohne Mobil:** Streak-Logik muss aus Attempts ableitbar sein,
  nicht aus „Challenge-View besucht" — Konsistenz ohne Mobil-Zugang.

## Work Plan (aktualisiert)

### Phase 0: Research-Spike — erledigt (09.09.2026)

Ressourcen/Lizenzen unten. Rubrik-Abnahme steht noch aus (3 exemplarische
Case-Spezifikationen in `docs/`).

### Phase 1: Vertrag & Validator (1–2 Tage)

- `E_CHALLENGE_CONTRACT` um Struktur-Minima pro Typ erweitern (Tabelle
  oben), `instantiate`-Smoke-Check für geflaggte Cases (deckt die
  `contract:null`-Lücke), `CompiledIndex`-Typ, Coverage-Check.
- Rubrik `docs/challenge-rubric.md` mit 3 Case-Spezifikationen →
  Noa-Abnahme.
- Validierung: `validate_content`, `compile_content`, `node --test`.

### Phase 2: Tages-Engine (2–3 Tage, vereinfacht)

- `challenge_picker.mjs` + `src/adapters/challenge.ts` nach Vertrag oben.
- `ProgressSnapshot.activeDays` für Streak; optionales `context`-Feld
  am Event (Entscheidung 7).
- Tests: Determinismus, Count-Regel, Verteilung, No-Repeat in W,
  Grenzfälle (leerer Pool, Shortfall).
- **Entfällt gegenüber v2:** IndexedDB-Seed-Migration.

### Phase 3: UI (3–4 Tage)

- File-Set oben; E2E: Tages-Determinismus via Playwright-Clock,
  No-Repeat, Modulfilter, Fenster-W-Anzeige, beide Leerzustände,
  Mobil (mobile-more), Screenshots.
- `from=`-Entscheidung umsetzen.

### Phase 4: Pilot-Content (kürzer als v2)

- Audit der ~55 Challenge-Profil-Cases gegen den verschärften Contract;
  passende flaggen (Script: Liste erzeugen, Review je Familie).
- Lücken mit Mathe-Archetypen schließen (Ungleichungen mit Parametern,
  Zählprobleme mit n, Linalg mit Dimensionen, Analysis mit
  Funktionenfamilien, Fading-Challenge-Fall mit 5–8 Gaps) — Ziel:
  ≥2 aktivierbare Kernmodule, ehrliches Fenster.
- Review-Gate unverändert (Zwei-Augen, Hand-Lösung an 2 Seeds,
  Solver-Gegenprobe ≥200 Seeds, Regressions-Seeds).

### Phase 5: Release und Wellen (laufend)

- `build:release`, Leak-Test, `test:e2e:build`.
- Ausbau pro Track; Coding-Challenges erst nach Pilot (Phasentor).
- Kandidat Phase 6: `parts[]`-Composite-Answer mit Teilpunkten —
  nur wenn Pilot zeigt, dass all-or-nothing bei langen Ketten frustriert.

## Bedarfsrechnung (aktualisiert)

Cmin = F × N bleibt. Neu: der Pool startet nicht bei 0 — ~55
Challenge-Profil-Cases existieren (32 JSON + 23 prozedural), verteilt
über ~30 Familien/Module. Flaggen ohne Neubau bringt den Pilot-Pool
deutlich über die 16 von v2.

| Aktive Module | Pool (8 flagged/Modul) | Tage frisch bei 4/Tag | W |
|---|---|---|---|
| 2 | 16 | 4 | 4 |
| 4 | 32 | 8 | 8 |
| 8 | 64 | 16 | 16 |
| 49 | ~400 | ~100 | 30 |

Realistischer Pilot: 2–4 aktive Module → W=4–8 ehrliche Tage. Für W=30
bei 2 Modulen weiterhin 45–75 Cases/Modul nötig — Wellenplan bleibt.

## Ressourcen: frei nutzbare Aufgabenpools

Hausregel: keine wörtlichen Übernahmen, eigene deutsche Formulierungen,
Content CC BY 4.0. Stand September 2026, Lizenzen mit Beleg geprüft.

- MATH: 12.500 englische Wettbewerbsaufgaben, Stufen 1–5, MIT,
  https://github.com/hendrycks/math — Stufen 4–5 = Kalibrierung.
- GSM8K: 8.500 Textaufgaben, MIT — zu leicht, Stilvorbild.
- SVAMP: 1.000 Variationen, MIT — Variationsprinzip = Generatorprinzip.
- MathQA: 37.200 MC mit Operationsprogrammen, Apache-2.0 —
  Programm ≈ Referenzsolver.
- miniF2F: 488 Olympiade-Probleme formal + informell, MIT/Apache —
  oberste Stufe.
- Orca-Math: ~200k Textaufgaben, MIT — Volumen, zu leicht.
- MetaMathQA: 395k, MIT — Augmentations-Methodenvorbild.
- OpenMathInstruct-2: 14M Paare, CC-BY-4.0 — Ideensteinbruch (nur v2!).
- DeepMind Mathematics: Generator-Code + 2M Paare, Apache-2.0 —
  Architekturvorbild geseedete Varianten.
- Lila: 100k+ Aufgaben mit Programm+Lösungsweg, CC-BY-4.0 —
  Formatvorbild Case-Vertrag.
- Project Euler: CC BY-NC-SA — **nicht** CC-BY-kompatibel, nur
  Stilvorbild; bester Referenzstil für spätere Coding-Challenges.

Ausgeschlossen: ASDiv (CC BY-NC), NumGLUE (ODC-By). Wettbewerbe ohne
offene Lizenz (Mathematik-Olympiade, Bundeswettbewerb, Känguru, IMO,
AMC/AIME, AoPS): nie Materialbasis, nur Niveau/Stil — Details siehe
Fassung v2 / Git-Historie.

## Validation Plan

- Pro Phase die genannten Kommandos; immer `npm run typecheck`.
- E2E: Tages-Determinismus (Playwright-Clock zwei Daten), No-Repeat über
  gemockte Historie, Modulfilter, Fenster-W, Leerzustände, Mobil-Link.
- Manuell: Tageswechsel um Mitternacht UTC, Streak.
- Höchstrisiko: Solver-Gegenprobe bei geflaggten/neuen Cases über
  ≥200 Seeds — falsche Erwartungswerte blockieren echte Nutzer.

## Risks / Rollback

- Contract zu scharf → Pilot-Pool kollabiert: Minima sind Vorschläge,
  an Audit-Ergebnis aus Phase 4 anpassen; Flag pro Case zurücknehmbar
  (`releaseStatus`).
- Falsche Grader-Erwartung: Kreuzprobe + Regressions-Seeds; Rollback per
  Case-Entflaggung.
- Pool zu klein: expliziter Leerzustand, keine Auffüllung.
- Lazy-Chunk-Regression: Bundle-Größe im Release-Check beobachten;
  `ChallengeView` muss lazy bleiben.
- Scope-Kriech Richtung `parts[]`/Coding: Phasentore.

## Open Questions (v3)

1. ~~`context: 'challenge'` am Event~~ — **beschlossen: ja, additiv.**
2. ~~`from=`-Rückkehr~~ — **beschlossen: ja, inkl. „Nächste
   Challenge"-CTA nach Abschluss; man bleibt im Challenge-Fenster.**
3. Schwere-Minima final: Werte in der Tabelle sind Vorschläge — nach
   dem Phase-4-Audit der Bestands-Cases festziehen.
4. Fading-Challenge-Fall (5–8 Gaps): **beschlossen: Profil-Prädikat im
   Generator** (`difficulty === 'challenge'` zieht mehr Gaps auf
   derselben caseId — analog intro/core/stretch), keine neue
   Case-Definition. Betrifft beide Fading-Familien.
5. ~~Attempt-Status „heute n/m gelöst"~~ — **beschlossen: ja**, im
   Teaser und im Challenge-Header; Ableitung über `context`-Tag +
   definitionId-Abgleich gegen das Tages-Set.

## Handoff

Foundation liegt (Schema, Validator-Basis, Test). Plan v3 ist gegen
Code-Stand post-#80 verifiziert. Reihenfolge: Phase 1 (Vertrag+Rubrik,
Abnahme durch Noa) → Phase 2 (Engine) → Phase 3 (UI) → Phase 4
(Pilot-Flagging + Lücken) → Phase 5 (Release). Bei Abweichung vom Plan:
erst fragen. Commits nur auf Anweisung.

## Sources

- https://github.com/hendrycks/math (MIT)
- https://github.com/openai/grade-school-math (MIT)
- https://github.com/arkilpatel/SVAMP (MIT)
- https://github.com/math-qa/math-QA (Apache-2.0)
- https://github.com/openai/miniF2F (MIT/Apache)
- https://huggingface.co/datasets/microsoft/orca-math-word-problems-200k (MIT)
- https://huggingface.co/datasets/meta-math/MetaMathQA (MIT)
- https://huggingface.co/datasets/nvidia/OpenMathInstruct-2 (CC-BY-4.0)
- https://github.com/google-deepmind/mathematics_dataset (Apache-2.0)
- https://github.com/allenai/Lila (CC-BY-4.0)
- https://projecteuler.net/copyright (CC BY-NC-SA)
