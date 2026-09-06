# S4E2: Entfernen des Wochenmodells

## Umfang

S4E2 entfernt die authored Wochenprojektion aus Content, Runtime und Tooling.
Familien, LearningModules, deterministische Grader, historische IDs und der
IndexedDB-`weeks`-Store bleiben erhalten. Historische Reviews werden weiterhin
als archiviert angezeigt; der Planer übernimmt sie nicht in den aktiven Plan.

Gelöschte Content- und Schema-Pfade:

- `content/exercises/w01.json` bis `w39.json`
- `content/curriculum.json`
- `content/coverage-matrix.json`
- `content/legacy/`
- `content/exercise-definitions/`
- `content/search-index.json`
- `schemas/exercise-definition.schema.json`
- `docs/coverage-report.md`

Gelöschte Runtime- und Tool-Dateien:

- `assets/js/core/legacy_exercise_adapter.mjs`
- `assets/js/core/content_repository.js`
- `assets/js/core/seed_generator_registry.mjs`
- `assets/js/domain/fresh_seed.mjs`
- `assets/js/domain/review_route.mjs`
- `assets/js/domain/tutor_engine.mjs`
- `src/adapters/exercise-session.ts`
- `src/ui/ExerciseView.tsx`
- `src/ui/LabView.tsx`
- `tools/migrate_legacy_content.mjs`
- `tools/build_search_index.mjs`

## Assertions and fixtures

Wochenabhängige Suiten wurden entfernt, wenn sie ausschließlich die gelöschte
Projektion prüften. Familien-, Solver-, Grader-, Ledger- und
IndexedDB-Verträge blieben in den bestehenden Suiten erhalten oder wurden auf
die kanonischen Familienobjekte umgestellt. `tests/fixtures/legacy-oracle.json`
bleibt als eingefrorene Vergleichsquelle für historische Seed-Äquivalenz
erhalten; sie enthält nur die gelesenen Felder und trägt den Hinweis, dass die
Quelle bei `7fd26b8` eingefroren wurde.

Die ursprünglichen Golden-Corpus-Digests der Familien bleiben unverändert.
Das Open-Core-Erzeugnis prüft nun eine vorhandene, familienbasierte Suite und
die `familyActivities`-Anzahl statt gelöschter Generator-Tests und
`exerciseDefinitions`.

## LOC

Gezählt mit `wc -l`-äquivalenter Zeilenzählung:

| Bereich | Vorher | Nachher |
|---|---:|---:|
| `assets/js` + `src` (JS/MJS/TS/TSX) | 13,199 | 12,180 |
| `tools` (JS/MJS/TS/TSX) | 3,432 | 2,143 |
| `tests` (JS/MJS/TS/TSX/JSON) | 22,861 | 13,274 |
| `content` (JSON) | 68,455 | 25,158 |

Die gelöschten Wochenquellen umfassen 39 Dateien und 14,873 Zeilen; die 27
gelöschten authored Definitionen umfassen 1,357 Zeilen. Die übrigen gelöschten
Legacy-Dateien sind im Pfadverzeichnis oben aufgeführt.

## Build

Der Compiler erzeugt die kanonische Abdeckung pro Kompetenz:

```js
{ competencyId, familyIds, placedCaseCount, seededFamilyCount }
```

Der Public-Build bleibt fail-closed und entfernt private Quellen sowie lokale
Pfade. Der abschließende Release-Build erzeugte 614 Dateien bei 28,6 MB. Das
JavaScript-Bundle beträgt 96,1 KiB gzip, das CSS-Bundle 6,3 KiB gzip. Der
Public-Content-Build erzeugte 432 Dateien bei 26,4 MB.

`node --test tests/` endete mit 307 Tests: 306 bestanden, 1 übersprungen
(SymPy-Hostvoraussetzung). Die Content-Validierung meldete die etablierte
Baseline mit 14 Library-/Local-Path-Fehlern und 2 Hinweisen; Public- und
Release-Build validierten erfolgreich. Die Chromium-E2E-Suite wurde nach
Neustart des Servers ausgeführt: die einzige verbleibende Abweichung ist die
bekannte `59 Min.`-Erwartung in `tests/e2e/learning-module.spec.ts`; die
entfernten Routen, modernen Familienrouten, Reviews und mobilen Katalogpfade
wurden angepasst und bestanden.

Die Golden-Corpus-Prüfungen für Choice-, Construct-, Linalg-, Trace- und
weitere Familien bestanden byte-identisch über die geprüften Seeds.

## Verbleibende historische Reste

- Der IndexedDB-Store `weeks` bleibt für Import- und Migrationskompatibilität.
- Historische `wNN-eN`-IDs bleiben in Versuchen und Reviews gültig; fehlende
  aktive Definitionen werden archiviert bzw. aus der Planung gefiltert.
- `tests/fixtures/legacy-oracle.json` bleibt als Test-Orakel erhalten.
- Einige historische Generator-/Case-Namen in Familien, Tests und
  Dokumentationsarchiven dienen der Golden-Corpus- und Migrationskompatibilität.
- `progress_store.js` behält Legacy-Datenformen und alte Zeitstempelregeln,
  entfernt aber nur die `weekId`-Validierung aus dem `weeks`-Import.

Offene Folgearbeiten liegen in S5A/S5B: weitere historische Dokumentations- und
Quellenarchive können separat bereinigt werden; diese Löschung ersetzt keine
historischen Evidenzdaten.
